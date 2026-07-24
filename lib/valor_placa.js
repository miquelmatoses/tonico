// Tonico — MOTOR DE VALOR DE PLAÇA (doctrina juvenil v3.2). Classifica cada bucket de
// posició segons si l'entrena l'alineació A, la B, totes dues o cap, CREUANT els dos
// entrenaments configurats (entrenamentA, entrenamentB) amb la taula config
// entrenament→buckets (constants_joc, de la guia). ZERO entrenaments o posicions
// concretes al codi: tot ve de la config → generalitat per a qualsevol pipeline.
export function valorPlaces(entrenamentA, entrenamentB, taula = {}, buckets = null) {
  const posA = new Set(taula[entrenamentA] || []);
  const posB = new Set(taula[entrenamentB] || []);
  const univers = buckets || [...new Set(Object.values(taula).flat())];
  const out = {};
  for (const b of univers) {
    const a = posA.has(b), c = posB.has(b);
    out[b] = a && c ? 'ab' : a ? 'a' : c ? 'b' : 'cap';
  }
  return out;
}

// Ordre de valor d'una plaça: A+B > només-A > només-B > cap.
export const rangValor = (v) => ({ ab: 3, a: 2, b: 1, cap: 0 }[v] ?? 0);
