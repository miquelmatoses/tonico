// Tonico — BUCLE D'ESTOC (contracte v3, PAS 8). Només amb caixa COBRADA, i els jugadors i
// l'estadi competixen pel mateix diner amb la MATEIXA unitat (mancança × pes):
//
//   -- JUGADOR
//   guany(jugador) = mancança(lloc) × pes(lloc)
//   cost(jugador)  = preu
//   admissible     = preu ≤ caixa_disponible I sou ≤ pressupost_sou(lloc)
//   -- ESTADI (dades declarades de la calculadora; la guia §10 hi delega)
//   Δflux            = manteniment_actual − `estadi_manteniment`
//   Δnivell_pagable  = nivell_objectiu(lloc | sou_sostenible + Δflux) − nivell_objectiu(lloc)
//   guany(estadi)    = SUMA(llocs amb mancança > 0: pes × MIN(mancança, Δnivell_pagable))
//   cost(estadi)     = `estadi_cost_obra`
//   admissible       = cost ≤ caixa_disponible I flux + Δflux ≥ 0
//   -- DECISIÓ
//   eficiència = guany / cost;  ACCIÓ = PRIMER(ORDENA(admissibles; eficiència DESC))
import { nivellObjectiu, pressupostSou } from './pesos.js';

export function guanyJugador(mancanca, pes) {
  if (mancanca == null || pes == null) return null;
  return Math.round(mancanca * pes * 10000) / 10000;
}

export function admissibleJugador(candidat, { caixa_disponible, pressupost_sou_lloc }) {
  if (caixa_disponible == null) return false;                 // sense estoc no es compra
  if (Number(candidat.preu ?? Infinity) > caixa_disponible) return false;
  if (pressupost_sou_lloc != null && Number(candidat.sou ?? 0) > pressupost_sou_lloc) return false;
  return true;
}

// Δflux d'una obra: el manteniment que t'estalvies (o que et costa) cada setmana.
export function deltaFlux(mantenimentActual, mantenimentNou) {
  if (mantenimentActual == null || mantenimentNou == null) return null;
  return mantenimentActual - mantenimentNou;
}

// guany(estadi): què desbloqueja el Δflux, en la MATEIXA unitat que un fitxatge. Només
// compta on hi ha mancança: pujar el sostre d'un lloc ja cobert val 0.
export function guanyEstadi(mancances, { sou_sostenible, delta_flux, taula_salaris, pesos }) {
  if (sou_sostenible == null || delta_flux == null) return null;
  const pressupostAra = pressupostSou(pesos, sou_sostenible);
  const pressupostDesp = pressupostSou(pesos, sou_sostenible + delta_flux);
  if (!pressupostAra || !pressupostDesp) return null;
  let total = 0;
  for (const [lloc, m] of Object.entries(mancances)) {
    if (!(m.mancanca > 0)) continue;
    const ara = nivellObjectiu(m.habilitat, pressupostAra[lloc], taula_salaris) ?? 0;
    const desp = nivellObjectiu(m.habilitat, pressupostDesp[lloc], taula_salaris) ?? 0;
    const deltaNivell = Math.max(0, desp - ara);
    total += (pesos[lloc] ?? 0) * Math.min(m.mancanca, deltaNivell);
  }
  return Math.round(total * 10000) / 10000;
}

export function admissibleEstadi({ cost, caixa_disponible, flux, delta_flux }) {
  if (caixa_disponible == null || cost == null) return false;
  if (cost > caixa_disponible) return false;
  if (flux != null && delta_flux != null && flux + delta_flux < 0) return false;
  return true;
}

export function eficiencia(guany, cost) {
  if (guany == null || !cost) return null;
  return Math.round((guany / cost) * 1e8) / 1e8;
}

// La decisió del PAS 8: de les opcions admissibles, la de més eficiència. Si no n'hi ha
// cap, cap compra — el sistema optimitza NOMÉS venent (PAS 7).
export function decisioEstoc(opcions) {
  const admissibles = opcions.filter((o) => o.admissible && o.eficiencia != null);
  if (!admissibles.length) return null;
  return [...admissibles].sort((a, b) => b.eficiencia - a.eficiencia)[0];
}
