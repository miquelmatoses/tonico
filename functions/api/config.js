// Tonico — API de la config (contracte v3, PAS 0). GET torna la config i què li falta;
// POST la desa. És l'única entrada d'usuari inicial: la resta (caixa, ingressos, personal,
// estadi) la demana Paco a l'informe després de la primera pujada.
import { llegixConfig, desaConfig, falten } from '../../lib/config.js';

export async function onRequestGet({ env, data }) {
  const config = await llegixConfig(env.DB, data.usuari.id);
  return json({ config, falten: falten(config) });
}

export async function onRequestPost({ request, env, data }) {
  const cos = await request.json().catch(() => ({}));
  try {
    const config = await desaConfig(env.DB, data.usuari.id, cos);
    return json({ config, falten: falten(config) });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}

const json = (obj) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } });
