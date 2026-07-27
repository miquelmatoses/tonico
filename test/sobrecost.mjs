// Tonico — EL SOBRECOST (contracte v3, PAS 5). node test/sobrecost.mjs
//
// Este fitxer era `mancanca.mjs` i provava tot el PAS 5 vell: `nivell_actual`, `mancança`,
// `excés`, `prioritat` i l'agregació per prioritat. D'eixe pas només queda el sobrecost:
//
//   · la DISTÀNCIA d'un lloc a l'objectiu ja la calcula l'assignació (`diferencia`) i
//     l'ordena `necessitats` en valor absolut — vore test/fitxatges.mjs
//   · l'`excés` preguntava el mateix que el sobrecost, però en nivells en compte d'euros, i
//     no el mirava cap decisió
//   · `mancança × pes` era un número que no es pintava enlloc
import assert from 'node:assert/strict';
import { sobrecost } from '../lib/mancanca.js';

const ts = { creativitat: { 1: 250, 3: 330, 9: 8610 } };

// El que pagues de MÉS del que el lloc mereix.
assert.equal(sobrecost({ sou: 900 }, 'creativitat', 3, ts), 570, '900 − 330');
assert.equal(sobrecost({ sou: 300 }, 'creativitat', 3, ts), 0,
  'qui cobra el que toca no té sobrecost: MAX(0; …), no un número negatiu');

// SENSE OBJECTIU no hi ha vara, i sense vara no s'inventa cap número: null, no zero. Un zero
// diria «no cobra de més», i el que passa és que no ho sabem (invariant 18).
assert.equal(sobrecost({ sou: 900 }, 'creativitat', null, ts), null, 'sense objectiu, null');
assert.equal(sobrecost(null, 'creativitat', 3, ts), null, 'sense jugador, null');
assert.equal(sobrecost({ sou: 900 }, 'porteria', 3, ts), null,
  'sense escala per a eixa habilitat, null: la taula de la guia és qui mana');

// Un nivell que la taula no llista val 0: no es paga res per un nivell que no existix.
assert.equal(sobrecost({ sou: 900 }, 'creativitat', 7, ts), 900, 'nivell fora de taula → 0 de base');

console.log('OK — sobrecost: el que pagues de més, i null quan no hi ha vara');
