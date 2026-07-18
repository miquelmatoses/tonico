// Tonico — llista d'instantànies de l'usuari (filtrada per usuari_id).
export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare(
    `SELECT i.id, i.data, i.temporada, i.setmana_temporada, e.tipus, e.nom AS equip,
            (SELECT COUNT(*) FROM instantanies_jugadors j WHERE j.instantania_id = i.id) +
            (SELECT COUNT(*) FROM instantanies_juvenils v WHERE v.instantania_id = i.id) AS jugadors
       FROM instantanies i
       JOIN equips e ON e.id = i.equip_id
      WHERE e.usuari_id = ?
      ORDER BY i.data DESC, e.tipus`
  ).bind(data.usuari.id).all();
  return new Response(JSON.stringify({ instantanies: results }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
