// Tonico — registre obert. POST JSON {correu, contrasenya}. Crea l'usuari i,
// si la verificació NO és activa (per defecte), inicia sessió directament.
import { hashContrasenya, signaSessio } from '../../lib/auth.js';
import { verificacioActiva, creaTokenVerificacio, enviarCorreuVerificacio } from '../../lib/verificacio.js';

const TTL = 60 * 60 * 24 * 30;               // 30 dies

export async function onRequestPost({ request, env }) {
  const { correu, contrasenya } = await request.json().catch(() => ({}));
  if (!correu || !contrasenya) return json({ error: 'falten_dades' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correu)) return json({ error: 'correu_invalid' }, 400);
  if (!env.SESSIO_SECRET) return json({ error: 'sense_secret_sessio' }, 500);

  const existent = await env.DB.prepare('SELECT id FROM usuaris WHERE correu = ?').bind(correu).first();
  if (existent) return json({ error: 'correu_ja_registrat' }, 409);

  const hash = await hashContrasenya(contrasenya);
  const { id } = await env.DB.prepare(
    'INSERT INTO usuaris (correu, contrasenya) VALUES (?, ?) RETURNING id'
  ).bind(correu, hash).first();

  const ara = Math.floor(Date.now() / 1000);
  if (await verificacioActiva(env.DB)) {
    await enviarCorreuVerificacio(correu, await creaTokenVerificacio(env.DB, id, ara));
    return json({ ok: true, verificacio_pendent: true }, 201);   // sense sessió
  }
  const token = await signaSessio(id, env.SESSIO_SECRET, ara + TTL);
  return json({ ok: true }, 201, {
    'Set-Cookie': `sessio=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL}`,
  });
}

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj),
    { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
