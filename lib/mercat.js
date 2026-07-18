// Tonico — calendari de mercat. Pur: rep les files de calendari_mercat i respon
// la fase i el modificador d'una setmana, i quan arriba la pròxima recuperació.
export function modificadorMercat(calendari, setmana) {
  const f = calendari.find((c) => c.setmana_temporada === setmana);
  return f ? { fase: f.fase, modificador: f.modificador_valor } : { fase: null, modificador: 0 };
}

// Setmanes fins a la pròxima setmana amb el signe de modificador demanat
// (dir > 0 = recuperació/venda; dir < 0 = depressió/compra). Recorre el cicle.
export function propModificador(calendari, setmanaActual, temporadaSetmanes, dir) {
  for (let d = 1; d <= temporadaSetmanes; d++) {
    const w = ((setmanaActual - 1 + d) % temporadaSetmanes) + 1;
    const m = modificadorMercat(calendari, w).modificador;
    if ((dir > 0 && m > 0) || (dir < 0 && m < 0)) return { dins: d, setmana: w };
  }
  return { dins: null, setmana: null };
}
export const propRecuperacio = (cal, s, t) => propModificador(cal, s, t, 1);

// Situació de mercat per a les recomanacions (dos rellotges) i finestres.
export function situacioMercat(calendari, setmanaActual, temporadaSetmanes, esperaMax) {
  const { modificador } = modificadorMercat(calendari, setmanaActual);
  const rec = propModificador(calendari, setmanaActual, temporadaSetmanes, 1);
  const dep = propModificador(calendari, setmanaActual, temporadaSetmanes, -1);
  return {
    modificador,
    depressio: modificador < 0,
    finsRecuperacio: rec.dins,
    setmanaRecuperacio: rec.setmana,
    finsDepressio: dep.dins,
    setmanaDepressio: dep.setmana,
    esperaMax,
  };
}
