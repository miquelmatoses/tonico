// Tonico — qui sóc. El middleware ja ha validat la sessió i penjat l'usuari.
export async function onRequestGet({ env, data }) {
  const u = await env.DB.prepare('SELECT id, correu FROM usuaris WHERE id = ?')
    .bind(data.usuari.id).first();
  return new Response(JSON.stringify({ usuari: u }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
