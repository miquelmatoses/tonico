// Tonico — transaccions i economia (Fase 5). GET llista + resum; POST crea;
// DELETE esborra. Els imports es guarden signats (ingressos +, despeses −).
import { economia, signa } from '../../lib/economia.js';

const TIPUS = ['compra', 'venda', 'sou_setmanal', 'ingres_patrocini', 'taquilla', 'personal', 'estadi', 'altres'];

export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.tipus, t.import, t.data, t.nota, j.nom AS jugador, t.jugador_id
       FROM transaccions t LEFT JOIN jugadors j ON j.id = t.jugador_id
      WHERE t.usuari_id = ? ORDER BY t.data DESC, t.id DESC`
  ).bind(data.usuari.id).all();
  return json({ transaccions: results, economia: await economia(env.DB, data.usuari.id) });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!TIPUS.includes(c.tipus) || c.import == null || isNaN(Number(c.import))) return json({ error: 'dades_invalides' }, 400);
  const dataMov = /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data : new Date().toISOString().slice(0, 10);
  // El jugador (si n'hi ha) ha de ser de l'usuari
  let jugadorId = null;
  if (c.jugador_id) {
    const j = await env.DB.prepare('SELECT j.id FROM jugadors j JOIN equips e ON e.id=j.equip_id WHERE j.id=? AND e.usuari_id=?').bind(c.jugador_id, data.usuari.id).first();
    if (!j) return json({ error: 'jugador_no_trobat' }, 404);
    jugadorId = j.id;
  }
  await env.DB.prepare(
    'INSERT INTO transaccions (usuari_id, jugador_id, tipus, import, data, nota) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(data.usuari.id, jugadorId, c.tipus, signa(c.tipus, Number(c.import)), dataMov, c.nota || null).run();
  return json({ ok: true }, 201);
}

export async function onRequestDelete({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.id) return json({ error: 'falta_id' }, 400);
  await env.DB.prepare('DELETE FROM transaccions WHERE id=? AND usuari_id=?').bind(c.id, data.usuari.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
