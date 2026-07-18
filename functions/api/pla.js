// Tonico — pla mestre (Fase 4). GET l'estat (pla vs realitat); POST per editar
// la fase/paràmetres del pla o una fila de temporada (divisió, mode).
import { estatPla } from '../../lib/pla.js';

export async function onRequestGet({ env, data }) {
  const r = await estatPla(env.DB, data.usuari.id);
  return json(r || { error: 'sense_pla' }, r ? 200 : 404);
}

export async function onRequestPost({ request, env, data }) {
  const cos = await request.json().catch(() => ({}));
  const pla = await env.DB.prepare('SELECT id FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  if (!pla) return json({ error: 'sense_pla' }, 404);

  if (cos.temporada != null) {                       // upsert d'una temporada
    await env.DB.prepare(
      `INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(pla_id, temporada) DO UPDATE SET divisio_prevista=excluded.divisio_prevista, mode=excluded.mode`
    ).bind(pla.id, cos.temporada, cos.divisio_prevista ?? null, cos.mode ?? null).run();
    return json({ ok: true });
  }
  // Actualització del pla (fase, paràmetres)
  const sets = [], vals = [];
  if (cos.fase_actual !== undefined) { sets.push('fase_actual=?'); vals.push(cos.fase_actual); }
  if (cos.parametres !== undefined) { sets.push('parametres=?'); vals.push(JSON.stringify(cos.parametres)); }
  if (sets.length) await env.DB.prepare(`UPDATE plans SET ${sets.join(', ')} WHERE id=?`).bind(...vals, pla.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
