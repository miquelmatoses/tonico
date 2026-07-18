// Tonico — comparador d'instantànies (F1-D). Per defecte creua l'última amb
// l'anterior del MATEIX equip; admet selecció manual (a, b). Torna pops
// d'habilitat, deltes de TSI/sou, nous/desapareguts, dies reals entre les dos
// (la velocitat mai assumix «una setmana») i marca la frontera de temporada.
const HABILITATS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  const tipus = url.searchParams.get('tipus') || 'senior';
  const equip = await env.DB.prepare('SELECT id FROM equips WHERE usuari_id = ? AND tipus = ?')
    .bind(data.usuari.id, tipus).first();
  if (!equip) return json({ error: 'sense_equips' }, 409);

  const { results: disponibles } = await env.DB.prepare(
    'SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id = ? ORDER BY data DESC, id DESC'
  ).bind(equip.id).all();
  if (disponibles.length < 2) return json({ comparable: false, instantanies: disponibles });

  const bId = Number(url.searchParams.get('b')) || disponibles[0].id;
  const aId = Number(url.searchParams.get('a')) || disponibles[1].id;
  const meta = (id) => disponibles.find((d) => d.id === id);
  const A = meta(aId), B = meta(bId);
  if (!A || !B) return json({ error: 'instantania_invalida' }, 400);

  const files = async (id) => {
    const { results } = await env.DB.prepare(
      `SELECT ij.jugador_id, j.nom, ij.tsi, ij.sou, ${HABILITATS.map((h) => 'ij.' + h).join(', ')}
         FROM instantanies_jugadors ij JOIN jugadors j ON j.id = ij.jugador_id WHERE ij.instantania_id = ?`
    ).bind(id).all();
    return new Map(results.map((r) => [r.jugador_id, r]));
  };
  const [fa, fb] = [await files(aId), await files(bId)];

  const dies = Math.round((Date.parse(B.data) - Date.parse(A.data)) / 86400000);
  const setmanes = dies / 7;
  const pops = [], tsi_sou = [];
  for (const [jid, b] of fb) {
    const a = fa.get(jid);
    if (!a) continue;
    const habs = HABILITATS.filter((h) => Number(b[h]) > Number(a[h]));
    if (habs.length) pops.push({ jugador_id: jid, nom: b.nom, habilitats: habs });
    tsi_sou.push({ jugador_id: jid, nom: b.nom, tsi_a: a.tsi, tsi_b: b.tsi, delta_tsi: (b.tsi ?? 0) - (a.tsi ?? 0),
      sou_a: a.sou, sou_b: b.sou, delta_sou: (b.sou ?? 0) - (a.sou ?? 0) });
  }
  const nous = [...fb.values()].filter((b) => !fa.has(b.jugador_id)).map((b) => b.nom);
  const desapareguts = [...fa.values()].filter((a) => !fb.has(a.jugador_id)).map((a) => a.nom);

  return json({
    comparable: true, a: A, b: B, dies, setmanes,
    canvi_temporada: A.temporada !== B.temporada,
    pops_per_setmana: setmanes > 0 ? +(pops.reduce((n, p) => n + p.habilitats.length, 0) / setmanes).toFixed(2) : null,
    pops, tsi_sou, nous, desapareguts, instantanies: disponibles,
  });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
