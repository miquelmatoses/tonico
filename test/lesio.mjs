// Tonico — lesions: ingest ESTRICTE (buit / N / degrada). La font porta EXACTAMENT
// buit o N; qualsevol altre valor es registra i degrada, no s'inventa. node test/lesio.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelSenior } from '../lib/adaptador.js';

const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const files = [base[0], base[1].slice(), base[2].slice(), base[3].slice()];
files[1][7] = '';      // sa
files[2][7] = '2';     // lesionat 2 setmanes
files[3][7] = 'xyz';   // valor inesperat → degrada a null
const m = modelSenior(files, '2026-07-18');
assert.equal(m.jugadors[0].instantania.lesio, null, 'buit → sa');
assert.equal(m.jugadors[1].instantania.lesio, '2', 'N → N setmanes');
assert.equal(m.jugadors[2].instantania.lesio, null, 'valor inesperat → degrada (no s\'inventa significat)');

console.log('OK — lesions: ingest estricte (buit / N / degrada, sense inventar)');
