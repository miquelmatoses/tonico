// Tonico — PARITAT FULL ↔ MIRALL (invariant 11 del contracte). docs/FORMULES.md és la
// veritat; formules.json n'és el mirall llegible per màquina. Este test re-extrau les
// línies-fórmula del full amb la MATEIXA regla que el generador (importada, no copiada)
// i exigix bijecció: cap fórmula del full sense mirall, cap mirall sense fórmula.
// node test/formules_paritat.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extreuLinies } from '../scripts/genera_formules.mjs';

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(arrel, 'docs/FORMULES.md'), 'utf8');
const mirall = JSON.parse(readFileSync(join(arrel, 'formules.json'), 'utf8'));

const delFull = new Set(extreuLinies(md).map((c) => c.linia));
const delMirall = new Set(mirall.formules.map((f) => f.linia));

const orfesFull = [...delFull].filter((l) => !delMirall.has(l));      // fórmula sense mirall
const orfesMirall = [...delMirall].filter((l) => !delFull.has(l));    // mirall sense fórmula

assert.equal(orfesFull.length, 0, `Fórmules del full SENSE mirall:\n  ${orfesFull.join('\n  ')}`);
assert.equal(orfesMirall.length, 0, `Miralls SENSE fórmula al full:\n  ${orfesMirall.join('\n  ')}`);
assert.equal(delFull.size, mirall.formules.length, 'Recompte full ≠ recompte mirall');

// El mirall apunta al full vigent (no a un contracte retirat).
assert.equal(mirall._meta?.font, 'docs/FORMULES.md', 'el mirall no apunta al contracte vigent');

const ids = new Set();
for (const f of mirall.formules) {
  assert.ok(f.id && f.pas && f.clau, `entrada incompleta: ${JSON.stringify(f).slice(0, 80)}`);
  assert.ok(!ids.has(f.id), `id duplicat: ${f.id}`);
  ids.add(f.id);
  assert.ok(Array.isArray(f.entrades) && Array.isArray(f.poms) && Array.isArray(f.taules));
}

console.log(`OK — paritat full↔mirall: ${mirall.formules.length} fórmules, bijecció exacta, ${ids.size} ids únics`);
