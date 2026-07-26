// Tonico — RÀNQUING ÚNIC DE JUVENILS per NIVELL numèric continu (doctrina v3 bloc 2).
// Substituïx els grups G1-G5 (discretització que creava empats artificials). Tot poms;
// cap entrenament ni posició concreta al codi (A i B són config → generalitat).
//
//   NIVELL = pes_A·valor(A) + pes_B·valor(B)
//   valor(habilitat) segons coneixement:
//     · actual i potencial coneguts → actual + (potencial−actual)·f_marge   (capat ⟹ actual pelat)
//     · actual conegut, potencial desconegut → actual + marge_esperat·f_marge
//     · tot desconegut → valor_esperat_desconegut (pom AUTOCALIBRANT: mitjana de les
//       revelacions de l'habilitat A de la PRÒPIA acadèmia; si no n'hi ha, el defecte)
const num = (v) => { if (v == null || v === 'desconegut') return null; const n = Number(v); return Number.isNaN(n) ? null : n; };
const esDesc = (y, skill) => { const v = y[`${skill}_actual`]; return v == null || v === 'desconegut'; };

export function valorHabilitat(y, skill, o) {
  const pot = num(y[`${skill}_potencial`]);
  if (esDesc(y, skill)) {
    // (c) actual DESCONEGUT però potencial CONEGUT: no és marge 0 (no està capat!). L'actual
    // esperat es capa al potencial i el marge esperat és real: potencial − min(esperat, potencial).
    // Un potencial conegut ALT val més que un jugador del tot desconegut.
    if (pot != null) {
      const esperat = Math.min(o.valor_esperat_desconegut, pot);
      return esperat + Math.max(0, pot - esperat) * o.f_marge;
    }
    // (b) tot desconegut: el full diu esperat_act + marge_ple × f_marge. Tornar l'esperat
    // pelat li llevava el marge que un jugador sense revelar SÍ que té: es tractava un
    // desconegut com si ja estiguera capat.
    return o.valor_esperat_desconegut + o.marge_esperat * o.f_marge;
  }
  const act = num(y[`${skill}_actual`]);
  if (pot == null) return act + o.marge_esperat * o.f_marge;        // (a) potencial desconegut
  return act + Math.max(0, pot - act) * o.f_marge;                  // (d) capat → marge 0 ⟹ actual pelat
}

// Autocalibració: mitjana dels actuals REVELATS de l'habilitat A a la pròpia acadèmia
// (cada descobriment ajusta què val un bitllet). Si no n'hi ha cap, el defecte del pom.
export function valorEsperatDesconegut(juvenils, skillA, defecte) {
  const revelats = juvenils.map((y) => num(y[`${skillA}_actual`])).filter((v) => v != null);
  return revelats.length ? revelats.reduce((a, b) => a + b, 0) / revelats.length : defecte;
}

// LECTURA de PROMOCIÓ (v3 punt 4a): cada setmana, el millor NIVELL ELEGIBLE (edat ≥
// pom anys I ≥ pom dies a l'acadèmia — dues condicions independents) es proposa per a LA
// promoció única. Si el millor elegible és CUA del rànquing (nivell més baix del que
// deixaríem entrar via crida), es marca per a despatx/promocionar-per-vendre en compte de
// promoció. `rang` ha de portar nivell + posicio_rang; `juvenils` porten edat i tenure.
export function lecturaPromocio(rang, juvenils, { edat_min = 17, dies_academia_min = 112 } = {}) {
  const perId = new Map(juvenils.map((y) => [y.jugador_id, y]));
  const elegible = (y) => {
    const j = perId.get(y.jugador_id) || {};
    const dies = j.dies_academia ?? j.dies_al_promocionar ?? null;
    const perDies = dies != null ? dies >= dies_academia_min : (j.dies_restants_promocio ?? 1) <= 0;  // HT ja encapsula 17a+112d
    return (j.edat_anys ?? 0) >= edat_min && perDies;
  };
  const elegibles = rang.filter(elegible);
  if (!elegibles.length) return { proposta: null };
  const millor = elegibles.reduce((a, b) => ((b.nivell ?? 0) > (a.nivell ?? 0) ? b : a));
  const cua = millor.posicio_rang > Math.ceil(rang.length / 2);   // està a la meitat baixa del rànquing
  return { proposta: { jugador_id: millor.jugador_id, nom: millor.nom, nivell: millor.nivell, cua } };
}

export function ranquingJuvenil(juvenils, opts = {}) {
  const o = { pes_a: 1.0, pes_b: 0.66, f_marge: 0.5, marge_esperat: 3, valor_esperat_desconegut_defecte: 5, ...opts };
  o.valor_esperat_desconegut = valorEsperatDesconegut(juvenils, o.entrenamentA, o.valor_esperat_desconegut_defecte);
  const nivell = (y) => o.pes_a * valorHabilitat(y, o.entrenamentA, o) + o.pes_b * valorHabilitat(y, o.entrenamentB, o);
  return juvenils
    .map((y) => ({ y, n: nivell(y) }))
    .sort((a, b) => b.n - a.n || (a.y.dies_restants_promocio ?? 99999) - (b.y.dies_restants_promocio ?? 99999))
    .map((x, i) => ({ jugador_id: x.y.jugador_id, nom: x.y.nom, nivell: Math.round(x.n * 100) / 100,
      posicio_rang: i + 1, dies_restants_promocio: x.y.dies_restants_promocio ?? null }));
}
