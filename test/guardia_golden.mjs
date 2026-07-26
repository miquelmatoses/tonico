// Tonico — G3 GOLDEN-PANTALLA (invariant 13). Per a la instantània de fixtures, cada
// valor renderitzat = eixida de l'avaluador, valor a valor. Un retoc manual a la vista
// trenca el golden encara que passe el G2.
//
// ESTAT: PENDENT D'ACTIVACIÓ. El golden compara render(fixture) amb avaluador(fixture);
// l'avaluador general es construïx al primer lot de reconstrucció (L1 del DIFF). Fins
// llavors este guardià declara el pendent (no en silenci) i verifica que la bastida hi
// és: fixtures + mirall + arnès de render local. node test/guardia_golden.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..');

// Prerequisits de la bastida (han d'existir perquè el golden es puga activar).
assert.ok(existsSync(join(arrel, 'formules.json')), 'falta formules.json (mirall)');
assert.ok(existsSync(join(arrel, 'public/seccions.js')), 'falta la superfície de render');
const { formules } = JSON.parse(readFileSync(join(arrel, 'formules.json'), 'utf8'));
assert.ok(formules.length > 0, 'mirall buit');

// PENDENT: quan existisca l'avaluador (L1+), ací es carrega la instantània de fixtures,
// es rendaritza amb el codi real (arnès públic) i es compara valor a valor amb
// avaluador(fixture). Es marca visible, mai s'omet en silenci.
const ACTIU = false;   // ← passa a true al lot L1 quan l'avaluador done valors de pantalla
if (!ACTIU) {
  console.log('PENDENT — G3 golden-pantalla: bastida verificada; s\'activa amb l\'avaluador (DIFF L1).');
  process.exit(0);
}
