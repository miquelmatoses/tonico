// Tonico — assignació manual de fornada (override del punt 7). Doctrina: només
// els entrenables tenen fornada. Rastre origen='manual'. Lletra buida = llevar.
export async function onRequestPost({ request, env, data }) {
  const { jugador_id, lletra } = await request.json().catch(() => ({}));
  if (!jugador_id) return json({ error: 'dades_invalides' }, 400);

  const j = await env.DB.prepare(
    `SELECT j.id FROM jugadors j JOIN equips e ON e.id = j.equip_id WHERE j.id = ? AND e.usuari_id = ?`
  ).bind(jugador_id, data.usuari.id).first();
  if (!j) return json({ error: 'no_trobat' }, 404);

  // Categoria vigent: ha de ser entrenable
  const c = await env.DB.prepare(
    'SELECT categoria FROM categories_jugador WHERE jugador_id = ? ORDER BY id DESC LIMIT 1'
  ).bind(jugador_id).first();
  if (!lletra) {
    await env.DB.prepare('DELETE FROM fornades_jugadors WHERE jugador_id = ?').bind(jugador_id).run();
    return json({ ok: true });
  }
  if (c?.categoria !== 'entrenable') return json({ error: 'nomes_entrenables' }, 409);

  let f = await env.DB.prepare('SELECT id FROM fornades WHERE usuari_id = ? AND lletra = ?')
    .bind(data.usuari.id, lletra).first();
  if (!f) {
    f = await env.DB.prepare('INSERT INTO fornades (usuari_id, lletra) VALUES (?, ?) RETURNING id')
      .bind(data.usuari.id, lletra).first();
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM fornades_jugadors WHERE jugador_id = ?').bind(jugador_id),
    env.DB.prepare("INSERT INTO fornades_jugadors (fornada_id, jugador_id, origen) VALUES (?, ?, 'manual')").bind(f.id, jugador_id),
  ]);
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
