// Tonico — PREU I DESTÍ (contracte v3, PAS 7). Una sola fórmula de preu per a tot el
// sistema, i la depressió profunda en FRACCIÓ. node test/preu.mjs
import assert from 'node:assert/strict';
import { estimacioComparables, calibrat, factorHabilitat, preuEsperat, setmanesVenda,
  valorNet, urgent, motiuVenda, ordreVenda, desti } from '../lib/preu.js';

const j = { jugador_id: 1, posicio: 'MC', creativitat: 8, sou: 1000 };
const comps = [{ posicio: 'MC', preu: 100000 }, { posicio: 'MC', preu: 120000 }, { posicio: 'DC', preu: 50000 }];

// ── calibrat: cal un mínim de mostres declarat, no «una i ja» ──
assert.equal(calibrat(comps, 0, 3), true, '3 comparables amb preu = 3 mostres');
assert.equal(calibrat(comps.slice(0, 2), 0, 3), false, 'dues mostres no calibren');
assert.equal(calibrat(comps.slice(0, 2), 1, 3), true, 'una venda real compta com a mostra');

// ── estimació per comparables: mediana de la mateixa posició ──
assert.equal(estimacioComparables(comps, j), 110000, 'mediana dels dos MC');
assert.equal(estimacioComparables([{ posicio: 'DC', preu: 50000 }], j), 50000, 'sense la posició, tots');
assert.equal(estimacioComparables([], j), null);

// ── preu_esperat: LA fórmula. Calibrat → comparables; si no → base per divisió ──
const BASE = { VII: 2000, VI: 8000, I: 1200000 };
let r = preuEsperat(j, { comparables: comps, min_mostres: 3, divisio: 'VII', base_preu_divisio: BASE, habilitat: 'creativitat' });
assert.equal(r.preu, 110000); assert.equal(r.calibrat, true); assert.equal(r.base, 'comparables');
r = preuEsperat(j, { comparables: [], min_mostres: 3, divisio: 'VII', base_preu_divisio: BASE, habilitat: 'creativitat', nivell_referencia: 8 });
assert.equal(r.calibrat, false); assert.equal(r.base, 'divisio');
assert.equal(r.preu, 2000, 'sense mostra: base de la divisió × factor 1 (8/8)');
r = preuEsperat({ ...j, creativitat: 12 }, { comparables: [], divisio: 'VII', base_preu_divisio: BASE, habilitat: 'creativitat', nivell_referencia: 8 });
assert.equal(r.preu, 3000, 'millor que la referència (12/8=1,5) → val més');
// Sense divisió declarada no s'inventa cap preu.
assert.deepEqual(preuEsperat(j, { comparables: [], base_preu_divisio: BASE }), { preu: null, calibrat: false, base: null });
assert.equal(factorHabilitat(j, 'creativitat', null), 1, 'sense referència, factor 1');

// ── valor_net i setmanes_venda ──
assert.equal(setmanesVenda({ llistat: false }, null), 1, 'no llistat → una setmana');
assert.equal(setmanesVenda({ llistat: true }, 14), 2, 'llistat: el que queda fins al tancament');
assert.equal(valorNet(110000, j, { cost_llistat: 1000, setmanes_venda: 2 }), 110000 - 1000 - 2000);
assert.equal(valorNet(null, j), null);

// ── urgent: NOMÉS l'aniversari (la clàusula de porter era del model retirat) ──
assert.equal(urgent(10, 14), true);
assert.equal(urgent(20, 14), false);
assert.equal(urgent(null, 14), false, 'sense dada no s\'inventa urgència');

// ── motiu_venda ──
assert.equal(motiuVenda(j, { esRotatiu: true, temporada: 86, horitzo_eixida: 85 }), 'pic_de_valor');
assert.equal(motiuVenda(j, { sobrecost: 500 }), 'sou_desproporcionat');
assert.equal(motiuVenda(j, { enVenda: true }), 'sobrant');
assert.equal(motiuVenda(j, {}), null, 'un retingut sense sobrecost no té motiu de venda');

// ── ordre_venda: primer el sou desproporcionat, després el que més val ──
assert.deepEqual(ordreVenda([
  { id: 'a', sobrecost: 0, preu_esperat: 90000 },
  { id: 'b', sobrecost: 700, preu_esperat: 10000 },
  { id: 'c', sobrecost: 0, preu_esperat: 95000 },
]).map((x) => x.id), ['b', 'c', 'a']);

// ── destí: les quatre branques, i la depressió profunda EN FRACCIÓ ──
assert.equal(desti(j, { lesionat: true }).accio, 'agenda_llistar_en_recuperar');
assert.equal(desti(j, { calibrat: true, valor_net: -500, llindar_despatx: 0 }).accio, 'despatxa');
assert.equal(desti(j, { calibrat: false, valor_net: -500 }).accio, 'llista_hui',
  'sense calibrar mai es proposa despatxar (invariant 7)');
// El bug d'unitats: amb −20 la branca no s'activava mai; amb −0,20 sí.
assert.equal(desti(j, { modificador_tancament: -0.15, depressio_profunda: -20 }).accio, 'llista_hui',
  'en enters, la depressió profunda era inassolible');
assert.equal(desti(j, { modificador_tancament: -0.25, depressio_profunda: -0.20 }).accio, 'agenda_llistar',
  'en fracció, la depressió profunda ajorna');
assert.equal(desti(j, { modificador_tancament: -0.25, depressio_profunda: -0.20, urgent: true }).accio, 'llista_hui',
  'un urgent no espera la recuperació del mercat');

console.log('OK — preu i destí: una sola fórmula de preu i la depressió en fracció');
