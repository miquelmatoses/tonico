// Tonico — vista de plantilla sènior: jugadors de l'última instantània amb la
// seua categoria vigent (puntuació + justificació + origen) i la fornada.
export async function onRequestGet({ env, data }) {
  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id = ? AND tipus = 'senior'")
    .bind(data.usuari.id).first();
  if (!equip) return json({ error: 'sense_equips' }, 409);

  const inst = await env.DB.prepare(
    'SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id = ? ORDER BY data DESC, id DESC LIMIT 1'
  ).bind(equip.id).first();
  if (!inst) return json({ instantania: null, jugadors: [], intercanvis: [] });

  const { results: jugadors } = await env.DB.prepare(
    `SELECT j.id, j.nom, j.especialitat, ij.posicio_ultim_partit AS posicio,
            ij.edat_anys, ij.edat_dies, ij.tsi, ij.sou, ij.experiencia,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada,
            c.categoria, c.puntuacio, c.justificacio, c.origen,
            f.lletra AS fornada
       FROM instantanies_jugadors ij
       JOIN jugadors j ON j.id = ij.jugador_id
       LEFT JOIN (SELECT cj.jugador_id, cj.categoria, cj.puntuacio, cj.justificacio, cj.origen
                    FROM categories_jugador cj
                    JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m
                      ON cj.id = m.mid) c ON c.jugador_id = j.id
       LEFT JOIN fornades_jugadors fj ON fj.jugador_id = j.id
       LEFT JOIN fornades f ON f.id = fj.fornada_id
      WHERE ij.instantania_id = ?
      ORDER BY c.puntuacio DESC`
  ).bind(inst.id).all();

  const { results: intercanvis } = await env.DB.prepare(
    `SELECT x.id, x.categoria, x.diferencia, x.desti_eixent, x.puntuacio_entrant, x.puntuacio_eixent,
            je.nom AS entrant, js.nom AS eixent
       FROM intercanvis x
       LEFT JOIN jugadors je ON je.id = x.entrant_id
       JOIN jugadors js ON js.id = x.eixent_id
      WHERE x.usuari_id = ? AND x.estat = 'pendent' ORDER BY x.diferencia DESC`
  ).bind(data.usuari.id).all();

  return json({ instantania: inst, jugadors, intercanvis });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
