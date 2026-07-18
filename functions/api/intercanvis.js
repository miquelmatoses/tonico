// Tonico — intercanvis de plaça (regla d'or). GET llista els pendents amb noms
// i números; POST accepta o rebutja. Acceptar aplica el moviment; rebutjar el
// silencia (memòria del fre anti-soroll = la diferència d'este moment).
export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare(
    `SELECT x.id, x.categoria, x.puntuacio_entrant, x.puntuacio_eixent, x.diferencia, x.desti_eixent,
            je.nom AS entrant, js.nom AS eixent, x.entrant_id, x.eixent_id
       FROM intercanvis x
       LEFT JOIN jugadors je ON je.id = x.entrant_id
       JOIN jugadors js ON js.id = x.eixent_id
      WHERE x.usuari_id = ? AND x.estat = 'pendent'
      ORDER BY x.diferencia DESC`
  ).bind(data.usuari.id).all();
  return json({ intercanvis: results });
}

export async function onRequestPost({ request, env, data }) {
  const { id, accio } = await request.json().catch(() => ({}));
  if (!id || !['acceptar', 'rebutjar'].includes(accio)) return json({ error: 'accio_invalida' }, 400);

  const x = await env.DB.prepare(
    "SELECT * FROM intercanvis WHERE id = ? AND usuari_id = ? AND estat = 'pendent'"
  ).bind(id, data.usuari.id).first();
  if (!x) return json({ error: 'no_trobat' }, 404);

  if (accio === 'rebutjar') {
    await env.DB.prepare("UPDATE intercanvis SET estat = 'rebutjat' WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  // Acceptar: l'entrant pren la plaça, l'eixent cau al seu destí. Tot origen 'auto'
  // (decidit per l'usuari, però el classificador el pot revisar en futures pujades).
  const lots = [
    env.DB.prepare("UPDATE intercanvis SET estat = 'acceptat' WHERE id = ?").bind(id),
    env.DB.prepare(
      `INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio, justificacio)
       VALUES (?, ?, 'auto', ?, 'classif.intercanvi')`
    ).bind(x.eixent_id, x.desti_eixent, x.puntuacio_eixent),
  ];
  if (x.entrant_id != null) {
    lots.push(env.DB.prepare(
      `INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio, justificacio)
       VALUES (?, ?, 'auto', ?, 'classif.intercanvi')`
    ).bind(x.entrant_id, x.categoria, x.puntuacio_entrant));
  }
  await env.DB.batch(lots);
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
