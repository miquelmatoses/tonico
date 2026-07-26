// Tonico — equips de l'usuari. GET llista; POST crea/actualitza sènior+juvenil
// (onboarding). El gate: no es pot pujar CSV sense equips creats.
export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare(
    'SELECT tipus, nom, id_hattrick FROM equips WHERE usuari_id = ? ORDER BY tipus'
  ).bind(data.usuari.id).all();
  return json({ equips: results });
}

export async function onRequestPost({ request, env, data }) {
  const cos = await request.json().catch(() => ({}));
  const s = cos.senior || {}, j = cos.juvenil || {};
  const teSenior = await env.DB.prepare("SELECT 1 FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
  if (!s.nom && !teSenior) return json({ error: 'falten_noms' }, 400);   // el sènior és obligatori
  const idh = (v) => (v === undefined || v === null || v === '' ? null : parseInt(v, 10));
  const posar = (nom, tipus, id_hattrick) => env.DB.prepare(
    `INSERT INTO equips (usuari_id, nom, tipus, id_hattrick) VALUES (?, ?, ?, ?)
     ON CONFLICT(usuari_id, tipus) DO UPDATE SET nom = excluded.nom, id_hattrick = excluded.id_hattrick`
  ).bind(data.usuari.id, nom, tipus, id_hattrick);
  // L'acadèmia (juvenil) és OPCIONAL (punt 3a): es pot afegir després sense tocar el sènior.
  const lots = [];
  if (s.nom) lots.push(posar(s.nom, 'senior', idh(s.id_hattrick)));
  if (j.nom) lots.push(posar(j.nom, 'juvenil', idh(j.id_hattrick)));
  if (lots.length) await env.DB.batch(lots);
  // Pla de l'usuari com a DADA (no default al codi). Fins la Fase 9, plantilla
  // 'competitiva' (v3); l'onboarding la pot canviar. No es duplica si ja existix.
  const plantilla = cos.plantilla || 'competitiva';
  const tePla = await env.DB.prepare('SELECT id FROM plans WHERE usuari_id = ? LIMIT 1').bind(data.usuari.id).first();
  if (!tePla) {
    await env.DB.prepare("INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (?, ?, 'competitiva')")
      .bind(data.usuari.id, plantilla).run();
  }
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj),
    { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
