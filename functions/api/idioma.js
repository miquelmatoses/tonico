// Tonico — preferència d'idioma de l'usuari. POST {idioma} → la desa a usuaris.idioma
// (el middleware ja ha validat la sessió). Font de veritat per a la propera entrada.
const IDIOMES = ['ca-valencia', 'en'];

export async function onRequestPost({ request, env, data }) {
  const { idioma } = await request.json().catch(() => ({}));
  if (!IDIOMES.includes(idioma)) return json({ error: 'idioma_invalid' }, 400);
  await env.DB.prepare('UPDATE usuaris SET idioma = ? WHERE id = ?').bind(idioma, data.usuari.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
