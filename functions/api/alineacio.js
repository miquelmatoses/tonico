// Tonico — alineació setmanal (Fase 3). GET la proposta per defecte; POST amb
// {vetats, fixats} per a l'override manual (fixar/vetar i regenerar).
import { proposaAlineacio } from '../../lib/orquestra_alineacio.js';

export async function onRequestGet({ env, data }) {
  const r = await proposaAlineacio(env.DB, data.usuari.id);
  return json(r || { error: 'sense_dades' }, r ? 200 : 409);
}

export async function onRequestPost({ request, env, data }) {
  const { vetats, fixats } = await request.json().catch(() => ({}));
  const r = await proposaAlineacio(env.DB, data.usuari.id, { vetats: vetats || [], fixats: fixats || [] });
  return json(r || { error: 'sense_dades' }, r ? 200 : 409);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
