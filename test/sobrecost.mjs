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

// V2 DEL MOTOR: la vara ja no és «el preu d'una habilitat al nivell objectiu», és el SOU DEL
// PERFIL que el pressupost del lloc paga. Amb la vara vella, el sistema triava un jugador per
// tres habilitats i després li retreia el sou de les dues secundàries — dues vares oposades
// sobre el mateix jugador.

// El que pagues de MÉS del que el lloc mereix.
assert.equal(sobrecost({ sou: 900 }, 330), 570, '900 − 330');
assert.equal(sobrecost({ sou: 300 }, 330), 0,
  'qui cobra el que toca no té sobrecost: MAX(0; …), no un número negatiu');

// SENSE OBJECTIU no hi ha vara, i sense vara no s'inventa cap número: null, no zero. Un zero
// diria «no cobra de més», i el que passa és que no ho sabem (invariant 18).
assert.equal(sobrecost({ sou: 900 }, null), null, 'sense objectiu, null');
assert.equal(sobrecost(null, 330), null, 'sense jugador, null');

console.log('OK — sobrecost: el que pagues de més, i null quan no hi ha vara');
