// Tonico — porta d'autorització. S'executa davant de tota Function.
// Valida la cookie de sessió i penja context.data.usuari. Bloqueja /api/*
// (excepte l'entrada) sense sessió. Els fitxers estàtics no passen per ací
// i no contenen res sensible: tota dada ix per l'API filtrada per usuari_id.
import { verificaSessio } from '../lib/auth.js';

const OBERTS = new Set(['/api/entrar', '/api/registre']);

export async function onRequest(context) {
  const { request, env, next } = context;
  const path = new URL(request.url).pathname;

  const cookie = (request.headers.get('Cookie') || '')
    .split(';').map((c) => c.trim()).find((c) => c.startsWith('sessio='));
  if (cookie && env.SESSIO_SECRET) {
    const ara = Math.floor(Date.now() / 1000);
    const id = await verificaSessio(cookie.slice('sessio='.length), env.SESSIO_SECRET, ara);
    if (id) context.data.usuari = { id };
  }

  if (path.startsWith('/api/') && !OBERTS.has(path) && !context.data.usuari) {
    return new Response(JSON.stringify({ error: 'no_autenticat' }),
      { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
  return next();
}
