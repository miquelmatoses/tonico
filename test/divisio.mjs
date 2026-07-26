// Tonico — DIVISIÓ: un únic format intern, conversió en els dos sentits. Sense açò, una
// taula del joc (estimació de preu, coeficients de patrocini) falla EN SILENCI quan
// l'usuari escriu el número àrab que veu al joc. node test/divisio.mjs
import assert from 'node:assert/strict';
import { normalitzaDivisio, divisioArab, mostraDivisio, DIVISIONS } from '../lib/divisio.js';

// Àrab → romà (l'usuari escriu «7», les taules van en romà)
for (let n = 1; n <= 8; n++) {
  assert.equal(normalitzaDivisio(n), DIVISIONS[n - 1], `${n} → ${DIVISIONS[n - 1]}`);
  assert.equal(normalitzaDivisio(String(n)), DIVISIONS[n - 1], `"${n}" → ${DIVISIONS[n - 1]}`);
}
// Romà → romà (idempotent, insensible a caixa i espais)
assert.equal(normalitzaDivisio('VII'), 'VII');
assert.equal(normalitzaDivisio('vii'), 'VII');
assert.equal(normalitzaDivisio('  Vii  '), 'VII');
assert.equal(normalitzaDivisio('div. VII'), 'VII', 'prefix habitual de l\'usuari');

// Romà → àrab (l'altre sentit)
assert.equal(divisioArab('VII'), 7);
assert.equal(divisioArab('7'), 7);
assert.equal(divisioArab('I'), 1);

// Anada i tornada, per a totes les divisions
for (const rom of DIVISIONS) {
  assert.equal(normalitzaDivisio(divisioArab(rom)), rom, `anada i tornada de ${rom}`);
}

// El que no és divisió NO se suposa: torna null i qui el consumix l'ha de demanar.
for (const dolent of [null, undefined, '', '   ', '0', '9', 'XIV', 'primera', {}]) {
  assert.equal(normalitzaDivisio(dolent), null, `«${String(dolent)}» no és divisió`);
}
assert.equal(divisioArab('9'), null);
assert.equal(mostraDivisio('7'), 'VII', 'la vista formata, no calcula');
assert.equal(mostraDivisio(null), '', 'sense divisió, la vista no inventa res');

console.log('OK — divisió: format intern únic i conversió en els dos sentits');
