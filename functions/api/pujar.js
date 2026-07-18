// Tonico — endpoint de pujada d'instantànies. Pages Function sobre D1.
// POST multipart: camp 'data' (YYYY-MM-DD) + fitxers 'senior' i/o 'juvenil'.
//
// Persistència: crea instantània, upserta jugadors (nous/recompra), marca
// desapareguts com 'pendent_de_motiu' i escriu les files d'instantània.
// Tota la política (calendari) ve de constants_joc; res hardcoded ací.
import { modelSenior, modelJuvenil } from '../../lib/adaptador.js';
import { calcularSetmana } from '../../lib/calendari.js';
import { classificar } from '../../lib/diferencia.js';
import { classificaEquip } from '../../lib/orquestra_classificacio.js';
import { generaAlertes } from '../../lib/orquestra_alertes.js';

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
  const reemplaça = form.get('reemplaça') === 'true';   // repuja del mateix dia: substituïx

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
      resultats.push(await desar(env.DB, usuari.id, tipus, model, ancora, reemplaça));
    }
  } catch (e) {
    const msg = String(e.message || e);
    if (msg === 'sense_equips') return json({ error: 'sense_equips' }, 409);
    if (msg === 'instantania_existix') return json({ error: 'instantania_existix' }, 409);
    return json({ error: 'pujada_fallida', detall: msg }, 400);
  }
  if (resultats.length === 0) return json({ error: 'cap_fitxer' }, 400);

  // Classificació automàtica del sènior (regla d'or) si s'ha pujat i hi ha pla.
  let classificacio = null;
  if (resultats.some((r) => r.tipus === 'senior')) {
    const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id = ? LIMIT 1').bind(usuari.id).first();
    const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id = ? AND tipus = 'senior'").bind(usuari.id).first();
    if (pla && equip) classificacio = await classificaEquip(env.DB, usuari.id, equip.id, pla.plantilla);
  }
  // Motor de regles: genera l'informe d'esta setmana (Paco Meseguer).
  const alertes = await generaAlertes(env.DB, usuari.id);
  return json({ ok: true, resultats, classificacio, alertes });
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

export async function desar(db, usuariId, tipus, model, ancora, reemplaça = false) {
  const equip = await db.prepare(
    `SELECT id FROM equips WHERE usuari_id = ? AND tipus = ?`
  ).bind(usuariId, tipus).first();
  if (!equip) throw new Error('sense_equips');
  const equipId = equip.id;

  // Màxim un punt per dia i equip: una repuja del mateix dia substituïx (amb confirmació).
  const existent = await db.prepare(
    "SELECT id FROM instantanies WHERE equip_id = ? AND data = ? AND font = 'csv'"
  ).bind(equipId, model.data).first();
  if (existent) {
    if (!reemplaça) throw new Error('instantania_existix');
    await db.batch([
      db.prepare('DELETE FROM instantanies_jugadors WHERE instantania_id = ?').bind(existent.id),
      db.prepare('DELETE FROM instantanies_juvenils WHERE instantania_id = ?').bind(existent.id),
      db.prepare('DELETE FROM instantanies WHERE id = ?').bind(existent.id),
    ]);
  }

  const { temporada, setmana } = calcularSetmana(model.data, ancora);
  const ins = await db.prepare(
    `INSERT INTO instantanies (equip_id, data, font, temporada, setmana_temporada)
     VALUES (?, ?, 'csv', ?, ?) RETURNING id`
  ).bind(equipId, model.data, temporada, setmana).first();
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
