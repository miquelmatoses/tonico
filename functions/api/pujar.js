// Tonico — endpoint de pujada d'instantànies. Pages Function sobre D1.
// POST multipart: camp 'data' (YYYY-MM-DD) + fitxers 'senior' i/o 'juvenil'.
//
// Persistència: crea instantània, upserta jugadors (nous/recompra), marca
// desapareguts com 'pendent_de_motiu' i escriu les files d'instantània.
// Tota la política (calendari) ve de constants_joc; res hardcoded ací.
import { modelSenior, modelJuvenil } from '../../lib/adaptador.js';
import { calcularSetmana } from '../../lib/calendari.js';
import { classificar } from '../../lib/diferencia.js';

// ponytail: split CSV ingenu (sense cometes ni comes dins de camp, com els
// exports reals). Si algun dia un camp porta comes, ací entra PapaParse.
const tokenitza = (text) => text.replace(/^﻿/, '').replace(/\r/g, '')
  .split('\n').filter((l) => l !== '').map((l) => l.split(','));

export async function onRequestPost(context) {
  const { request, env, data } = context;
  const usuari = data?.usuari;                          // el posa el _middleware (Bloc D)
  if (!usuari) return json({ error: 'no_autenticat' }, 401);

  const form = await request.formData();
  const dataInst = String(form.get('data') || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInst)) return json({ error: 'data_invalida' }, 400);

  const ancora = await carregaAncora(env.DB);
  const resultats = [];
  try {
    for (const [camp, tipus, adapta] of [
      ['senior', 'senior', modelSenior],
      ['juvenil', 'juvenil', modelJuvenil],
    ]) {
      const fitxer = form.get(camp);
      if (!fitxer || typeof fitxer.text !== 'function') continue;
      const model = adapta(tokenitza(await fitxer.text()), dataInst);
      resultats.push(await desar(env.DB, usuari.id, tipus, model, ancora));
    }
  } catch (e) {
    const msg = String(e.message || e);
    if (msg === 'sense_equips') return json({ error: 'sense_equips' }, 409);
    return json({ error: 'pujada_fallida', detall: msg }, 400);
  }
  if (resultats.length === 0) return json({ error: 'cap_fitxer' }, 400);
  return json({ ok: true, resultats });
}

export async function carregaAncora(db) {
  const { results } = await db.prepare(
    `SELECT clau, valor FROM constants_joc
      WHERE clau IN ('calendari_ancora_data','calendari_ancora_temporada','any_dies')`
  ).all();
  const c = Object.fromEntries(results.map((r) => [r.clau, r.valor]));
  return {
    data: c.calendari_ancora_data,
    temporada: parseInt(c.calendari_ancora_temporada, 10),
    anyDies: parseInt(c.any_dies, 10),
  };
}

export async function desar(db, usuariId, tipus, model, ancora) {
  const equip = await db.prepare(
    `SELECT id FROM equips WHERE usuari_id = ? AND tipus = ?`
  ).bind(usuariId, tipus).first();
  if (!equip) throw new Error('sense_equips');
  const equipId = equip.id;

  const { temporada, setmana } = calcularSetmana(model.data, ancora);
  const ins = await db.prepare(
    `INSERT INTO instantanies (equip_id, data, font, temporada, setmana_temporada)
     VALUES (?, ?, 'csv', ?, ?) RETURNING id`
  ).bind(equipId, model.data, temporada, setmana).first().catch((e) => {
    throw new Error(`Ja existix una instantània d'eixa data (${model.data})?  ${e.message}`);
  });
  const instId = ins.id;

  // Estat actual dels jugadors de l'equip
  const { results: existents } = await db.prepare(
    `SELECT id, id_hattrick, estat FROM jugadors WHERE equip_id = ?`
  ).bind(equipId).all();
  const idsCsv = model.jugadors.map((j) => j.identitat.id_hattrick);
  const dif = classificar(idsCsv, existents);
  const desapSet = new Set(dif.desapareguts);
  const recompraSet = new Set(dif.recompres);

  const lots = [];
  for (const j of model.jugadors) {
    const id = j.identitat;
    if (recompraSet.has(id.id_hattrick)) {
      lots.push(db.prepare(
        `UPDATE jugadors SET estat='actiu', data_baixa_club=NULL, motiu_baixa=NULL,
                nom=?, nacionalitat=?, especialitat=? WHERE equip_id=? AND id_hattrick=?`
      ).bind(id.nom, id.nacionalitat, id.especialitat, equipId, id.id_hattrick));
    } else {
      // INSERT nou o actualització de dades bàsiques si ja hi és (continua)
      lots.push(db.prepare(
        `INSERT INTO jugadors (equip_id, id_hattrick, nom, nacionalitat, especialitat, data_alta_club, estat)
         VALUES (?, ?, ?, ?, ?, ?, 'actiu')
         ON CONFLICT(equip_id, id_hattrick) DO UPDATE SET
           nom=excluded.nom, nacionalitat=excluded.nacionalitat, especialitat=excluded.especialitat`
      ).bind(equipId, id.id_hattrick, id.nom, id.nacionalitat, id.especialitat, model.data));
    }
  }
  for (const idh of desapSet) {
    lots.push(db.prepare(
      `UPDATE jugadors SET estat='pendent_de_motiu', data_baixa_club=?
        WHERE equip_id=? AND id_hattrick=? AND estat='actiu'`
    ).bind(model.data, equipId, idh));
  }
  await db.batch(lots);

  // Mapa id_hattrick → jugador.id (ja creats)
  const { results: jugFiles } = await db.prepare(
    `SELECT id, id_hattrick FROM jugadors WHERE equip_id = ?`
  ).bind(equipId).all();
  const perHt = new Map(jugFiles.map((r) => [r.id_hattrick, r.id]));

  // Files d'instantània (columnes derivades de les claus del model → sense drift)
  const taula = tipus === 'senior' ? 'instantanies_jugadors' : 'instantanies_juvenils';
  const insLots = model.jugadors.map((j) => {
    const cols = Object.keys(j.instantania);
    const marca = cols.map(() => '?').join(', ');
    return db.prepare(
      `INSERT INTO ${taula} (instantania_id, jugador_id, ${cols.join(', ')})
       VALUES (?, ?, ${marca})`
    ).bind(instId, perHt.get(j.identitat.id_hattrick), ...cols.map((k) => j.instantania[k]));
  });
  await db.batch(insLots);

  return {
    tipus, temporada, setmana, instantania_id: instId,
    total: model.jugadors.length,
    nous: dif.nous.length, recompres: dif.recompres.length, desapareguts: dif.desapareguts.length,
  };
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
