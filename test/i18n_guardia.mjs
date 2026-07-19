// Tonico — GUARDIÀ i18n (polit #2.6): cap clau de missatge que produïsquen les
// regles o la config pot quedar sense la seua entrada al catàleg (el bug del
// «alerta.junta_porter» cru). node test/i18n_guardia.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cataleg = JSON.parse(readFileSync(new URL('../public/i18n/ca-valencia.json', import.meta.url), 'utf8'));
const te = (k) => Object.prototype.hasOwnProperty.call(cataleg, k);

// 1. Totes les claus 'alerta.*' literals de les regles existixen al catàleg.
const regles = readFileSync(new URL('../lib/regles.js', import.meta.url), 'utf8');
const clausAlerta = [...regles.matchAll(/'(alerta\.[a-z0-9_]+)'/g)].map((m) => m[1]);
assert.ok(clausAlerta.length >= 10, 'troba les claus d\'alerta');
for (const k of new Set(clausAlerta)) assert.ok(te(k), `falta la clau i18n: ${k}`);

// 2. Les categories i motius que s'interpolen dinàmicament ('categoria.'+x) tenen
//    entrada per a cada valor possible.
for (const c of ['entrenable', 'venda', 'alliberament', 'farciment', 'experiencia', 'futur_entrenador', 'nucli_competitiu']) assert.ok(te('categoria.' + c), `falta categoria.${c}`);
for (const m of ['mai', 'potencial', 'compost', 'per_davall', 'fluix', 'sense_dades', 'lesionat', 'sancionat', 'vetat', 'banqueta']) assert.ok(te('motiu.' + m), `falta motiu.${m}`);

// 3. Cap valor del catàleg conté una clau sense resoldre (patró namespace.clau nu).
for (const [k, v] of Object.entries(cataleg)) {
  assert.ok(!/\b(alerta|categoria|motiu)\.[a-z_]+\b/.test(v), `el text de ${k} conté una clau crua: ${v}`);
}

console.log('OK — guardià i18n: totes les claus d\'alerta/categoria/motiu resolen');
