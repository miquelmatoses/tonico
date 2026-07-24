// Tonico — moviments de plaça (doctrina «ACTUA, INFORMA, DESFÉS», polit #3).
// GET: moviments EXECUTATS (amb Desfés) + preguntes prèvies (només desplaçaments
// d'un manual). POST: desfer un moviment, o acceptar/rebutjar una pregunta.
export async function onRequestGet({ env, data }) {
  const q = (estat) => env.DB.prepare(
    `SELECT x.id, x.categoria, x.puntuacio_entrant, x.puntuacio_eixent, x.diferencia, x.desti_eixent, x.data,
            je.nom AS entrant, js.nom AS eixent
       FROM intercanvis x LEFT JOIN jugadors je ON je.id = x.entrant_id JOIN jugadors js ON js.id = x.eixent_id
      WHERE x.usuari_id = ? AND x.estat = ? ORDER BY x.diferencia DESC`
  ).bind(data.usuari.id, estat).all();
  const [mov, preg] = [(await q('executat')).results, (await q('pendent')).results];

  // Caducitat (punt 6.4): recents = data >= el MÉS TARD de (avui − N dies) i (data de
  // l'última instantània). Així caduquen tant per temps com per la pujada següent.
  const n = parseInt((await env.DB.prepare(
    "SELECT valor FROM plantilles_parametres WHERE plantilla=(SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1) AND clau='moviment_caducitat_dies'"
  ).bind(data.usuari.id).first())?.valor || '7', 10);
  const eq = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
  const inst = eq ? await env.DB.prepare('SELECT data FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(eq.id).first() : null;
  const avuiMenysN = new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const llindar = inst?.data && inst.data > avuiMenysN ? inst.data : avuiMenysN;
  const recents = mov.filter((m) => (m.data || '') >= llindar);
  const historial = mov.filter((m) => (m.data || '') < llindar);
  return json({ moviments: recents, historial, preguntes: preg });
}

export async function onRequestPost({ request, env, data }) {
  const { id, accio } = await request.json().catch(() => ({}));
  if (!id || !['desfer', 'acceptar', 'rebutjar'].includes(accio)) return json({ error: 'accio_invalida' }, 400);

  const x = await env.DB.prepare('SELECT * FROM intercanvis WHERE id = ? AND usuari_id = ?').bind(id, data.usuari.id).first();
  if (!x) return json({ error: 'no_trobat' }, 404);

  const posa = (jugadorId, categoria) => env.DB.prepare(
    `INSERT INTO categories_jugador (jugador_id, categoria, origen, justificacio) VALUES (?, ?, 'auto', 'classif.intercanvi')`
  ).bind(jugadorId, categoria);

  if (accio === 'desfer') {                          // desfà un moviment executat → restaura l'estat previ
    if (x.estat !== 'executat') return json({ error: 'no_desfable' }, 409);
    const lots = [env.DB.prepare("UPDATE intercanvis SET estat='desfet' WHERE id=?").bind(id), posa(x.eixent_id, x.categoria)];
    if (x.entrant_id != null && x.categoria_previa_entrant) lots.push(posa(x.entrant_id, x.categoria_previa_entrant));
    await env.DB.batch(lots);
    return json({ ok: true });
  }
  if (x.estat !== 'pendent') return json({ error: 'no_pendent' }, 409);
  if (accio === 'rebutjar') { await env.DB.prepare("UPDATE intercanvis SET estat='rebutjat' WHERE id=?").bind(id).run(); return json({ ok: true }); }
  // acceptar una pregunta: aplica el moviment
  const lots = [env.DB.prepare("UPDATE intercanvis SET estat='acceptat' WHERE id=?").bind(id), posa(x.eixent_id, x.desti_eixent)];
  if (x.entrant_id != null) lots.push(posa(x.entrant_id, x.categoria));
  await env.DB.batch(lots);
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
