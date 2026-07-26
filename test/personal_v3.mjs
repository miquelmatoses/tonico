// Tonico — PERSONAL del v3 (PAS 11): bucle de FLUX, prioritat fixa, sense acomiadar.
// node test/personal_v3.mjs
import assert from 'node:assert/strict';
import { costFlux, nivellPagable, planPersonal, decisioRenovacio, setmanesRestants } from '../lib/personal_v3.js';

const BASE = 1020;   // staff_cost_base

// ── cost_flux(nivell) = base × 2^(nivell−1) ──
assert.deepEqual([1, 2, 3, 4, 5].map((n) => costFlux(n, BASE)), [1020, 2040, 4080, 8160, 16320]);
assert.equal(costFlux(0, BASE), null, 'no hi ha nivell 0');
assert.equal(costFlux(2, null), null, 'sense base declarada no s\'inventa cost');

// ── nivell pagable ──
assert.equal(nivellPagable(16320, BASE), 5);
assert.equal(nivellPagable(16319, BASE), 4);
assert.equal(nivellPagable(1019, BASE), 0, 'si no arriba ni al primer, cap nivell');
assert.equal(nivellPagable(null, BASE), 0);

// ── El pla per PRIORITAT: cada tipus agafa el que el flux restant encara paga ──
const PRIOR = [{ tipus: 'assistent', quants: 2 }, { tipus: 'entrenador' }, { tipus: 'metge' }, { tipus: 'psicoleg' }];
const r = planPersonal(30000, BASE, PRIOR);
assert.equal(r.pla[0].tipus, 'assistent');
assert.equal(r.pla[0].nivell, 5, 'el primer assistent s\'emporta el més alt que el flux paga (16.320 ≤ 30.000)');
assert.deepEqual(r.pla.map((x) => x.nivell), [5, 4, 3, 1, 0],
  'i cada següent agafa el més alt que encara paga el que queda');
assert.ok(r.pla[1].nivell <= r.pla[0].nivell, 'el segon agafa del que queda');
assert.ok(r.flux_restant >= 0, 'mai es compromet més flux del que hi ha');
const gastat = r.pla.reduce((a, x) => a + x.cost, 0);
assert.equal(gastat + r.flux_restant, 30000, 'tot el flux queda comptat');

// L'ORDE de la prioritat mana: amb poc flux, els primers s'ho emporten i els últims es
// queden a zero (no es reparteix «un poc per a cadascú»).
const pobre = planPersonal(3000, BASE, PRIOR);
assert.ok(pobre.pla[0].nivell >= 1, 'el primer de la prioritat entra');
assert.equal(pobre.pla[pobre.pla.length - 1].nivell, 0, 'l\'últim es queda sense');

// Un tipus exclòs (p. ex. el psicòleg en divisions baixes) no consumix flux.
const senseP = planPersonal(30000, BASE, PRIOR, { admet: (t) => t !== 'psicoleg' });
assert.equal(senseP.pla.find((x) => x.tipus === 'psicoleg').exclos, true);
assert.equal(senseP.pla.find((x) => x.tipus === 'psicoleg').cost, 0);

// ── Renovar: l'ÚNICA decisió reversible (acomiadar no existix) ──
assert.deepEqual(decisioRenovacio(3, 5000, BASE), { accio: 'renova', nivell: 3 },
  'si el flux encara el paga, es renova');
assert.deepEqual(decisioRenovacio(4, 5000, BASE), { accio: 'renova_al_nivell', nivell: 3 },
  'si no el paga, es baixa al nivell més alt que sí');
assert.deepEqual(decisioRenovacio(2, 100, BASE), { accio: 'no_renoves', nivell: null },
  'si no arriba a cap nivell, no es renova');

console.log('OK — personal v3: cost per nivell, prioritat fixa i renovació');

// ── EL PRESSUPOST VA EN SETMANES, com l'escala ────────────────────────────────────────
// REGRESSIÓ REAL: `flux_lliure` es calcula en unitats del PERÍODE (2 setmanes) i l'escala de
// personal va en €/SETMANA. Comparar-los donava al planificador el DOBLE de pressupost, i
// proposava un assistent de nivell 5 — 16.320 €/setmana, més que tot el personal junt.
{
  const PRIOR = [{ tipus: 'assistent', quants: 2 }, { tipus: 'entrenador', base: 1250 },
    { tipus: 'metge' }, { tipus: 'psicoleg' }];
  const setmanal = 9610;                 // el que el flux sosté DE VERES cada setmana
  const { pla } = planPersonal(setmanal, 1020, PRIOR);
  const cost = pla.reduce((a, x) => a + x.cost, 0);
  assert.ok(cost <= setmanal, `el pla no pot passar-se del pressupost (${cost} > ${setmanal})`);
  // Amb el doble (el bug) el primer assistent arribava al 5; amb el pressupost bo, no.
  assert.ok(pla[0].nivell < 5, 'amb el pressupost setmanal, cap plaça arriba al nivell 5');
  const dolent = planPersonal(setmanal * 2, 1020, PRIOR);
  assert.equal(dolent.pla[0].nivell, 5, 'i amb el doble sí — que és el que passava');
}
console.log('OK — el pressupost de personal va en setmanes, com la seua escala');

// ── EL CONTRACTE ÉS UNA DATA, NO UN COMPTE ────────────────────────────────────────────
// REGRESSIÓ REAL: `setmanes_contracte` era un COMPTE declarat que ningú decrementava. Els
// quatre membres de Miquel deien «16» des del dia que els va declarar, o siga que el venciment
// no arribava MAI i l'avís de renovació no podia disparar-se. Una data no es podrix.
{
  assert.equal(setmanesRestants('2026-11-04', '2026-10-26'), 2, 'nou dies → dues setmanes');
  assert.equal(setmanesRestants('2026-10-26', '2026-10-26'), 0, 'hui mateix → venç');
  assert.equal(setmanesRestants('2026-10-19', '2026-10-26'), -1, 'ja passat → negatiu, no zero');
  assert.equal(setmanesRestants(null, '2026-10-26'), null, 'sense data no se suposa res');

  // LA PROPIETAT: el mateix contracte, mirat més tard, queda MENYS. Amb un compte declarat
  // això no passava, i eixe era exactament el bug.
  const fi = '2026-11-04';
  let previ = Infinity;
  for (const hui of ['2026-09-01', '2026-10-01', '2026-10-26', '2026-11-04']) {
    const r = setmanesRestants(fi, hui);
    assert.ok(r < previ, `passant el temps, el contracte ha d'acostar-se al venciment (${hui})`);
    previ = r;
  }
}
console.log('OK — el contracte venç de veres: les setmanes es deriven de la data');
