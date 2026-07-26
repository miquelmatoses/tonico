// Tonico — PERSONAL (contracte v3.1, PAS 11). BUCLE DE FLUX: el personal consumix sou
// setmanal, no caixa. El cost depén del NIVELL i de la BASE DEL TIPUS. Per això no es
// compara eficiència entre tipus — se seguix una PRIORITAT fixa i cada tipus s'emporta el
// nivell més alt que el flux restant sostinga.
//
//   cost_flux(tipus, nivell) = base(tipus) × 2^(nivell−1)
//   base(tipus)              = `prioritat_personal`[tipus].base, o `staff_cost_base`
//   flux_lliure              = MAX(0; flux + per_periode(personal) − reserva_flux)
//   nivell(tipus)            = MAX(n : cost acumulat ≤ flux_lliure), seguint la prioritat
//
// DUES BASES, no una (v3.1): 1.020 els especialistes, 1.250 l'entrenador. L'informe real de
// HT ho prova — 3 especialistes de nivell 2 (3 × 2.040) + entrenador de nivell 3 (5.000) =
// 11.120 €. Amb una sola base de 1.020 els 5.000 € serien IMPOSSIBLES: tota suma de nivells
// és múltiple de 1.020, i 5.000 no ho és.
//
// L'única decisió reversible és RENOVAR al venciment: acomiadar NO existix. Contractar és
// comprometre's, i això es diu abans de fer-ho.

export function costFlux(nivell, base) {
  if (nivell == null || nivell < 1 || base == null) return null;
  return base * Math.pow(2, nivell - 1);
}

// base(tipus): la que declara el tipus a `prioritat_personal`, si no la de defecte. Cap
// número ací (invariant 8): les dues bases són dades.
export function baseTipus(tipus, prioritat, baseDefecte = null) {
  const e = (prioritat || []).find((p) => p.tipus === tipus);
  return e?.base ?? baseDefecte;
}

// El nivell més alt que un pressupost paga (per a un sol membre).
export function nivellPagable(pressupost, base, nivellMax = 5) {
  if (pressupost == null || base == null) return 0;
  let millor = 0;
  for (let n = 1; n <= nivellMax; n++) if (costFlux(n, base) <= pressupost) millor = n;
  return millor;
}

// PAS 11: repartix el flux lliure entre els tipus seguint la prioritat. Cada tipus agafa el
// nivell més alt que el que queda encara paga, AMB LA SEUA BASE; el que sobra passa al
// següent. `prioritat` = [{tipus, quants, base?}]; `admet(tipus)` permet excloure'n (p. ex.
// el psicòleg només en divisions altes). `base` és la de defecte per als que no en declaren.
export function planPersonal(fluxLliure, base, prioritat, opts = {}) {
  const { nivell_max = 5, admet = () => true } = opts;
  let restant = fluxLliure ?? 0;
  const pla = [];
  for (const { tipus, quants = 1, base: baseTip } of prioritat) {
    if (!admet(tipus)) { pla.push({ tipus, nivell: 0, cost: 0, exclos: true }); continue; }
    const b = baseTip ?? base;
    for (let i = 0; i < quants; i++) {
      const nivell = nivellPagable(restant, b, nivell_max);
      const cost = nivell ? costFlux(nivell, b) : 0;
      restant -= cost;
      pla.push({ tipus, nivell, cost, base: b });
    }
  }
  return { pla, flux_restant: restant };
}

// RENOVAR (l'única decisió reversible). Al venciment: si el flux encara paga el nivell
// actual, es renova; si no, es baixa al nivell més alt que sí que pague; si no n'hi ha cap,
// no es renova.
export function decisioRenovacio(nivellActual, fluxLliure, base, nivellMax = 5) {
  if (nivellActual == null) return { accio: 'no_renoves', nivell: null };
  if (costFlux(nivellActual, base) <= (fluxLliure ?? 0)) return { accio: 'renova', nivell: nivellActual };
  const n = nivellPagable(fluxLliure, base, Math.min(nivellMax, nivellActual - 1));
  return n > 0 ? { accio: 'renova_al_nivell', nivell: n } : { accio: 'no_renoves', nivell: null };
}
