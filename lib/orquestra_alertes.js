// Tonico — integració del motor de regles amb la BD. Després de cada pujada:
// munta el context, executa les regles actives i concilia les alertes (les que
// ja no apliquen es resolen soles; les noves entren; les ignorades es respecten).
import { executaRegles } from './regles.js';
import { situacioMercat } from './mercat.js';
import { comparaPersonal } from './personal.js';
import { carregaConfigPla } from './config_pla.js';
import { filtresCompra } from './mercat_cerca.js';
import { economia } from './economia.js';
import { configHashComplet } from './config_hash.js';

const converteix = (v, t) => (t === 'int' ? parseInt(v, 10) : t === 'float' ? parseFloat(v) : t === 'bool' ? v === 'true' : v);

export async function generaAlertes(db, usuariId) {
  const anyDies = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='any_dies'").first())?.valor || '112', 10);
  const tempSetmanes = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);

  const equipSenior = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const equipJuvenil = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(usuariId).first();
  if (!equipSenior) return { alertes: 0 };

  const instSenior = await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equipSenior.id).first();
  if (!instSenior) return { alertes: 0 };

  const { results: jugadors } = await db.prepare(
    `SELECT ij.jugador_id, j.nom, ij.posicio_ultim_partit AS posicio, ij.edat_anys, ij.edat_dies,
            ij.porteria, ij.sou, ij.tsi, ij.data_ultim_partit, ij.transferible, c.categoria
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
  const pla = await db.prepare('SELECT id, plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  const refTemporada = instSenior.temporada != null
    ? instSenior.temporada + (instSenior.setmana_temporada >= tempSetmanes ? 1 : 0) : null;
  let mercat = null;
  let contextPla = null;
  if (pla) {
    const { results: cal } = await db.prepare('SELECT setmana_temporada, fase, modificador_valor FROM calendari_mercat').all();
    const espera = await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='mercat_espera_max'").bind(pla.plantilla).first();
    if (cal.length && instSenior.setmana_temporada != null) {
      mercat = situacioMercat(cal, instSenior.setmana_temporada, tempSetmanes, parseInt(espera?.valor || '4', 10));
    }
    const params = pla.parametres ? JSON.parse(pla.parametres) : {};
    const { results: forn } = await db.prepare('SELECT lletra, temporada_eixida_prevista FROM fornades WHERE usuari_id=?').bind(usuariId).all();
    contextPla = {
      temporadaActual: refTemporada,
      temporadaInflexio: params.temporada_inflexio ?? null,
      fornades: forn.map((f) => ({ lletra: f.lletra, temporada_eixida: f.temporada_eixida_prevista })),
    };
  }

  // Moviments pendents d'apuntar: jugadors que han eixit sense transacció de venda.
  const { results: pendents } = await db.prepare(
    `SELECT j.id AS jugador_id, j.nom FROM jugadors j JOIN equips e ON e.id=j.equip_id
      WHERE e.usuari_id=? AND (j.estat='pendent_de_motiu' OR (j.estat='baixa' AND j.motiu_baixa='venda'))
        AND NOT EXISTS (SELECT 1 FROM transaccions t WHERE t.jugador_id=j.id AND t.tipus='venda')`
  ).bind(usuariId).all();

  // Context de personal (desquadre amb la fase actual del pla)
  let contextPersonal = null;
  if (pla) {
    const cfg = await db.prepare('SELECT config FROM fases_config WHERE plantilla=? AND fase=?').bind(pla.plantilla, pla.fase_actual).first();
    if (cfg) {
      const { results: dec } = await db.prepare('SELECT clau, valor FROM personal_declarat WHERE usuari_id=?').bind(usuariId).all();
      const declarat = Object.fromEntries(dec.map((d) => [d.clau, d.valor]));
      contextPersonal = { desquadres: comparaPersonal(JSON.parse(cfg.config).personal, declarat) };
    }
  }

  // Context de compra (buits d'entrenable amb filtre i pressupost)
  let contextCompra = null;
  if (pla) {
    const config = await carregaConfigPla(db, pla.plantilla);
    const par = async (clau, def) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor ?? def;
    const compra = {
      edat_max: parseInt(await par('compra_edat_max', '18'), 10),
      creativitat_min: parseInt(await par('compra_creativitat_min', '6'), 10),
      posicions: JSON.parse(await par('compra_posicions', '["MC"]')),
    };
    const { caixa } = await economia(db, usuariId);
    contextCompra = { filtres: filtresCompra(config, jugadors, caixa, compra), caixa, reserva: parseInt(await par('reserva_operativa', '0'), 10) };
  }

  const ctx = { jugadors, juvenils, dataInstantania: instSenior.data, any_dies: anyDies, mercat, pla: contextPla, pendents_transaccio: pendents, personal: contextPersonal, compra: contextCompra };
  const noves = executaRegles(ctx, actives);
  const configHash = await configHashComplet(db, pla?.plantilla || '');
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
  const pla = await db.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  const configHash = await configHashComplet(db, pla?.plantilla || '');

  const revisat = rev != null && rev.instantania_id === inst.id && rev.config_hash === configHash;
  return { revisat, instantania: inst };
}
