// Tonico — integració del classificador amb la BD. Es crida després de cada
// pujada sènior: llig l'última instantània, classifica segons la plantilla de
// l'usuari, aplica en silenci els guanys de categoria (autos) i desa els
// desplaçaments com a intercanvis pendents (regla d'or). No conté política.
import { carregaConfigPla } from './config_pla.js';
import { classifica } from './classificador.js';
import { reconcilia } from './reconciliacio.js';
import { proposaFornades } from './fornades.js';

const CAMPS_JUSTIF = 'classif';   // prefix de clau i18n

export async function classificaEquip(db, usuariId, equipId, plantilla) {
  const config = await carregaConfigPla(db, plantilla);
  if (!config.categories.length) return { autos: 0, intercanvis: 0 };  // plantilla sense config

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

  // Intercanvis rebutjats (fre anti-soroll), en id_hattrick
  const { results: rebDb } = await db.prepare(
    "SELECT categoria, entrant_id, eixent_id, diferencia FROM intercanvis WHERE usuari_id = ? AND estat = 'rebutjat'"
  ).bind(usuariId).all();
  const rebutjats = rebDb.map((r) => ({ categoria: r.categoria,
    entrant_id: dbToHt.get(r.entrant_id) ?? null, eixent_id: dbToHt.get(r.eixent_id) ?? null,
    diferencia_al_rebutjar: r.diferencia }));

  const ideal = classifica(jugadors, config, fixats);
  const llindar = config.params.llindar_intercanvi ?? 0;
  const { autos, intercanvis } = reconcilia(jugadors, actuals, ideal, config, { llindar, rebutjats });

  const lots = [];
  for (const a of autos) {
    lots.push(db.prepare(
      `INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio, justificacio)
       VALUES (?, ?, 'auto', ?, ?)`
    ).bind(htToDb.get(a.id_hattrick), a.categoria, a.puntuacio, `${CAMPS_JUSTIF}.${a.categoria}`));
  }
  // Intercanvis nous: evita duplicar un pendent idèntic
  const { results: pend } = await db.prepare(
    "SELECT categoria, entrant_id, eixent_id FROM intercanvis WHERE usuari_id = ? AND estat = 'pendent'"
  ).bind(usuariId).all();
  const jaPendent = new Set(pend.map((p) => `${p.categoria}|${p.entrant_id}|${p.eixent_id}`));
  for (const x of intercanvis) {
    const ent = x.entrant_id != null ? htToDb.get(x.entrant_id) : null;
    const eix = htToDb.get(x.eixent_id);
    if (jaPendent.has(`${x.categoria}|${ent}|${eix}`)) continue;
    lots.push(db.prepare(
      `INSERT INTO intercanvis (usuari_id, categoria, entrant_id, eixent_id, puntuacio_entrant, puntuacio_eixent, diferencia, desti_eixent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(usuariId, x.categoria, ent, eix, x.punt_entrant, x.punt_eixent, x.diferencia, x.desti_eixent));
  }
  if (lots.length) await db.batch(lots);

  const fornades = await assignaFornadesAuto(db, usuariId, equipId, jugadors, htToDb, inst, config);
  return { autos: autos.length, intercanvis: intercanvis.length, fornades };
}

// Assigna fornada (per horitzó d'eixida) als entrenables, preservant els manuals.
// Universal: l'edat de pic de venda i el calendari són dades.
async function assignaFornadesAuto(db, usuariId, equipId, jugadors, htToDb, inst, config) {
  const edatPic = config.params.edat_pic_venda;
  if (edatPic == null) return 0;
  const anc = await db.prepare(
    `SELECT (SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data') AS data,
            (SELECT valor FROM constants_joc WHERE clau='calendari_ancora_temporada') AS temporada,
            (SELECT valor FROM constants_joc WHERE clau='any_dies') AS anyDies,
            (SELECT valor FROM constants_joc WHERE clau='temporada_setmanes') AS setmanes`
  ).first();
  const ancora = { data: anc.data, temporada: parseInt(anc.temporada, 10), anyDies: parseInt(anc.anyDies, 10) };
  const ref = inst.temporada + (inst.setmana_temporada >= parseInt(anc.setmanes, 10) ? 1 : 0);

  // Entrenables vigents
  const { results: ents } = await db.prepare(
    `SELECT c.jugador_id FROM categories_jugador c
       JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON c.id = m.mid
       JOIN jugadors j ON j.id = c.jugador_id
      WHERE c.categoria = 'entrenable' AND j.equip_id = ?`
  ).bind(equipId).all();
  const entIds = new Set(ents.map((e) => e.jugador_id));
  const perJid = new Map(jugadors.map((j) => [htToDb.get(j.id_hattrick), j]));
  const entrenables = [...entIds].map((jid) => {
    const j = perJid.get(jid);
    return j && { id_hattrick: j.id_hattrick, nom: j.nom, edat_anys: j.edat_anys, setmanes_club: j.setmanes_club };
  }).filter(Boolean);
  if (!entrenables.length) return 0;

  // Preserva els manuals: no els toquem
  const { results: manuals } = await db.prepare(
    `SELECT jugador_id FROM fornades_jugadors WHERE origen = 'manual' AND jugador_id IN (${[...entIds].map(() => '?').join(',')})`
  ).bind(...entIds).all();
  const esManual = new Set(manuals.map((m) => m.jugador_id));

  const proposta = proposaFornades(entrenables, inst.data, ancora, ref, edatPic);
  const lots = [];
  let n = 0;
  for (const f of proposta) {
    let fila = await db.prepare('SELECT id FROM fornades WHERE usuari_id = ? AND lletra = ?').bind(usuariId, f.lletra).first();
    if (!fila) {
      fila = await db.prepare(
        'INSERT INTO fornades (usuari_id, lletra, temporada_entrada, temporada_eixida_prevista) VALUES (?, ?, ?, ?) RETURNING id'
      ).bind(usuariId, f.lletra, f.temporada_entrada, f.temporada_eixida_prevista).first();
    }
    for (const ht of f.jugadors) {
      const jid = htToDb.get(ht);
      if (esManual.has(jid)) continue;
      lots.push(db.prepare("DELETE FROM fornades_jugadors WHERE jugador_id = ? AND origen = 'auto'").bind(jid));
      lots.push(db.prepare("INSERT INTO fornades_jugadors (fornada_id, jugador_id, origen) VALUES (?, ?, 'auto')").bind(fila.id, jid));
      n++;
    }
  }
  if (lots.length) await db.batch(lots);
  return n;
}
