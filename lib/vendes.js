// Tonico — vendes (Àrea E). Preu d'eixida proposat des dels comparables de mercat
// (preus_observats): mediana dels de la mateixa posició; si no n'hi ha, de tots.
export function proposaPreuEixida(comparables, jugador) {
  const ambPreu = (comparables || []).filter((c) => c.preu != null);
  const mateixaPos = ambPreu.filter((c) => c.posicio && c.posicio === jugador.posicio);
  const pool = (mateixaPos.length ? mateixaPos : ambPreu).map((c) => c.preu);
  if (!pool.length) return null;
  const s = [...pool].sort((a, b) => a - b);
  const m = s.length >> 1;
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}
