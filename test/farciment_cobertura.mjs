// Tonico — FARCIMENT = COBERTURA MÍNIMA (LEAN). El cos que els dos onzes necessiten va a
// FARCIMENT (els més barats), no a venda; només el sobrant REAL cau a venda; els porters
// queden protegits. node test/farciment_cobertura.mjs
import assert from 'node:assert/strict';
import { farcimentDerivat } from '../lib/cobertura.js';
import { classifica } from '../lib/classificador.js';

// ── 1. farcimentDerivat: places = slots NO entrenables per posició; porteria = porters_minims ──
const slots = [
  { bucket: 'porter', entrena: false }, { bucket: 'defensa', entrena: false }, { bucket: 'defensa', entrena: false }, { bucket: 'defensa', entrena: false },
  { bucket: 'mc', entrena: true }, { bucket: 'mc', entrena: true }, { bucket: 'mc', entrena: true }, { bucket: 'extrem', entrena: true }, { bucket: 'extrem', entrena: true },
  { bucket: 'davanter', entrena: false }, { bucket: 'davanter', entrena: false },
];
const fb = { porter: ['PO'], DC: ['DC'], davanter: ['DV'] };
const ba = { porter: ['PO'], defensa: ['DC'], mc: ['MC'], extrem: ['ED', 'EE'], davanter: ['DV'] };
assert.deepEqual(farcimentDerivat(slots, fb, ba, { porters_minims: 2, posicio_porter: 'PO' }),
  { porter: { n: 2 }, DC: { n: 3 }, davanter: { n: 2 } }, 'porteria=porters_minims; camp=slots no entrenables');
// Entrenament defensa (els DC entrenen) → ja no calen de cos: el farciment de camp cau.
const slotsDef = slots.map((s) => ({ ...s, entrena: s.bucket === 'defensa' }));
assert.deepEqual(farcimentDerivat(slotsDef, fb, ba, { porters_minims: 2, posicio_porter: 'PO' }),
  { porter: { n: 2 }, davanter: { n: 2 } }, 'si els DC entrenen, no fan de cos');

// ── 2. El classificador amb farciment derivat: cos barat → farciment, sobrant → venda ──
const config = {
  categories: [
    { categoria: 'core', ordre: 1, aforament: 2, parametres: { puntuacio: { termes: [{ camp: 'creativitat', pes: 1 }] } } },
    { categoria: 'cos', ordre: 2, parametres: {
      buckets: fb,
      places: farcimentDerivat(slots, fb, ba, { porters_minims: 2, posicio_porter: 'PO' }),
      resta_ocupacio: true, resta_ocupacio_exclou: ['core'], cobertura_minima: true,
      puntuacio: { termes: [{ camp: 'sou', pes: -1 }] } } },   // el més BARAT fa de cos
  ],
  params: { categoria_terminal: 'venda', buckets_posicio: fb },
};
const jug = (id, pos, sou, cre) => ({ id_hattrick: id, nom: 'J' + id, posicio: pos, sou, creativitat: cre, defensa: 5, porteria: 5, anotacio: 5 });
const squad = [
  jug(1, 'MC', 5000, 9), jug(2, 'MC', 5000, 8),                          // 2 entrenables (millor creativitat)
  jug(10, 'PO', 500, 1), jug(11, 'PO', 900, 1), jug(12, 'PO', 2000, 1),  // 3 porters: 2 barats → cos, el car → venda
  jug(20, 'DC', 400, 1), jug(21, 'DC', 600, 1), jug(22, 'DC', 700, 1), jug(23, 'DC', 8000, 3),  // DC n=3: 3 barats cos, el car → venda
  jug(30, 'DV', 300, 1), jug(31, 'DV', 500, 1), jug(32, 'DV', 9000, 4),                          // DV n=2: 2 barats cos, el car → venda
];
const res = classifica(squad, config, {});
const cat = (id) => res.find((r) => r.id_hattrick === id).categoria;
// Porters: els 2 MÉS BARATS a farciment, el car a venda.
assert.equal(cat(10), 'cos'); assert.equal(cat(11), 'cos');
assert.equal(cat(12), 'venda', 'el porter MÉS CAR (sobrant) → venda, no un cos');
// El porter car mai es queda com a cos: la protecció són 2, i són els barats.
const portersFarc = [10, 11, 12].filter((id) => cat(id) === 'cos');
assert.equal(portersFarc.length, 2, 'exactament 2 porters de cos (porters_minims), cap reserva');
// Camp: els cars (valuosos) cauen a venda; els barats fan de cos.
assert.equal(cat(23), 'venda', 'el DC valuós (car) → venda'); assert.equal(cat(32), 'venda', 'el DV valuós → venda');
assert.equal(cat(20), 'cos'); assert.equal(cat(30), 'cos');   // els barats, cos

console.log('OK — farciment = cobertura mínima: cos barat retingut, porters protegits, sobrant a venda');
