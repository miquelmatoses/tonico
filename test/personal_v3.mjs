// Tonico — PERSONAL del v3 (PAS 11): bucle de FLUX, prioritat fixa, sense acomiadar.
// node test/personal_v3.mjs
import assert from 'node:assert/strict';
import { costFlux, nivellPagable, planPersonal, decisioRenovacio, diesRestants,
  placesAdmeses, sostrePersonal } from '../lib/personal_v3.js';

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
// ── planPersonal: AMPLADA ABANS QUE PROFUNDITAT, amb les quotes del joc ──────────────
// Substituïx el repartiment VORAÇ (el primer tipus s'enduia el màxim i els últims es
// quedaven a zero). L'efecte és lineal i el cost exponencial: 4 places a nivell 1 donen 4,0
// punts i una plaça a nivell 3 en dona 0,6 — mateix diner, sis vegades menys efecte.
const PRIOR = [{ tipus: 'assistent', quants: 2 }, { tipus: 'metge' }, { tipus: 'psicoleg' },
  { tipus: 'forma' }, { tipus: 'tactic' }, { tipus: 'financer' }];
const QUOTES = { total: 4, per_tipus: { assistent: 2, metge: 1, psicoleg: 1, forma: 1, tactic: 1, financer: 1 } };

// Les QUOTES del joc: 4 places en total i 2 assistents com a màxim, per prioritat.
const places = placesAdmeses(PRIOR, QUOTES);
assert.deepEqual(places.map((p) => p.tipus), ['assistent', 'assistent', 'metge', 'psicoleg'],
  'quatre places, en l\'orde de la prioritat, i la resta de tipus no hi caben');

// El nivell és UNIFORME i el més alt que el pressupost pague per a TOTES les places.
const r = planPersonal(8564, 1020, PRIOR, { quotes: QUOTES });
assert.equal(r.nivell, 2, '8.564 € paguen 4 × 2.040 = 8.160, però no 4 × 4.080');
assert.ok(r.pla.every((x) => x.nivell === 2), 'totes al mateix nivell: cap plaça a zero');
assert.equal(r.pla.reduce((a, x) => a + x.cost, 0), 8160);

// LA PROPIETAT que el voraç violava: cap plaça es queda a 0 mentre una altra puja.
for (const press of [4080, 8160, 16320, 32640, 65280]) {
  const x = planPersonal(press, 1020, PRIOR, { quotes: QUOTES });
  const nivells = new Set(x.pla.map((p) => p.nivell));
  assert.equal(nivells.size, 1, `amb ${press} € totes les places han d'anar al mateix nivell`);
  assert.ok(x.pla.reduce((a, p) => a + p.cost, 0) <= press, 'i mai passar-se del pressupost');
}

// El sostre: el que el personal pot absorbir. Passat això, el sobrant és per als jugadors.
assert.equal(sostrePersonal(places, 1020), 4 * 16320, '4 places al nivell màxim');

assert.deepEqual(decisioRenovacio(3, 5000, BASE), { accio: 'renova', nivell: 3 },
  'si el flux encara el paga, es renova');
assert.deepEqual(decisioRenovacio(4, 5000, BASE), { accio: 'renova_al_nivell', nivell: 3 },
  'si no el paga, es baixa al nivell més alt que sí');
assert.deepEqual(decisioRenovacio(2, 100, BASE), { accio: 'no_renoves', nivell: null },
  'si no arriba a cap nivell, no es renova');

console.log('OK — personal v3: cost per nivell, prioritat fixa i renovació');


// ── EL CONTRACTE ÉS UNA DATA, NO UN COMPTE, I ES MIRA EN DIES ─────────────────────────
// REGRESSIÓ REAL 1: `setmanes_contracte` era un COMPTE declarat que ningú decrementava. Els
// quatre membres de Miquel deien «16» des del dia que els va declarar, o siga que el venciment
// no arribava MAI i l'avís de renovació no podia disparar-se. Una data no es podrix.
// REGRESSIÓ REAL 2: es derivaven SETMANES i es comparaven contra un pom de DIES
// (`dies_avis_caducitat`, que a més no existia a la base). Amb la unitat mal posada la
// frontera del venciment no volia dir res: 13 dies donaven avís i 20 no, per accident.
{
  assert.equal(diesRestants('2026-11-04', '2026-10-26'), 9, 'nou dies són nou dies');
  assert.equal(diesRestants('2026-10-26', '2026-10-26'), 0, 'hui mateix → venç');
  assert.equal(diesRestants('2026-10-19', '2026-10-26'), -7, 'ja passat → negatiu, no zero');
  assert.equal(diesRestants(null, '2026-10-26'), null, 'sense data no se suposa res');

  // LA PROPIETAT: el mateix contracte, mirat més tard, queda MENYS. Amb un compte declarat
  // això no passava, i eixe era exactament el bug.
  const fi = '2026-11-04';
  let previ = Infinity;
  for (const hui of ['2026-09-01', '2026-10-01', '2026-10-26', '2026-11-04']) {
    const r = diesRestants(fi, hui);
    assert.ok(r < previ, `passant el temps, el contracte ha d'acostar-se al venciment (${hui})`);
    previ = r;
  }
}
console.log('OK — el contracte venç de veres: els dies es deriven de la data');
