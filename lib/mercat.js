// Tonico — calendari de mercat. Pur: rep les files de calendari_mercat i respon
// la fase i el modificador d'una setmana, i quan arriba la pròxima recuperació.
export function modificadorMercat(calendari, setmana) {
  const f = calendari.find((c) => c.setmana_temporada === setmana);
  return f ? { fase: f.fase, modificador: f.modificador_valor } : { fase: null, modificador: 0 };
}

// Setmanes fins a la pròxima setmana amb modificador positiu (recuperació), i
// quina setmana és. Recorre el cicle (torna al principi de temporada).
export function propRecuperacio(calendari, setmanaActual, temporadaSetmanes) {
  for (let d = 1; d <= temporadaSetmanes; d++) {
    const w = ((setmanaActual - 1 + d) % temporadaSetmanes) + 1;
    if (modificadorMercat(calendari, w).modificador > 0) return { dins: d, setmana: w };
  }
  return { dins: null, setmana: null };
}

// Situació de mercat per a les recomanacions (dos rellotges).
export function situacioMercat(calendari, setmanaActual, temporadaSetmanes, esperaMax) {
  const { modificador } = modificadorMercat(calendari, setmanaActual);
  const rec = propRecuperacio(calendari, setmanaActual, temporadaSetmanes);
  return {
    modificador,
    depressio: modificador < 0,
    finsRecuperacio: rec.dins,
    setmanaRecuperacio: rec.setmana,
    esperaMax,
  };
}
