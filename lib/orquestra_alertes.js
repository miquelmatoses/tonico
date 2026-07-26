// Tonico — integració del motor de regles amb la BD. Després de cada pujada:
// munta el context, executa les regles actives i concilia les alertes (les que
// ja no apliquen es resolen soles; les noves entren; les ignorades es respecten).
import { executaRegles } from './regles.js';
import { temporadaOperativa } from './calendari.js';
import { situacioMercat } from './mercat.js';
import { comparaPersonal } from './personal.js';
import { carregaConfigPla } from './config_pla.js';
import { filtresCompra } from './mercat_cerca.js';
import { economia } from './economia.js';
import { configHashComplet } from './config_hash.js';
import { entrenamentPrescrit as prescripcio, desquadreEntrenament } from './entrenament_places.js';
import { avaluaPipeline } from './fotrem.js';
import { revelacions } from './juvenil.js';
import { estatCrida } from './crida.js';
import { cobertura } from './cobertura.js';
import { entrenamentEfectiu, aplicaEntrenament } from './entrenament_places.js';
import { avaluaPuntuacio } from './classificador.js';
import { sqlCategoriaVigent } from './categoria_vigent.js';

const converteix = (v, t) => (t === 'int' ? parseInt(v, 10) : t === 'float' ? parseFloat(v) : t === 'bool' ? v === 'true' : v);

const ENTRENEN = new Set(['core', 'rotatiu']);   // qui entrena, en el v3

export async function generaAlertes(db, usuariId) {
  const anyDies = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='any_dies'").first())?.valor || '112', 10);
  const tempSetmanes = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);
  // Font ÚNICA del concepte «porter notable» (guia §2/§17): la referencien totes les
  // regles que el necessiten (Junta, rellotge de depreciació), cap el redefinix.
  const porterNotableMin = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='porter_notable_min'").first())?.valor || '7', 10);

  const equipSenior = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const equipJuvenil = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(usuariId).first();
  if (!equipSenior) return { alertes: 0 };

  const instSenior = await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equipSenior.id).first();
  if (!instSenior) return { alertes: 0 };

  const { results: jugadors } = await db.prepare(
    `SELECT ij.jugador_id, j.nom, ij.posicio_ultim_partit AS posicio, ij.edat_anys, ij.edat_dies,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada,
            ij.lleialtat, ij.qualificacio_ultim_partit, j.especialitat,
            ij.sou, ij.tsi, ij.forma, ij.data_ultim_partit, ij.transferible, ij.setmanes_club,
            ij.bonificacio_origen, ij.lesio, c.categoria, c.puntuacio
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id=ij.jugador_id
       LEFT JOIN ${sqlCategoriaVigent(['categoria', 'puntuacio'])} c
              ON c.jugador_id = j.id
      WHERE ij.instantania_id = ?`
  ).bind(instSenior.id).all();

  let juvenilsRaw = [], revelacionsJuv = [];
  if (equipJuvenil) {
    const { results: instsJuv } = await db.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 2').bind(equipJuvenil.id).all();
    const filesDe = (id) => db.prepare(
      `SELECT ij.*, j.nom, j.especialitat, je.estat FROM instantanies_juvenils ij
         JOIN jugadors j ON j.id=ij.jugador_id
         LEFT JOIN juvenils_estat je ON je.jugador_id=j.id
        WHERE ij.instantania_id=?`
    ).bind(id).all();
    if (instsJuv.length) {
      juvenilsRaw = (await filesDe(instsJuv[0].id)).results;
      if (instsJuv.length > 1) revelacionsJuv = revelacions((await filesDe(instsJuv[1].id)).results, juvenilsRaw);   // 2c: fets nous
    }
  }

  // Regles actives + paràmetres. Punt 3c: SENSE acadèmia, res del mòdul 'juvenil'
  // (cap alerta ni menció juvenil per a qui no en té).
  const teAcademia = !!equipJuvenil;
  const { results: reglesTotes } = await db.prepare("SELECT id, codi, modul FROM regles WHERE activa=1").all();
  const regles = reglesTotes.filter((r) => teAcademia || r.modul !== 'juvenil');
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
  const refTemporada = temporadaOperativa(instSenior.temporada, instSenior.setmana_temporada, tempSetmanes).temporada;
  let mercat = null;
  let contextPla = null;
  if (pla) {
    const { results: cal } = await db.prepare('SELECT setmana_temporada, fase, modificador_valor FROM calendari_mercat').all();
    const espera = await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='mercat_espera_max'").bind(pla.plantilla).first();
    if (cal.length && instSenior.setmana_temporada != null) {
      mercat = situacioMercat(cal, instSenior.setmana_temporada, tempSetmanes, parseInt(espera?.valor || '4', 10));
    }
    const params = pla.parametres ? JSON.parse(pla.parametres) : {};
    contextPla = {
      temporadaActual: refTemporada,
      temporada_raw: instSenior.temporada,          // crua (per a la finestra de compra, alineada amb la setmana de mercat)
      temporadaInflexio: params.temporada_inflexio ?? null,
    };
  }

  // Moviments pendents d'apuntar: jugadors que han eixit sense transacció de venda.
  const { results: pendents } = await db.prepare(
    `SELECT j.id AS jugador_id, j.nom FROM jugadors j JOIN equips e ON e.id=j.equip_id
      WHERE e.usuari_id=? AND (j.estat='pendent_de_motiu' OR (j.estat='baixa' AND j.motiu_baixa='venda'))
        AND NOT EXISTS (SELECT 1 FROM transaccions t WHERE t.jugador_id=j.id AND t.tipus='venda')`
  ).bind(usuariId).all();

  // Economia completa (una volta): caixa real, balanç i projecció de trajectòria.
  const eco = pla ? await economia(db, usuariId) : null;

  // Mecànica del llistat (el tercer dia): subhasta = llistat + dies_subhasta.
  const diesSubhasta = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='dies_subhasta'").first())?.valor || '3', 10);
  // Inici de la setmana de mercat vigent (vora de setmana, NO hui): base per a
  // datar la recuperació. La finestra es mou per setmanes des de l'àncora.
  const ancData = (await db.prepare("SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data'").first())?.valor;
  const ancTemp = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='calendari_ancora_temporada'").first())?.valor || '0', 10);
  let setmanaIniciData = null;
  if (ancData && instSenior.temporada != null && instSenior.setmana_temporada != null) {
    const dies = (instSenior.temporada - ancTemp) * anyDies + (instSenior.setmana_temporada - 1) * 7;
    setmanaIniciData = new Date(Date.parse(ancData) + dies * 86400000).toISOString().slice(0, 10);
  }
  const { results: vendesLlistades } = await db.prepare(
    `SELECT j.id AS jugador_id, j.nom, v.data_llistada FROM vendes v
       JOIN jugadors j ON j.id=v.jugador_id JOIN equips e ON e.id=j.equip_id
      WHERE e.usuari_id=? AND v.estat='llistat' AND v.data_llistada IS NOT NULL`
  ).bind(usuariId).all();

  // Entrenament: PRESCRIT pel contracte (PAS 1) vs confirmat per l'usuari a HT.
  const planParams = pla?.parametres ? JSON.parse(pla.parametres) : {};
  const entrenamentPrescrit = pla ? await prescripcio(db, pla.plantilla) : null;
  const entrenamentConfirmat = planParams.entrenament_confirmat ?? null;
  const entrenamentJuvenil = planParams.entrenament_juvenil ?? null;

  // Juvenils enriquits amb l'avaluació de pipeline (F) i l'especialitat (G).
  const juvenils = juvenilsRaw.map((f) => ({
    jugador_id: f.jugador_id, nom: f.nom, dies_restants_promocio: f.dies_restants_promocio,
    especialitat: f.especialitat ?? null, estat: f.estat || 'seguiment',
    pipeline: avaluaPipeline(f, entrenamentPrescrit && { principal: entrenamentPrescrit.skill, secundari: entrenamentPrescrit.skill_b }),
  }));
  const juvenilObjectiu = pla ? (parseInt((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='juvenil_objectiu'").bind(pla.plantilla).first())?.valor || '', 10) || null) : null;
  // Rellotge de crida (només si hi ha acadèmia): disponibilitat derivada del calendari.
  const crida = equipJuvenil ? await estatCrida(db, usuariId, instSenior.data) : null;

  // Context de personal: membres declarats (sou, contracte) + desquadre amb la fase.
  let contextPersonal = null;
  if (pla) {
    const { results: membres } = await db.prepare('SELECT rol, tipus, nivell, sou, setmanes_contracte FROM personal_membres WHERE usuari_id=?').bind(usuariId).all();
    const cfg = await db.prepare('SELECT config FROM fases_config WHERE plantilla=? AND fase=?').bind(pla.plantilla, pla.fase_actual).first();
    let desquadres = [];
    if (cfg) {
      const compte = {};
      for (const m of membres) if (m.rol === 'especialista' && m.tipus) compte[m.tipus] = (compte[m.tipus] || 0) + 1;
      desquadres = comparaPersonal(JSON.parse(cfg.config).personal, compte);
    }
    contextPersonal = { desquadres, membres };
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
    // Ocupació del nucli: entrenables vigents vs aforament (ple = no cal comprar ja).
    const nEntren = jugadors.filter((j) => ENTRENEN.has(j.categoria)).length;
    const aforament = null;
    const nucli_ple = aforament != null && nEntren >= aforament;
    contextCompra = { filtres: filtresCompra(config, jugadors, eco.caixa_disponible, compra), caixa: eco.caixa, caixa_disponible: eco.caixa_disponible, nucli_ple };
  }

  const formaMinima = pla ? (parseInt((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='forma_minima_venda'").bind(pla.plantilla).first())?.valor || '', 10) || null) : null;

  // COBERTURA MÍNIMA v2 (derivada de l'entrenament configurat, no d'un «8» escrit a mà):
  // capacitat d'entrenament de la formació × rols, i el cos de camp que cal per a omplir
  // els llocs restants amb marge d'absències. La liquidació la respecta (2c).
  let contextCobertura = null;
  if (pla) {
    const cfgJson = async (clau) => JSON.parse((await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor || 'null');
    const slotsCfg = aplicaEntrenament(await cfgJson('formacio'), (await entrenamentEfectiu(db, usuariId)).places);
    const rolsCfg = await cfgJson('rols');
    if (slotsCfg && slotsCfg.length) {
      const pomInt = async (clau, def) => parseInt((await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor || String(def), 10);
      const teFuturEntrenador = !!(await db.prepare("SELECT 1 x FROM plantilles_categories WHERE plantilla=? AND categoria='futur_entrenador' AND aforament>=1").bind(pla.plantilla).first());
      const cob = cobertura({ slots: slotsCfg, rols: rolsCfg }, {
        porters_minims: await pomInt('porters_minims', 2),
        futur_entrenador: teFuturEntrenador ? 1 : 0,
      });
      // Cos de camp DISPONIBLE: no entrenables, no porters i encara no llistats.
      const porterPos = (await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='posicio_porter'").bind(pla.plantilla).first())?.valor || 'PO';
      // VALOR DE VENDA DERIVAT (no el desat, que pot ser ranci o null): la MATEIXA vara
      // que usa la secció de Vendes, perquè les dues bandes retinguen els MATEIXOS jugadors.
      const cfgPla = await carregaConfigPla(db, pla.plantilla);
      const specCat = new Map(cfgPla.categories.map((c) => [c.categoria, c.parametres?.puntuacio]));
      for (const j of jugadors) {
        const spec = specCat.get(j.categoria);
        j.valor = spec ? avaluaPuntuacio(spec, j, cfgPla.params) : (j.puntuacio ?? 0);
      }
      const jaLlistats = new Set(vendesLlistades.map((v) => v.jugador_id));
      const disponible = (j) => !ENTRENEN.has(j.categoria) && j.transferible !== 1 && !jaLlistats.has(j.jugador_id);
      const cosCamp = jugadors.filter((j) => disponible(j) && j.posicio !== porterPos).length;
      const cosPorter = jugadors.filter((j) => disponible(j) && j.posicio === porterPos).length;
      contextCobertura = { ...cob, cos_camp: cosCamp, cos_porter: cosPorter, posicio_porter: porterPos };
    }
  }

  const ctx = { jugadors, juvenils, dataInstantania: instSenior.data, any_dies: anyDies, porter_notable_min: porterNotableMin, mercat, pla: contextPla, pendents_transaccio: pendents, personal: contextPersonal, compra: contextCompra, forma_minima: formaMinima, economia: eco, entrenament: entrenamentPrescrit, entrenament_confirmat: entrenamentConfirmat, entrenament_juvenil: entrenamentJuvenil, juvenil_objectiu: juvenilObjectiu, cobertura: contextCobertura, revelacions: revelacionsJuv, crida, dies_subhasta: diesSubhasta, setmana_inici_data: setmanaIniciData, vendes_llistades: vendesLlistades };
  const totes = executaRegles(ctx, actives);
  // «L'informe és l'agenda de hui»: els ítems amb acció FUTURA (agenda) no són
  // alertes; van a la subsecció Agenda (estat='agenda', reconstruïda cada revisió).
  const noves = totes.filter((a) => !a.agenda);
  const novesAgenda = totes.filter((a) => a.agenda);
  const configHash = await configHashComplet(db, pla?.plantilla || '');
  // La data d'acció entra a la clau (0b): una alerta anticipada vista NO silencia la
  // del dia d'acció (clau diferent → instància nova). Les alertes sense data d'acció
  // mantenen la clau de sempre (codi|jugador).
  const clau = (regla_codi, jugador_id, data_accio) => `${regla_codi}|${jugador_id ?? ''}|${data_accio ?? ''}`;
  const novesPerClau = new Map(noves.map((a) => [clau(a.regla_codi, a.jugador_id, a.data_accio), a]));

  // Alertes existents encara vives
  const { results: existents } = await db.prepare(
    "SELECT a.id, r.codi, a.jugador_id, a.estat, a.data_accio FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE a.usuari_id=? AND a.estat IN ('nova','vista','ignorada')"
  ).bind(usuariId).all();
  const existentPerClau = new Map(existents.map((e) => [clau(e.codi, e.jugador_id, e.data_accio), e]));

  const lots = [];
  // Resol les que ja no apliquen (nova/vista); les ignorades es queden ignorades
  for (const e of existents) {
    if (e.estat !== 'ignorada' && !novesPerClau.has(clau(e.codi, e.jugador_id, e.data_accio))) {
      lots.push(db.prepare("UPDATE alertes SET estat='resolta' WHERE id=?").bind(e.id));
    }
  }
  // Inserta les noves; REFRESCA les que ja existixen (clau+params+urgència poden
  // haver canviat amb el codi/config) preservant NOMÉS l'estat (vista/ignorada).
  // Sense això, una alerta desada amb una clau i18n vella queda morta per sempre.
  let n = 0;
  for (const a of noves) {
    const prev = existentPerClau.get(clau(a.regla_codi, a.jugador_id, a.data_accio));
    if (prev) {
      lots.push(db.prepare(
        'UPDATE alertes SET missatge_clau=?, parametres=?, urgencia=?, data=? WHERE id=?'
      ).bind(a.missatge_clau, JSON.stringify(a.parametres), a.urgencia ?? 0, instSenior.data, prev.id));
      continue;                                    // preserva l'estat (vista/ignorada)
    }
    lots.push(db.prepare(
      `INSERT INTO alertes (usuari_id, regla_id, jugador_id, data, missatge_clau, parametres, estat, urgencia, data_accio, diners)
       VALUES (?, ?, ?, ?, ?, ?, 'nova', ?, ?, ?)`
    ).bind(usuariId, codiToId.get(a.regla_codi), a.jugador_id, instSenior.data, a.missatge_clau, JSON.stringify(a.parametres), a.urgencia ?? 0, a.data_accio ?? null, a.diners ? JSON.stringify(a.diners) : null));
    n++;
  }
  // AGENDA: derivada, sense estat d'usuari → es reconstruïx sencera cada revisió.
  lots.push(db.prepare("DELETE FROM alertes WHERE usuari_id=? AND estat='agenda'").bind(usuariId));
  for (const a of novesAgenda) {
    lots.push(db.prepare(
      `INSERT INTO alertes (usuari_id, regla_id, jugador_id, data, missatge_clau, parametres, estat, urgencia, data_accio, diners)
       VALUES (?, ?, ?, ?, ?, ?, 'agenda', 0, ?, ?)`
    ).bind(usuariId, codiToId.get(a.regla_codi), a.jugador_id, instSenior.data, a.missatge_clau, JSON.stringify(a.parametres), a.data_accio ?? null, a.diners ? JSON.stringify(a.diners) : null));
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
