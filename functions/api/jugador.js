// Tonico — fitxa de jugador (F1-C): identitat + historial d'instantànies amb
// pops d'habilitat detectats, corba de TSI/sou, historial de categoria i fornada.
const HABILITATS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];

export async function onRequestGet({ request, env, data }) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'falta_id' }, 400);

  const jugador = await env.DB.prepare(
    `SELECT j.id, j.id_hattrick, j.nom, j.nacionalitat, j.especialitat, j.estat,
            j.data_alta_club, j.motiu_baixa, e.tipus
       FROM jugadors j JOIN equips e ON e.id = j.equip_id
      WHERE j.id = ? AND e.usuari_id = ?`
  ).bind(id, data.usuari.id).first();
  if (!jugador) return json({ error: 'no_trobat' }, 404);

  const taula = jugador.tipus === 'juvenil' ? 'instantanies_juvenils' : 'instantanies_jugadors';
  const { results: snaps } = await env.DB.prepare(
    `SELECT i.data, i.temporada, i.setmana_temporada, ij.*
       FROM ${taula} ij JOIN instantanies i ON i.id = ij.instantania_id
      WHERE ij.jugador_id = ? ORDER BY i.data`
  ).bind(id).all();

  // Pops d'habilitat: habilitats que pugen respecte de la instantània anterior
  let previa = null;
  const instantanies = snaps.map((s) => {
    const pops = previa ? HABILITATS.filter((h) => Number(s[h]) > Number(previa[h])) : [];
    previa = s;
    return { ...s, pops };
  });

  const { results: categories } = await env.DB.prepare(
    'SELECT categoria, origen, puntuacio, justificacio, data_assignacio FROM categories_jugador WHERE jugador_id = ? ORDER BY id'
  ).bind(id).all();

  const fornada = await env.DB.prepare(
    `SELECT f.lletra, fj.origen FROM fornades_jugadors fj JOIN fornades f ON f.id = fj.fornada_id WHERE fj.jugador_id = ?`
  ).bind(id).first();

  return json({ jugador, instantanies, categories, fornada });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
