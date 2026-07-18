// Tonico — proposta de fornades per cohort d'entrada. node test/fornades.mjs
import assert from 'node:assert/strict';
import { proposaFornades } from '../lib/fornades.js';

const ancora = { data: '2026-07-25', temporada: 83, anyDies: 112 };
const js = [
  { id_hattrick: 1, nom: 'Nou', setmanes_club: 0, edat_anys: 17 },      // entra T83
  { id_hattrick: 2, nom: 'Veterà', setmanes_club: 20, edat_anys: 25 },  // entra ~T81
];
const f = proposaFornades(js, '2026-07-25', ancora);
assert.equal(f.length, 2, 'dos cohorts d\'entrada');
assert.equal(f[0].lletra, 'A'); assert.equal(f[0].temporada_entrada, 81);   // A = la més antiga
assert.deepEqual(f[0].jugadors, [2]);
assert.equal(f[1].lletra, 'B'); assert.deepEqual(f[1].jugadors, [1]);

console.log('OK — fornades: cohorts per temporada d\'entrada, lletres per antiguitat');
