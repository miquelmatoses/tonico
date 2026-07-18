// Tonico — eixida. Esborra la cookie de sessió.
export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Set-Cookie': 'sessio=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    },
  });
}
