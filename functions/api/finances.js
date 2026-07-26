// Tonico — finances declarades (Àrea A): caixa real de l'informe setmanal de HT,
// despeses fixes setmanals (planter, estadi) i ingressos recurrents. GET l'estat,
// POST fa merge dels camps enviats (no trepitja els que no vénen).
const CAMPS = ['caixa', 'caixa_data', 'despesa_planter', 'despesa_estadi', 'ingres_setmanal', 'taquilla', 'patrocini', 'premis', 'estadi_manteniment', 'estadi_cost_obra', 'estadi_data'];

export async function onRequestGet({ env, data }) {
  const f = await env.DB.prepare(
    'SELECT caixa, caixa_data, despesa_planter, despesa_estadi, ingres_setmanal, taquilla, patrocini, premis, estadi_manteniment, estadi_cost_obra, estadi_data FROM finances WHERE usuari_id=?'
  ).bind(data.usuari.id).first();
  return json({ finances: f || {} });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  const cur = await env.DB.prepare('SELECT * FROM finances WHERE usuari_id=?').bind(data.usuari.id).first() || {};
  const v = {};
  for (const k of CAMPS) v[k] = k in c ? c[k] : (cur[k] ?? null);
  if (v.caixa != null && !v.caixa_data) v.caixa_data = new Date().toISOString().slice(0, 10);
  const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));
  await env.DB.prepare(
    `INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_planter, despesa_estadi, ingres_setmanal, taquilla, patrocini, premis, estadi_manteniment, estadi_cost_obra, estadi_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(usuari_id) DO UPDATE SET caixa=excluded.caixa, caixa_data=excluded.caixa_data,
       despesa_planter=excluded.despesa_planter, despesa_estadi=excluded.despesa_estadi, ingres_setmanal=excluded.ingres_setmanal,
       taquilla=excluded.taquilla, patrocini=excluded.patrocini, premis=excluded.premis,
       estadi_manteniment=excluded.estadi_manteniment, estadi_cost_obra=excluded.estadi_cost_obra, estadi_data=excluded.estadi_data`
  ).bind(data.usuari.id, enter(v.caixa), v.caixa_data || null, enter(v.despesa_planter), enter(v.despesa_estadi),
    enter(v.ingres_setmanal), enter(v.taquilla), enter(v.patrocini), enter(v.premis),
    enter(v.estadi_manteniment), enter(v.estadi_cost_obra), v.estadi_data || null).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
