// Tonico — integració del motor de regles amb la BD. Després de cada pujada:
// munta el context, executa les regles actives i concilia les alertes (les que
// ja no apliquen es resolen soles; les noves entren; les ignorades es respecten).
import { executaRegles } from './regles.js';
import { situacioMercat } from './mercat.js';

const converteix = (v, t) => (t === 'int' ? parseInt(v, 10) : t === 'float' ? parseFloat(v) : t === 'bool' ? v === 'true' : v);
// Hash estable de la config (regles+paràmetres) per saber si cal re-revisar.
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return String(h); };

export async function generaAlertes(db, usuariId) {
  const anyDies = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='any_dies'").first())?.valor || '112', 10);
  const tempSetmanes = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);

  const equipSenior = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const equipJuvenil = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(usuariId).first();
  if (!equipSenior) return { alertes: 0 };

  const instSenior = await db.prepare('SELECT id, data, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equipSenior.id).first();
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

  // Context de mercat (dos rellotges). Poms de la plantilla de l'usuari.
  const pla = await db.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  let mercat = null;
  if (pla) {
    const { results: cal } = await db.prepare('SELECT setmana_temporada, fase, modificador_valor FROM calendari_mercat').all();
    const espera = await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='mercat_espera_max'").bind(pla.plantilla).first();
    if (cal.length && instSenior.setmana_temporada != null) {
      mercat = situacioMercat(cal, instSenior.setmana_temporada, tempSetmanes, parseInt(espera?.valor || '4', 10));
    }
  }

  const ctx = { jugadors, juvenils, dataInstantania: instSenior.data, any_dies: anyDies, mercat };
  const noves = executaRegles(ctx, actives);
  const configHash = hash(JSON.stringify(actives));
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
  // Registra la revisió: instantània i config contra les quals s'ha passat revista.
  lots.push(db.prepare(
    `INSERT INTO revisions_alertes (usuari_id, instantania_id, config_hash, data) VALUES (?, ?, ?, ?)
     ON CONFLICT(usuari_id) DO UPDATE SET instantania_id=excluded.instantania_id, config_hash=excluded.config_hash, data=excluded.data`
  ).bind(usuariId, instSenior.id, configHash, instSenior.data));
  await db.batch(lots);
  return { alertes: n, instantania_id: instSenior.id, config_hash: configHash };
}

// Diu si el parte està al dia: hi ha revisió per a la instantània sènior més
// recent amb el hash de config vigent.
export async function estatRevisio(db, usuariId) {
  const eq = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  if (!eq) return { revisat: false, instantania: null };
  const inst = await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(eq.id).first();
  if (!inst) return { revisat: false, instantania: null };
  const rev = await db.prepare('SELECT instantania_id, config_hash FROM revisions_alertes WHERE usuari_id=?').bind(usuariId).first();

  const { results: regles } = await db.prepare('SELECT id, codi FROM regles WHERE activa=1').all();
  const { results: pars } = await db.prepare('SELECT regla_id, clau, valor, tipus FROM regles_parametres').all();
  const perRegla = new Map();
  for (const p of pars) { if (!perRegla.has(p.regla_id)) perRegla.set(p.regla_id, {}); perRegla.get(p.regla_id)[p.clau] = converteix(p.valor, p.tipus); }
  const actives = regles.map((r) => ({ codi: r.codi, params: perRegla.get(r.id) || {} }));
  const configHash = hash(JSON.stringify(actives));

  const revisat = rev != null && rev.instantania_id === inst.id && rev.config_hash === configHash;
  return { revisat, instantania: inst };
}
