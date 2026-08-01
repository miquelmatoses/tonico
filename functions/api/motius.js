// Tonico — motius de baixa (polit #2.4b). Declara per què un jugador desaparegut
// va eixir. Venda amb import → crea la transacció d'Economia d'un colp. Promoció
// → enllaça amb la fila juvenil d'origen (jugador_origen_juvenil_id). Resol
// l'alerta ALR_TRANSACCIO_PENDENT.

// EL VOCABULARI DEL FULL (invariant 14): venda · despatx · promoció. S'exporta perquè el
// guardià comprove que TOTS es poden desar de veres, i no una llista copiada.
export const MOTIUS = ['venda', 'despatx', 'promocio', 'altres'];

// ── EL PONT AMB LA COLUMNA ───────────────────────────────────────────────────────────────
// `jugadors.motiu_baixa` porta un CHECK que admet «alliberament», que és el mot del sistema
// vell. El codi escrivia «despatx» i per tant declarar un despatx PETAVA sempre: violació de
// restricció, UPDATE avortat i —com que el botó no capturava l'error— pantalla muda.
//
// L'arreglo correcte seria canviar el CHECK, però SQLite no permet alterar-lo i reconstruir
// `jugadors` a D1 no es pot: quatre taules l'apunten i el rebuild peta per clau forana encara
// diferint-les (provat contra producció, que va fer marxa arrere sencera).
//
// Per tant el mot vell es queda a la columna i la traducció viu ACÍ, en un sol lloc i amb un
// guardià darrere (test/integracio.mjs) que comprova que cada motiu que l'API accepta es pot
// desar. «altres» es desa com a NULL: no és un motiu, és no dir-ne cap.
// ponytail: pont d'una línia, no rebuild. Si algun dia D1 admet reconstruir la taula, el bo és
// canviar el CHECK i llevar este mapa.
// `in` i no `??`: «altres» es tradueix a NULL a posta, i amb `??` el null es prenia per «no
// trobat» i tornava «altres», que el CHECK tampoc admet. Un mapa amb valors nuls no es pot
// consultar amb l'operador que serveix per a dir «no hi és».
const A_COLUMNA = { despatx: 'alliberament', altres: null };
export const aColumna = (motiu) => (motiu in A_COLUMNA ? A_COLUMNA[motiu] : motiu);

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
  ).bind(aColumna(c.motiu), c.motiu === 'promocio' ? (c.origen_juvenil_id || null) : null, c.jugador_id)];

  // L'IMPORT d'una venda ja no s'apunta: no entra a cap fórmula. La caixa és la DECLARADA
  // («diners disponibles»), i el diner d'una venda hi apareix al període següent. Apuntar-lo
  // ací era comptabilitat que no alimentava cap decisió.
  await env.DB.batch(lots);
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
