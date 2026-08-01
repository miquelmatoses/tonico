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
  const { f, kHab, kEnt, kAss, kEdat, kSchum } = coefs;
  if (nivell == null || edat == null || !kHab?.[habilitat]) return null;
  const fn = nivell < f.tall ? f.baix_a * Math.exp(f.baix_b * nivell) : f.alt_a / nivell + f.alt_b;
  // L'entrenador arriba com el NOM del seu nivell («passable»), que és com es declara. El pont
  // a l'escala 4..8 de Schum és una constant amb la seua font, no una conversió al codi.
  const ent = kEnt?.[String(kSchum?.[entrenador] ?? entrenador)];
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

// ── QUINA EDAT TÉ EL QUE JA HI ARRIBA ────────────────────────────────────────────────────
// Als llocs que ENTRENEN no es compra un vell: es fabrica. Un que entra als 17 amb el llistó
// d'entrenable i no para arriba a ~19,6 de creativitat cap als 30 i s'hi queda; el pressupost,
// per molt descompte d'edat que li poses, no passa de 9.
//
// Per tant l'edat d'eixos fitxatges no és una política, és una LECTURA de la corba: si el
// perfil demana creativitat 8 es busca de 18 anys, i si en demana 11, de 19. El MÉS JOVE que
// ja hi arriba — que és el que encara té recorregut per a entrenar-lo.
//
// Simula la mateixa corba que `velocitat` amb l'entrenador i els assistents que tens: si
// millores l'entrenador, la corba puja i la mateixa habilitat es troba un any abans.
export function edatPerNivell(coefs, base, objectiu, opts = {}) {
  const { edatInicial = 17, nivellInicial = null, setmanes = 16, edatMax = 33 } = opts;
  if (objectiu == null || nivellInicial == null) return null;
  let nivell = nivellInicial;
  if (nivell >= objectiu) return edatInicial;
  // ES MIRA A LA VORA DE CADA TEMPORADA, no setmana a setmana: el que es busca és l'edat que
  // TÉ un jugador que ja porta eixe nivell a la fitxa, i eixa és la que es tecleja al cercador.
  // La corba dels 17 acaba en 8,9, o siga que qui porta 8 en té 18.
  for (let edat = edatInicial; edat <= edatMax; edat++) {
    for (let s = 0; s < setmanes; s++) {
      const T = velocitat(coefs, { ...base, nivell, edat });
      if (!T) return null;
      nivell += T;
    }
    if (nivell >= objectiu) return edat + 1;
  }
  return null;                       // per damunt del sostre: no es fabrica, s'ha de comprar fet
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
    kAss: await c('entrenament_k_assistents'), kEdat: await c('entrenament_k_edat'),
    kSchum: await c('coach_nivell_schum') };
}
