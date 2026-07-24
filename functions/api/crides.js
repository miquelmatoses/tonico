// Tonico — crida setmanal (rellotge global). POST «he fet la crida» amb data +
// resultat (acceptat/rebutjat). Si s'accepta, el nou juvenil enllaça amb la
// instantània següent i la reavaluació/rànquing d'eixida és automàtica en pujar.
export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!['acceptat', 'rebutjat'].includes(c.resultat)) return json({ error: 'resultat_invalid' }, 400);
  const dataCrida = /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data : new Date().toISOString().slice(0, 10);
  await env.DB.prepare('INSERT INTO crides (usuari_id, data, resultat, jugador_nou_id) VALUES (?, ?, ?, ?)')
    .bind(data.usuari.id, dataCrida, c.resultat, c.jugador_nou_id || null).run();
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
