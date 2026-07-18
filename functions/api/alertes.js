// Tonico — alertes d'esta setmana. GET les actives (ordenades per urgència);
// POST per marcar estat (vista/ignorada) o regenerar sota demanda.
import { generaAlertes, estatRevisio } from '../../lib/orquestra_alertes.js';

export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.missatge_clau, a.parametres, a.urgencia, a.estat, j.nom AS jugador
       FROM alertes a LEFT JOIN jugadors j ON j.id = a.jugador_id
      WHERE a.usuari_id = ? AND a.estat IN ('nova','vista')
      ORDER BY a.urgencia DESC, a.id`
  ).bind(data.usuari.id).all();
  const { revisat, instantania } = await estatRevisio(env.DB, data.usuari.id);
  return json({
    alertes: results.map((a) => ({ ...a, parametres: a.parametres ? JSON.parse(a.parametres) : {} })),
    revisat, instantania,
  });
}

export async function onRequestPost({ request, env, data }) {
  const cos = await request.json().catch(() => ({}));
  if (cos.accio === 'regenerar') return json(await generaAlertes(env.DB, data.usuari.id));

  if (!cos.id || !['vista', 'ignorada', 'resolta'].includes(cos.estat)) return json({ error: 'dades_invalides' }, 400);
  const r = await env.DB.prepare('UPDATE alertes SET estat = ? WHERE id = ? AND usuari_id = ?')
    .bind(cos.estat, cos.id, data.usuari.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
