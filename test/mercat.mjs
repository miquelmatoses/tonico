// Tonico — calendari de mercat (Fase 6.1). node test/mercat.mjs
import assert from 'node:assert/strict';
import { modificadorMercat, propRecuperacio, situacioMercat } from '../lib/mercat.js';

const cal = [
  { setmana_temporada: 1, fase: 'recuperacio', modificador_valor: 0.10 },
  { setmana_temporada: 8, fase: 'demanda_plena', modificador_valor: 0.0 },
  { setmana_temporada: 16, fase: 'depressio_final', modificador_valor: -0.15 },
];

assert.deepEqual(modificadorMercat(cal, 16), { fase: 'depressio_final', modificador: -0.15 });
assert.equal(modificadorMercat(cal, 8).modificador, 0);

// A la setmana 16, la recuperació (setmana 1) està a 1 setmana vista (cicle)
assert.deepEqual(propRecuperacio(cal, 16, 16), { dins: 1, setmana: 1 });

const s = situacioMercat(cal, 16, 16, 4);
assert.equal(s.depressio, true);
assert.equal(s.finsRecuperacio, 1);
assert.equal(s.setmanaRecuperacio, 1);

console.log('OK — mercat: fase, modificador i propera recuperació');
