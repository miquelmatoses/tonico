// Tonico — entrada. POST JSON {correu, contrasenya}. Verifica i posa cookie.
import { verificaContrasenya, signaSessio } from '../../lib/auth.js';
import { verificacioActiva } from '../../lib/verificacio.js';

const TTL = 60 * 60 * 24 * 30;               // 30 dies

export async function onRequestPost({ request, env }) {
  const { correu, contrasenya } = await request.json().catch(() => ({}));
  if (!correu || !contrasenya) return json({ error: 'falten_dades' }, 400);
  if (!env.SESSIO_SECRET) return json({ error: 'sense_secret_sessio' }, 500);

  const u = await env.DB.prepare('SELECT id, contrasenya, correu_verificat FROM usuaris WHERE correu = ?')
    .bind(correu).first();
  if (!u || !(await verificaContrasenya(contrasenya, u.contrasenya))) {
    return json({ error: 'credencials_incorrectes' }, 401);
  }
  if (!u.correu_verificat && await verificacioActiva(env.DB)) {
    return json({ error: 'correu_no_verificat' }, 403);       // estructura preparada
  }

  const exp = Math.floor(Date.now() / 1000) + TTL;
  const token = await signaSessio(u.id, env.SESSIO_SECRET, exp);
  return json({ ok: true }, 200, {
    'Set-Cookie': `sessio=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL}`,
  });
}

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj),
    { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
