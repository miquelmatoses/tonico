// Tonico — override manual de categoria. POST {jugador_id, categoria, nota}.
// Queda fixada (origen 'manual'): el classificador no la tocarà, però sí podrà
// plantejar intercanvis que l'afecten.
const CATEGORIES = ['entrenable', 'venda', 'alliberament', 'farciment', 'experiencia', 'futur_entrenador', 'nucli_competitiu'];

export async function onRequestPost({ request, env, data }) {
  const { jugador_id, categoria, nota } = await request.json().catch(() => ({}));
  if (!jugador_id || !CATEGORIES.includes(categoria)) return json({ error: 'dades_invalides' }, 400);

  // El jugador ha de ser d'un equip de l'usuari
  const seu = await env.DB.prepare(
    `SELECT 1 FROM jugadors j JOIN equips e ON e.id = j.equip_id WHERE j.id = ? AND e.usuari_id = ?`
  ).bind(jugador_id, data.usuari.id).first();
  if (!seu) return json({ error: 'no_trobat' }, 404);

  await env.DB.prepare(
    `INSERT INTO categories_jugador (jugador_id, categoria, origen, nota, justificacio)
     VALUES (?, ?, 'manual', ?, 'classif.manual')`
  ).bind(jugador_id, categoria, nota || null).run();
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
