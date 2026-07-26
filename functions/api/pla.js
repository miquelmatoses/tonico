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

  // Merge de paràmetres del pla (JSON) sense trepitjar la resta. La divisió, el país i
  // els partits per setmana ja NO viuen ací: són config (PAS 0), a /api/config.
  // `entrenament_confirmat` fora: era la finestra del panell d'entrenament, que se n'ha anat
// perquè l'entrenament es prescriu. Cap fórmula el llig ja.
const MERGE = ['tipus_setmana'];
  const aplicar = MERGE.filter((k) => cos[k] !== undefined);
  if (aplicar.length) {
    const row = await env.DB.prepare('SELECT parametres FROM plans WHERE id=?').bind(pla.id).first();
    const p = row?.parametres ? JSON.parse(row.parametres) : {};
    for (const k of aplicar) p[k] = cos[k] === '' ? null : cos[k];
    await env.DB.prepare('UPDATE plans SET parametres=? WHERE id=?').bind(JSON.stringify(p), pla.id).run();
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
