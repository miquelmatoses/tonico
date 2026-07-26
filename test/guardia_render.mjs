// Tonico — G2 RENDER-PUR (invariant 12 del contracte). Els fitxers de presentació no
// han de contindre lògica de domini: cap llinda numèrica ni aritmètica/condicional sobre
// variables de domini (urgència, pct, preu, edat, nivell, sou, caixa…). Han d'interpolar
// valors JA calculats per l'avaluador.
//
// ESTAT: guardià de RATCHET. Detecta els smells clars HUI (llindes numèriques en
// comparació + aritmètica sobre vars de domini) i els fixa en un BASELINE de deute
// conegut (test/guardia_render_base.json). Falla si apareix un smell NOU. El baseline es
// BUIDA a mesura que la reconstrucció (L1–L11 del DIFF) mou la lògica a l'avaluador; mai
// creix. Regenera'l a consciència amb:  ACTUALITZA_BASELINE=1 node test/guardia_render.mjs
// node test/guardia_render.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..');
const FITXERS = ['public/seccions.js'];        // superfície de presentació (format.js/comu.js = ajudes pures)
const BASE = join(arrel, 'test/guardia_render_base.json');

// Variables de domini: si apareixen amb un operador aritmètic/comparatiu, és lògica.
const DOMINI = ['urgencia', 'pct', 'preu', 'edat', 'nivell', 'sou', 'caixa', 'valor',
  'dies', 'marge', 'objectiu', 'puntuacio', 'porteria', 'creativitat', 'exp', 'falten', 'saldo'];
const reLlinda = /[<>]=?\s*-?\d|-?\d+(?:\.\d+)?\s*[<>]=?/;          // comparació amb literal numèric
const reDominiOp = new RegExp(`\\b(${DOMINI.join('|')})\\w*\\s*[<>+\\-*/]=?\\s*[\\w.]|[\\w.]\\s*[<>+\\-*/]=?\\s*\\b(${DOMINI.join('|')})`);

function escaneja(rel) {
  const violacions = [];
  const codi = readFileSync(join(arrel, rel), 'utf8').split('\n');
  codi.forEach((linia, i) => {
    const net = linia.replace(/\/\/.*$/, '').trim();                // fora comentaris de línia
    if (!net) return;
    const teLlinda = reLlinda.test(net);
    const teDominiOp = reDominiOp.test(net);
    if (teLlinda || teDominiOp) violacions.push({ fitxer: rel, linia: i + 1, text: net });
  });
  return violacions;
}

const actuals = FITXERS.flatMap(escaneja);
const sig = (v) => `${v.fitxer}:${v.text}`;                        // signatura estable a moviments de línia

if (process.env.ACTUALITZA_BASELINE) {
  writeFileSync(BASE, JSON.stringify({ _nota: 'Deute conegut de render-pur (G2). Es BUIDA amb la reconstrucció; mai creix.', violacions: actuals }, null, 2) + '\n');
  console.log(`baseline actualitzat: ${actuals.length} violacions conegudes`);
  process.exit(0);
}

assert.ok(existsSync(BASE), 'falta test/guardia_render_base.json — genera\'l amb ACTUALITZA_BASELINE=1');
const baseline = JSON.parse(readFileSync(BASE, 'utf8'));
const conegudes = new Set(baseline.violacions.map(sig));

const noves = actuals.filter((v) => !conegudes.has(sig(v)));
assert.equal(noves.length, 0,
  `G2 render-pur: ${noves.length} smell(s) de domini NOU(s) en presentació:\n` +
  noves.map((v) => `  ${v.fitxer}:${v.linia}  ${v.text}`).join('\n') +
  `\n→ mou la lògica a l'avaluador (no a la vista). Si és fals positiu, justifica'l al baseline.`);

// Ratchet: si el codi ha netejat violacions, avisa que cal reduir el baseline (no bloqueja).
const resoltes = [...conegudes].filter((s) => !actuals.some((v) => sig(v) === s));
console.log(`OK — G2 render-pur: 0 smells nous · ${conegudes.size} de deute conegut` +
  (resoltes.length ? ` · ${resoltes.length} ja resoltes (buida el baseline)` : ''));
