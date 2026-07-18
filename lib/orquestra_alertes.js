// Tonico — integració del motor de regles amb la BD. Després de cada pujada:
// munta el context, executa les regles actives i concilia les alertes (les que
// ja no apliquen es resolen soles; les noves entren; les ignorades es respecten).
import { executaRegles } from './regles.js';

const converteix = (v, t) => (t === 'int' ? parseInt(v, 10) : t === 'float' ? parseFloat(v) : t === 'bool' ? v === 'true' : v);

export async function generaAlertes(db, usuariId) {
  const anyDies = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='any_dies'").first())?.valor || '112', 10);

  const equipSenior = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const equipJuvenil = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(usuariId).first();
  if (!equipSenior) return { alertes: 0 };

  const instSenior = await db.prepare('SELECT id, data FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equipSenior.id).first();
  if (!instSenior) return { alertes: 0 };

  const { results: jugadors } = await db.prepare(
    `SELECT ij.jugador_id, j.nom, ij.posicio_ultim_partit AS posicio, ij.edat_anys, ij.edat_dies,
            ij.porteria, ij.sou, ij.tsi, ij.data_ultim_partit, c.categoria
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id=ij.jugador_id
       LEFT JOIN (SELECT cj.jugador_id, cj.categoria FROM categories_jugador cj
                   JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON cj.id=m.mid) c
              ON c.jugador_id = j.id
      WHERE ij.instantania_id = ?`
  ).bind(instSenior.id).all();

  let juvenils = [];
  if (equipJuvenil) {
    const instJuv = await db.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equipJuvenil.id).first();
    if (instJuv) {
      juvenils = (await db.prepare(
        'SELECT ij.jugador_id, j.nom, ij.dies_restants_promocio FROM instantanies_juvenils ij JOIN jugadors j ON j.id=ij.jugador_id WHERE ij.instantania_id=?'
      ).bind(instJuv.id).all()).results;
    }
  }

  // Regles actives + paràmetres
  const { results: regles } = await db.prepare("SELECT id, codi FROM regles WHERE activa=1").all();
  const codiToId = new Map(regles.map((r) => [r.codi, r.id]));
  const { results: pars } = await db.prepare('SELECT regla_id, clau, valor, tipus FROM regles_parametres').all();
  const paramsPerRegla = new Map();
  for (const p of pars) {
    if (!paramsPerRegla.has(p.regla_id)) paramsPerRegla.set(p.regla_id, {});
    paramsPerRegla.get(p.regla_id)[p.clau] = converteix(p.valor, p.tipus);
  }
  const actives = regles.map((r) => ({ codi: r.codi, params: paramsPerRegla.get(r.id) || {} }));

  const ctx = { jugadors, juvenils, dataInstantania: instSenior.data, any_dies: anyDies };
  const noves = executaRegles(ctx, actives);
  const clau = (regla_codi, jugador_id) => `${regla_codi}|${jugador_id ?? ''}`;
  const novesPerClau = new Map(noves.map((a) => [clau(a.regla_codi, a.jugador_id), a]));

  // Alertes existents encara vives
  const { results: existents } = await db.prepare(
    "SELECT a.id, r.codi, a.jugador_id, a.estat FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE a.usuari_id=? AND a.estat IN ('nova','vista','ignorada')"
  ).bind(usuariId).all();
  const existentPerClau = new Map(existents.map((e) => [clau(e.codi, e.jugador_id), e]));

  const lots = [];
  // Resol les que ja no apliquen (nova/vista); les ignorades es queden ignorades
  for (const e of existents) {
    if (e.estat !== 'ignorada' && !novesPerClau.has(clau(e.codi, e.jugador_id))) {
      lots.push(db.prepare("UPDATE alertes SET estat='resolta' WHERE id=?").bind(e.id));
    }
  }
  // Inserta les noves de veritat (no existents i no ignorades)
  let n = 0;
  for (const a of noves) {
    const prev = existentPerClau.get(clau(a.regla_codi, a.jugador_id));
    if (prev) continue;                            // ja hi és (nova/vista) o ignorada → respecta
    lots.push(db.prepare(
      `INSERT INTO alertes (usuari_id, regla_id, jugador_id, data, missatge_clau, parametres, estat, urgencia)
       VALUES (?, ?, ?, ?, ?, ?, 'nova', ?)`
    ).bind(usuariId, codiToId.get(a.regla_codi), a.jugador_id, instSenior.data, a.missatge_clau, JSON.stringify(a.parametres), a.urgencia ?? 0));
    n++;
  }
  if (lots.length) await db.batch(lots);
  return { alertes: n };
}
