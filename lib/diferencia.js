// Tonico — diferència entre instantànies. Lògica pura (sense BD): decidix
// què fer amb cada jugador quan entra una instantània nova.
//
//   nous         → id_hattrick que no existia: crear fila jugadors.
//   recompres    → id_hattrick que existia però estava de baixa/pendent i
//                  reapareix: reactivar la fila (no duplicar ni fallar).
//   continuen    → ja actiu i encara present: només afegir instantània.
//   desapareguts → actiu però ja no ve al CSV: marcar 'pendent_de_motiu'.
//                  El motiu (venda/alliberament/promoció) el declara
//                  l'usuari en Fase 1; ací mai s'assigna automàticament.
export function classificar(idsCsv, jugadorsExistents) {
  const presents = new Set(idsCsv);
  const perId = new Map(jugadorsExistents.map((j) => [j.id_hattrick, j]));
  const nous = [], recompres = [], continuen = [];
  for (const id of presents) {
    const ex = perId.get(id);
    if (!ex) nous.push(id);
    else if (ex.estat === 'actiu') continuen.push(id);
    else recompres.push(id);
  }
  const desapareguts = jugadorsExistents
    .filter((j) => j.estat === 'actiu' && !presents.has(j.id_hattrick))
    .map((j) => j.id_hattrick);
  return { nous, recompres, continuen, desapareguts };
}
