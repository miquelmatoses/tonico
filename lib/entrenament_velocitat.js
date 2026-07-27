// Tonico — VELOCITAT D'ENTRENAMENT (fórmula de Schum).
//
// Quantes setmanes costa pujar un nivell d'habilitat. Hattrick no ho publica; la fórmula que
// gasta la comunitat és de Schum i Hattrick Organizer la documenta sencera. Cap número viu
// ací: tots els coeficients són constants de joc (invariant 8).
//
//   T = f(nivell) × K(entrenador) × K(assistents) × K(intensitat) × K(resistència)
//       × K(habilitat) × K(edat) × K(minuts) × 0,01
//
// T és l'increment d'habilitat en UNA setmana d'entrenament, o siga que un nivell sencer costa
// 1/T setmanes. Les dues corbes que Miquel volia vore ixen d'ací soles: `f(nivell)` cau amb el
// nivell i `K(edat)` cau amb l'edat, i es multipliquen.

export function velocitat(coefs, { nivell, edat, habilitat, entrenador, assistents,
  intensitat, resistencia, minuts = 90 }) {
  const { f, kHab, kEnt, kAss, kEdat } = coefs;
  if (nivell == null || edat == null || !kHab?.[habilitat]) return null;
  const fn = nivell < f.tall ? f.baix_a * Math.exp(f.baix_b * nivell) : f.alt_a / nivell + f.alt_b;
  const ent = kEnt?.[String(entrenador)];
  if (ent == null) return null;                       // sense entrenador declarat no se suposa
  const ass = kAss.base + Math.min(assistents ?? 0, kAss.max) * kAss.per_nivell;
  const T = fn * kHab[habilitat] * (minuts / 90) * (kEdat.numerador / (edat + kEdat.suma))
    * ass * ent * (1 - (resistencia ?? 0) / 100) * ((intensitat ?? 100) / 100) * 0.01;
  return T > 0 ? Math.min(1, T) : null;
}

// Les setmanes que falten per a arribar al nivell següent. `sub` és la part del nivell que ja
// porta acumulada (0..1): Tonico la deriva de fa quant que el veu en este nivell, no la demana.
export function setmanesFinsAlSegüent(coefs, opts, sub = 0) {
  const T = velocitat(coefs, opts);
  if (!T) return null;
  const queda = Math.max(0, 1 - Math.min(sub, 0.99));
  return Math.round((queda / T) * 10) / 10;
}

// Els coeficients, de `constants_joc`. Es carreguen una vegada i es passen avant.
export async function carregaCoeficients(db) {
  const c = async (clau) => {
    const f = await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first();
    return f?.valor ? JSON.parse(f.valor) : null;
  };
  const f = await c('entrenament_f_nivell');
  if (!f) return null;
  return { f, kHab: await c('entrenament_k_habilitat'), kEnt: await c('entrenament_k_entrenador'),
    kAss: await c('entrenament_k_assistents'), kEdat: await c('entrenament_k_edat') };
}
