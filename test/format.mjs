// Tonico — formatadors únics (polit #10.7). node test/format.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { milers, diners, decimal, percent, edat, notes, esLesionat, duradaLesio, signat} from '../public/format.js';

const FIN = ' ';

// ── Moneda: milers amb espai fi + € ──
assert.equal(diners(131978), `131${FIN}978${FIN}€`);
assert.equal(diners(0), `0${FIN}€`);
assert.equal(diners(-2400), `−2${FIN}400${FIN}€`, 'negatiu amb menys real');
assert.equal(diners(null), '—');
assert.equal(milers(1000000), `1${FIN}000${FIN}000`);
assert.equal(milers(999), '999');

// ── Decimal amb coma, percentatge, edat HT ──
assert.equal(decimal(3.5), '3,5');
assert.equal(decimal(16), '16,0');
assert.equal(percent(72), '72%');
assert.equal(edat(17, 34), `17a${FIN}34d`);
assert.equal(edat(23, null), '23a');

// ── Nota al peu: qualificador repetit → un asterisc + llegenda única ──
{
  const n = notes();
  const a = n.marca('estimació — sense comparables');
  const b = n.marca('estimació — sense comparables');
  assert.equal(a, '*'); assert.equal(b, '*', 'el mateix qualificador → la mateixa marca');
  assert.deepEqual(n.llegendes(), ['* estimació — sense comparables'], 'una sola llegenda');
  const c = n.marca('prima d\'especialitat');
  assert.equal(c, '**', 'segon qualificador → doble asterisc');
  assert.equal(n.llegendes().length, 2);
}

// ── Lesionat: buit/0 = sa; qualsevol altre valor = lesionat ──
assert.equal(esLesionat(''), false); assert.equal(esLesionat(null), false); assert.equal(esLesionat('0'), false);
assert.equal(esLesionat('1'), true); assert.equal(esLesionat(2), true);
// Durada N (setmanes) o null si no numèrica/sa (1c).
assert.equal(duradaLesio('3'), 3); assert.equal(duradaLesio(2), 2);
assert.equal(duradaLesio(''), null); assert.equal(duradaLesio('0'), null); assert.equal(duradaLesio(null), null);

// ── ESCANEIG: cap secció formata pel seu compte (7e) ──
const sec = readFileSync(new URL('../public/seccions.js', import.meta.url), 'utf8');
const prohibits = [
  [/\.toFixed\(/, 'toFixed cru (usa decimal/diners)'],
  [/\.toLocaleString\(/, 'toLocaleString cru'],
  [/\$\{[^}]*edat_anys[^}]*\}a\b/, 'edat formatada a mà (usa edat())'],
];
for (const [re, msg] of prohibits) assert.ok(!re.test(sec), `seccions.js: ${msg}`);

// Una DIFERÈNCIA es llig amb el signe davant també quan és positiva: «+2» diu «li sobren dos»
// i «2» tot sol no diu si sobra o falta. El zero va sense signe, i el negatiu amb menys real.
assert.equal(signat(3), '+3');
assert.equal(signat(0), '0', 'arribar just no és ni sobrar ni faltar');
assert.equal(signat(-1), '\u22121', 'menys real (U+2212), no guionet');
assert.equal(signat(null), '—', 'sense diferència no se n\'inventa cap');

console.log('OK — format: diners/decimal/percent/edat, nota al peu i escaneig de seccions net');
