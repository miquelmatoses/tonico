// Tonico — fornades per horitzó d'eixida. node test/fornades.mjs
import assert from 'node:assert/strict';
import { proposaFornades, temporadaEixida, temporadaEntrada } from '../lib/fornades.js';

const ancora = { data: '2026-07-25', temporada: 83, anyDies: 112 };

// Horitzó d'eixida: es ven en arribar a l'edat de pic (mai abans de ref+1)
assert.equal(temporadaEixida(21, 83, 20), 84);   // ja passat el pic → ix la pròxima
assert.equal(temporadaEixida(20, 83, 20), 84);
assert.equal(temporadaEixida(19, 83, 20), 84);
assert.equal(temporadaEixida(17, 83, 20), 86);   // 3 temporades de marge
assert.equal(temporadaEntrada(0, '2026-07-18', ancora), 82);

// Proposta: mateixa entrada, dos horitzons → A1 (ix abans) i A2
const ents = [
  { id_hattrick: 1, nom: 'Vell', edat_anys: 21, setmanes_club: 0 },
  { id_hattrick: 2, nom: 'Mig', edat_anys: 19, setmanes_club: 0 },
  { id_hattrick: 3, nom: 'Jove', edat_anys: 17, setmanes_club: 0 },
];
const f = proposaFornades(ents, '2026-07-18', ancora, 83, 20);
assert.equal(f.length, 2, 'dos horitzons d\'eixida');
const a1 = f.find((x) => x.lletra === 'A1');
const a2 = f.find((x) => x.lletra === 'A2');
assert.equal(a1.temporada_eixida_prevista, 84);
assert.deepEqual(a1.jugadors.sort(), [1, 2]);      // 19 i 21 → T84
assert.equal(a2.temporada_eixida_prevista, 86);
assert.deepEqual(a2.jugadors, [3]);                // 17 → T86

console.log('OK — fornades: horitzó d\'eixida, generació d\'entrada + rang d\'eixida (A1/A2)');
