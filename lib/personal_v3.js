// Tonico — PERSONAL (contracte v3, PAS 11). BUCLE DE FLUX: el personal consumix sou
// setmanal, no caixa. Tot el personal cobra IGUAL siga quin siga el tipus: només compta
// el NIVELL. Per això no es compara eficiència entre tipus — se seguix una PRIORITAT fixa
// i cada tipus s'emporta el nivell més alt que el flux restant sostinga.
//
//   cost_flux(nivell) = `staff_cost_base` × 2^(nivell−1)   [1.020 · 2.040 · 4.080 · …]
//   flux_lliure       = flux − `reserva_flux`
//   nivell(tipus)     = MAX(n : cost acumulat ≤ flux_lliure), seguint `prioritat_personal`
//
// L'única decisió reversible és RENOVAR al venciment: acomiadar NO existix. Contractar és
// comprometre's, i això es diu abans de fer-ho.

export function costFlux(nivell, base) {
  if (nivell == null || nivell < 1 || base == null) return null;
  return base * Math.pow(2, nivell - 1);
}

// El nivell més alt que un pressupost paga (per a un sol membre).
export function nivellPagable(pressupost, base, nivellMax = 5) {
  if (pressupost == null || base == null) return 0;
  let millor = 0;
  for (let n = 1; n <= nivellMax; n++) if (costFlux(n, base) <= pressupost) millor = n;
  return millor;
}

// PAS 11: repartix el flux lliure entre els tipus seguint la prioritat. Cada tipus agafa el
// nivell més alt que el que queda encara paga; el que sobra passa al següent.
// `prioritat` = [{tipus, quants}]; `filtre(tipus)` permet excloure'n (p. ex. el psicòleg
// només en divisions altes).
export function planPersonal(fluxLliure, base, prioritat, opts = {}) {
  const { nivell_max = 5, admet = () => true } = opts;
  let restant = fluxLliure ?? 0;
  const pla = [];
  for (const { tipus, quants = 1 } of prioritat) {
    if (!admet(tipus)) { pla.push({ tipus, nivell: 0, cost: 0, exclos: true }); continue; }
    for (let i = 0; i < quants; i++) {
      const nivell = nivellPagable(restant, base, nivell_max);
      const cost = nivell ? costFlux(nivell, base) : 0;
      restant -= cost;
      pla.push({ tipus, nivell, cost });
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
