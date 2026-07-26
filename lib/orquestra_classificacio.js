// Tonico — integració de la PLANTILLA (contracte v3, PAS 6) amb la BD. Es crida després
// de cada pujada sènior: llig l'última instantània, construïx la plantilla derivada
// (core/rotatius/titulars/porters/cossos i el sobrant), aplica en silenci els canvis de
// rol i desa els desplaçaments com a intercanvis (mecanisme actua+informa+desfés).
// No conté política: els números són poms i taules de la guia.
import { reconcilia } from './reconciliacio.js';
import { entrenamentEfectiu, aplicaEntrenament } from './entrenament_places.js';
import { construeixPlantilla } from './plantilla.js';
import { llegixConfig, llocsPartit } from './config.js';
import { carregaConfigPesos, nivellsObjectiu } from './pesos.js';
import { sobrecost } from './mancanca.js';
import { economia } from './economia.js';
import { sqlCategoriaVigent } from './categoria_vigent.js';

// Els LLOCS de la formació amb el que cada un demana: si entrena (i a quin %) i quina
// habilitat el jutja. Sense això no es pot triar ni el core ni els titulars.
async function llocsFormacio(db, usuariId, estrategia) {
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const jsonPom = async (clau) => { const v = await pom(clau); return v ? JSON.parse(v) : null; };
  const formacio = await jsonPom('formacio');
  if (!formacio) return null;
  const habPerLloc = (await jsonPom('taula_habilitat_lloc')) || {};
  const { places } = await entrenamentEfectiu(db, usuariId);
  const slots = aplicaEntrenament(formacio, places);
  return slots.map((s, i) => ({
    lloc: `${s.bucket}${i + 1}`,
    bucket: s.bucket,
    entrena: !!s.entrena,
    pct: s.pct ?? 100,
    habilitat: habPerLloc[s.bucket] ?? null,
  }));
}

const CAMPS_JUSTIF = 'classif';   // prefix de clau i18n

// Els rols del v3 amb la seua CAPACITAT (del PAS 6), en l'orde de valor. La reconciliació
// necessita l'aforament per a distingir un guany lliure (plaça vacant → auto silenciós)
// d'un DESPLAÇAMENT (algú entra i algú ix → actua + informa + desfés, invariant 6).
const rolsConfig = (cons, nTitulars) => [
  { categoria: 'core', ordre: 1, aforament: cons.n_core ?? 0 },
  { categoria: 'rotatiu', ordre: 2, aforament: cons.n_rotatius ?? 0 },
  { categoria: 'titular', ordre: 3, aforament: nTitulars },
  { categoria: 'porter', ordre: 4, aforament: cons.porters_n ?? 0 },
  { categoria: 'cos', ordre: 5, aforament: cons.cossos_n ?? 0 },
  { categoria: 'venda', ordre: 6 },
];

export async function classificaEquip(db, usuariId, equipId, plantilla) {
  const conf = await llegixConfig(db, usuariId);
  const llocs = await llocsFormacio(db, usuariId, plantilla);
  if (!llocs) return { autos: 0, intercanvis: 0 };          // sense formació no hi ha plantilla

  const inst = await db.prepare(
    'SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id = ? ORDER BY data DESC, id DESC LIMIT 1'
  ).bind(equipId).first();
  if (!inst) return { autos: 0, intercanvis: 0 };

  const { results: files } = await db.prepare(
    `SELECT j.id AS jid, j.id_hattrick, j.nom, j.especialitat, ij.*
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id = ij.jugador_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();
  if (!files.length) return { autos: 0, intercanvis: 0 };

  const htToDb = new Map();
  const dbToHt = new Map();
  const jugadors = files.map((f) => {
    htToDb.set(f.id_hattrick, f.jid); dbToHt.set(f.jid, f.id_hattrick);
    return { ...f, posicio: f.posicio_ultim_partit };   // f ja porta creativitat, edat_anys, sou, experiencia…
  });
  const jids = [...htToDb.values()];
  const marca = jids.map(() => '?').join(',');

  // Categories vigents (última per jugador) + pins manuals
  const { results: cats } = await db.prepare(
    `SELECT jugador_id, categoria, origen FROM ${sqlCategoriaVigent(['categoria', 'origen'], jids.length)}`
  ).bind(...jids).all();
  const actuals = new Map();
  const fixats = {};
  for (const c of cats) {
    const ht = dbToHt.get(c.jugador_id);
    actuals.set(ht, { categoria: c.categoria, origen: c.origen });
    if (c.origen === 'manual') fixats[ht] = c.categoria;
  }

  // Desfés i rebuigs recordats (fre anti-soroll), en id_hattrick
  const { results: desDb } = await db.prepare(
    "SELECT categoria, entrant_id, eixent_id, diferencia FROM intercanvis WHERE usuari_id = ? AND estat IN ('desfet','rebutjat')"
  ).bind(usuariId).all();
  const desfets = desDb.map((r) => ({ categoria: r.categoria,
    entrant_id: dbToHt.get(r.entrant_id) ?? null, eixent_id: dbToHt.get(r.eixent_id) ?? null,
    diferencia_al_rebutjar: r.diferencia }));

  // PAS 6: la plantilla derivada. El sobrant és el complement, sense marques dins.
  const pomNum = async (clau, def) => {
    const f = await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first();
    return f?.valor != null ? Number(f.valor) : def;
  };
  const anyDies = Number((await db.prepare("SELECT valor FROM constants_joc WHERE clau='any_dies'").first())?.valor ?? 112);
  const { skill } = await entrenamentEfectiu(db, usuariId);
  const cons = construeixPlantilla(
    jugadors.map((j) => ({ ...j, jugador_id: j.id_hattrick })),
    llocs,
    {
      A: skill,
      core_a_min: await pomNum('core_a_min', 0),
      edat_pic_venda: await pomNum('edat_pic_venda', null),
      any_dies: anyDies,
      partits_setmana: conf?.partits_setmana ?? null,
      llocs_partit: llocsPartit(conf, llocs.length),
      habilitat_porter: 'porteria',
    },
  );
  // Els pins MANUALS són sagrats (invariant 5): manen sobre el rol derivat.
  // PUNTUACIÓ DE TOTA CATEGORIA: la clau d'orde que decidix cada rol (PAS 6) i, per a la
  // VENDA, la del PAS 7 (`ordre_venda` = sobrecost DESC). Sense això, les files de venda
  // eixien sense puntuació: la categoria en té una, i s'ha de vore.
  const cfgPesos = await carregaConfigPesos(db, plantilla);
  const eco = await economia(db, usuariId);
  const nivells = nivellsObjectiu([...new Set(llocs.map((l) => l.bucket))], cfgPesos, eco.sou_sostenible);
  const puntsVenda = (j) => {
    // El seu lloc natural: el bucket on la seua millor habilitat compta.
    const millor = Object.entries(nivells)
      .map(([bucket, n]) => ({ bucket, n, hab: Number(j[n.habilitat] ?? 0) }))
      .sort((a, b) => b.hab - a.hab)[0];
    if (!millor) return null;
    return sobrecost(j, millor.n.habilitat, millor.n.nivell_objectiu, cfgPesos.taula_salaris);
  };
  const ideal = jugadors.map((j) => {
    const categoria = fixats[j.id_hattrick] ?? cons.rol[j.id_hattrick] ?? 'venda';
    const punts = cons.punts[j.id_hattrick];
    return {
      id_hattrick: j.id_hattrick, nom: j.nom, categoria,
      puntuacio: punts != null ? punts : puntsVenda(j),
    };
  });
  const config = { categories: rolsConfig(cons, llocs.filter((l) => !l.entrena).length), params: { categoria_terminal: 'venda' } };
  const llindar = await pomNum('llindar_intercanvi', 0);
  const { autos, moviments, preguntes } = reconcilia(jugadors, actuals, ideal, config, { llindar, desfets });

  const lots = [];
  const canvien = new Set(autos.map((a) => a.id_hattrick));
  for (const a of autos) {
    lots.push(db.prepare(
      `INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio, justificacio)
       VALUES (?, ?, 'auto', ?, ?)`
    ).bind(htToDb.get(a.id_hattrick), a.categoria, a.puntuacio, `${CAMPS_JUSTIF}.${a.categoria}`));
  }
  // LA PUNTUACIÓ NO POT DEPENDRE QUE LA CATEGORIA CANVIE. Només s'inserix fila quan hi ha
  // canvi de rol, així que qui es queda al mateix rol conservava la puntuació de la fila
  // vella —buida, si es va escriure abans que la puntuació existira— per sempre. Es posa al
  // dia in situ: és una dada DERIVADA de la mateixa clau d'orde, no un historial.
  for (const x of ideal) {
    if (canvien.has(x.id_hattrick)) continue;                 // ja li entra fila nova
    const jid = htToDb.get(x.id_hattrick);
    if (jid == null || x.puntuacio == null) continue;
    lots.push(db.prepare(
      `UPDATE categories_jugador SET puntuacio = ?
        WHERE id = (SELECT MAX(id) FROM categories_jugador WHERE jugador_id = ?)
          AND (puntuacio IS NULL OR puntuacio != ?)`
    ).bind(x.puntuacio, jid, x.puntuacio));
  }
  // Moviments EXECUTATS (informar + desfer). Es registren un colp; en re-generar,
  // l'entrant ja ocupa la plaça i el moviment no torna a aparéixer.
  for (const x of moviments) {
    lots.push(db.prepare(
      `INSERT INTO intercanvis (usuari_id, categoria, entrant_id, eixent_id, puntuacio_entrant, puntuacio_eixent, diferencia, desti_eixent, categoria_previa_entrant, estat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'executat')`
    ).bind(usuariId, x.categoria, x.entrant_id != null ? htToDb.get(x.entrant_id) : null, htToDb.get(x.eixent_id),
      x.punt_entrant, x.punt_eixent, x.diferencia, x.desti_eixent, x.categoria_previa_entrant));
  }
  // Preguntes prèvies (només desplaçaments d'un manual): dedup contra les pendents.
  const { results: pend } = await db.prepare(
    "SELECT categoria, entrant_id, eixent_id FROM intercanvis WHERE usuari_id = ? AND estat = 'pendent'"
  ).bind(usuariId).all();
  const jaPendent = new Set(pend.map((p) => `${p.categoria}|${p.entrant_id}|${p.eixent_id}`));
  for (const x of preguntes) {
    const ent = x.entrant_id != null ? htToDb.get(x.entrant_id) : null;
    const eix = htToDb.get(x.eixent_id);
    if (jaPendent.has(`${x.categoria}|${ent}|${eix}`)) continue;
    lots.push(db.prepare(
      `INSERT INTO intercanvis (usuari_id, categoria, entrant_id, eixent_id, puntuacio_entrant, puntuacio_eixent, diferencia, desti_eixent, categoria_previa_entrant)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(usuariId, x.categoria, ent, eix, x.punt_entrant, x.punt_eixent, x.diferencia, x.desti_eixent, x.categoria_previa_entrant));
  }
  if (lots.length) await db.batch(lots);

  return { autos: autos.length, moviments: moviments.length, preguntes: preguntes.length };
}
