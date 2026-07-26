// Tonico — LA CATEGORIA VIGENT D'UN JUGADOR, EN UN SOL LLOC.
// `categories_jugador` és un HISTORIAL: la vigent és la de l'id més alt. Este subselect
// estava copiat a huit fitxers; una còpia que s'oblide de filtrar deixa passar fitxes que
// ja no són a la instantània (estat derivat ranci), i com que és copiat-i-apegat no hi ha
// manera de corregir-ho una vegada. Ara hi ha una sola font, i el guardià de pantalla peta
// si algú el torna a escriure a mà.
//
// L'estat derivat NOMÉS es llig a través de la instantània que el va derivar: totes les
// consultes que l'usen partixen d'`instantanies_jugadors` (o creuen el mapa contra files
// que ja en venen), i per tant una categoria d'un jugador que ja no hi és no es pinta.

// Subselect per a fer LEFT JOIN. `camps` són les columnes de `categories_jugador` que es
// volen (sempre inclou jugador_id). L'àlies del resultat el posa qui l'incrusta.
// `nRestringits`: quan qui consulta ja té la llista de jugadors, l'historial es filtra dins
// del subselect (una marca `?` per jugador) en lloc de recórrer-lo sencer.
export function sqlCategoriaVigent(camps = ['categoria'], nRestringits = 0) {
  const llista = ['cj.jugador_id', ...camps.map((c) => `cj.${c}`)].join(', ');
  const on = nRestringits > 0
    ? `WHERE jugador_id IN (${Array.from({ length: nRestringits }, () => '?').join(',')}) `
    : '';
  return `(SELECT ${llista} FROM categories_jugador cj
             JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador ${on}GROUP BY jugador_id) m
               ON cj.id = m.mid)`;
}

// Mapa jugador_id → categoria, per a creuar-lo en JS contra files que ja venen de la
// instantània (comparador, informes). No filtra per instantània a propòsit: qui el consumix
// només el consulta per als jugadors que ja té.
export async function categoriesVigents(db) {
  const { results } = await db.prepare(
    `SELECT jugador_id, categoria FROM ${sqlCategoriaVigent()}`
  ).all();
  return new Map(results.map((c) => [c.jugador_id, c.categoria]));
}
