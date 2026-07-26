// Tonico — integració del classificador amb la BD. Es crida després de cada
// pujada sènior: llig l'última instantània, classifica segons la plantilla de
// l'usuari, aplica en silenci els guanys de categoria (autos) i desa els
// desplaçaments com a intercanvis pendents (regla d'or). No conté política.
import { carregaConfigPla } from './config_pla.js';
import { classifica } from './classificador.js';
import { reconcilia } from './reconciliacio.js';
import { farcimentDerivat } from './cobertura.js';
import { entrenamentEfectiu, aplicaEntrenament } from './entrenament_places.js';

// El FARCIMENT és la cobertura mínima de cossos, DERIVADA de la formació + entrenament
// (LEAN): sobreescriu les places estàtiques amb les que els dos onzes necessiten de
// veritat, perquè el sobrant REAL (i no els cossos necessaris) caiga a venda.
async function derivaFarciment(db, usuariId, plantilla, config) {
  const farc = config.categories.find((c) => c.categoria === 'farciment');
  if (!farc?.parametres?.buckets) return;
  const get = async (clau) => JSON.parse((await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor || 'null');
  const formacio = await get('formacio');
  if (!formacio) return;
  const { places } = await entrenamentEfectiu(db, usuariId);
  const slots = aplicaEntrenament(formacio, places);
  const bucketsAlin = (await get('buckets_alineacio')) || {};
  const porters_minims = parseInt((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='porters_minims'").bind(plantilla).first())?.valor || '2', 10);
  const posicio_porter = (await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='posicio_porter'").bind(plantilla).first())?.valor || 'PO';
  farc.parametres.places = farcimentDerivat(slots, farc.parametres.buckets, bucketsAlin, { porters_minims, posicio_porter });
  // Els entrenables ocupen la seua posició natural però ENTRENEN en una altra: no fan de
  // cos, així que no resten places de farciment (si no, el cos quedaria per davall del mínim).
  farc.parametres.resta_ocupacio_exclou = ['entrenable'];
}

const CAMPS_JUSTIF = 'classif';   // prefix de clau i18n

export async function classificaEquip(db, usuariId, equipId, plantilla) {
  const config = await carregaConfigPla(db, plantilla);
  if (!config.categories.length) return { autos: 0, intercanvis: 0 };  // plantilla sense config
  await derivaFarciment(db, usuariId, plantilla, config);   // farciment = cobertura mínima derivada

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
    `SELECT c.jugador_id, c.categoria, c.origen FROM categories_jugador c
       JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador
              WHERE jugador_id IN (${marca}) GROUP BY jugador_id) m ON c.id = m.mid`
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

  const ideal = classifica(jugadors, config, fixats);
  const llindar = config.params.llindar_intercanvi ?? 0;
  const { autos, moviments, preguntes } = reconcilia(jugadors, actuals, ideal, config, { llindar, desfets });

  const lots = [];
  for (const a of autos) {
    lots.push(db.prepare(
      `INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio, justificacio)
       VALUES (?, ?, 'auto', ?, ?)`
    ).bind(htToDb.get(a.id_hattrick), a.categoria, a.puntuacio, `${CAMPS_JUSTIF}.${a.categoria}`));
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
