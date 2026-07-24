// Tonico — motor de valor de plaça (doctrina v3.2): classifica A+B/A/B/cap creuant els
// dos entrenaments amb la taula config. GENERALITAT: dos pipelines diferents.
// node test/valor_placa.mjs
import assert from 'node:assert/strict';
import { valorPlaces, rangValor } from '../lib/valor_placa.js';

const taula = { porteria: ['porter'], defensa: ['defensa'], creativitat: ['mc'],
  passades: ['mc', 'extrem', 'davanter'], extrem: ['extrem'], anotacio: ['davanter'], pilota_aturada: ['porter'] };
const buckets = ['porter', 'defensa', 'mc', 'extrem', 'davanter'];

// ── Pipeline 1: creativitat (A) + passades (B) ──
const v1 = valorPlaces('creativitat', 'passades', taula, buckets);
assert.equal(v1.mc, 'ab', 'MC: creativitat(A) + passades(B) → A+B');
assert.equal(v1.extrem, 'b', 'extrem: només passades(B)');
assert.equal(v1.davanter, 'b', 'davanter: només passades(B)');
assert.equal(v1.porter, 'cap', 'porter: cap dels dos');
assert.equal(v1.defensa, 'cap', 'defensa: cap dels dos');

// ── Pipeline 2 (generalitat): porteria (A) + anotació (B) → classificació DIFERENT ──
const v2 = valorPlaces('porteria', 'anotacio', taula, buckets);
assert.equal(v2.porter, 'a', 'porter: només porteria(A)');
assert.equal(v2.davanter, 'b', 'davanter: només anotació(B)');
assert.equal(v2.mc, 'cap', 'mc: cap dels dos entrena en este pipeline');
assert.equal(v2.extrem, 'cap');

// Ordre de valor: A+B > A > B > cap.
assert.ok(rangValor('ab') > rangValor('a') && rangValor('a') > rangValor('b') && rangValor('b') > rangValor('cap'));

console.log('OK — valor de plaça: classificació general per a dos pipelines diferents');
