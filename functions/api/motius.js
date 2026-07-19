// Tonico — motius de baixa (polit #2.4b). Declara per què un jugador desaparegut
// va eixir. Venda amb import → crea la transacció d'Economia d'un colp. Promoció
// → enllaça amb la fila juvenil d'origen (jugador_origen_juvenil_id). Resol
// l'alerta ALR_TRANSACCIO_PENDENT.
import { signa } from '../../lib/economia.js';

const MOTIUS = ['venda', 'alliberament', 'promocio', 'altres'];

export async function onRequestGet({ env, data }) {
  const { results: pendents } = await env.DB.prepare(
    `SELECT j.id, j.nom FROM jugadors j JOIN equips e ON e.id=j.equip_id
      WHERE e.usuari_id=? AND j.estat='pendent_de_motiu'`
  ).bind(data.usuari.id).all();

  // Candidats de vincle: juvenils del club (per suggerir l'origen d'una promoció)
  const { results: juvenils } = await env.DB.prepare(
    `SELECT j.id, j.nom FROM jugadors j JOIN equips e ON e.id=j.equip_id
      WHERE e.usuari_id=? AND e.tipus='juvenil' ORDER BY j.nom`
  ).bind(data.usuari.id).all();
  const tokens = (s) => new Set(String(s).toLowerCase().split(/\s+/));
  const items = pendents.map((p) => {
    const tp = tokens(p.nom);
    const candidats = [...juvenils].sort((a, b) =>
      [...tokens(b.nom)].filter((x) => tp.has(x)).length - [...tokens(a.nom)].filter((x) => tp.has(x)).length);
    return { ...p, candidats_juvenils: candidats.slice(0, 5) };
  });
  return json({ pendents: items });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.jugador_id || !MOTIUS.includes(c.motiu)) return json({ error: 'dades_invalides' }, 400);
  const j = await env.DB.prepare(
    "SELECT j.id FROM jugadors j JOIN equips e ON e.id=j.equip_id WHERE j.id=? AND e.usuari_id=? AND j.estat='pendent_de_motiu'"
  ).bind(c.jugador_id, data.usuari.id).first();
  if (!j) return json({ error: 'no_trobat' }, 404);

  const lots = [env.DB.prepare(
    "UPDATE jugadors SET estat='baixa', motiu_baixa=?, jugador_origen_juvenil_id=? WHERE id=?"
  ).bind(c.motiu === 'altres' ? null : c.motiu, c.motiu === 'promocio' ? (c.origen_juvenil_id || null) : null, c.jugador_id)];

  if (c.motiu === 'venda' && c.import != null && !isNaN(Number(c.import))) {
    lots.push(env.DB.prepare(
      'INSERT INTO transaccions (usuari_id, jugador_id, tipus, import, data, nota) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(data.usuari.id, c.jugador_id, 'venda', signa('venda', Number(c.import)), new Date().toISOString().slice(0, 10), 'motiu de baixa'));
  }
  await env.DB.batch(lots);
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
