// Tonico — proves del Bloc C. Sense framework: node:assert + fixtures.
//   node test/proves.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelSenior, modelJuvenil } from '../lib/adaptador.js';
import { calcularSetmana } from '../lib/calendari.js';
import { classificar } from '../lib/diferencia.js';

const files = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

// ── Adaptador sènior ──
const sr = modelSenior(files('../data/fixtures/players.csv'), '2026-07-18');
assert.equal(sr.tipus, 'senior');
assert.equal(sr.jugadors.length, 25);
const ferrer = sr.jugadors[0];
assert.equal(ferrer.identitat.id_hattrick, 900000001);      // BOM netejat, ID enter
assert.equal(ferrer.instantania.edat_anys, 17);
assert.equal(ferrer.instantania.edat_dies, 55);             // edat en dos camps
assert.equal(ferrer.instantania.tsi, 2380);
assert.equal(ferrer.instantania.qualificacio_ultim_partit, 3.5);  // decimal permés
assert.equal(ferrer.instantania.data_ultim_partit, '2026-07-15'); // DD-MM → ISO
assert.equal(ferrer.instantania.posicio_ultim_partit, 'PO');

// ── Adaptador juvenil: els tres estats de les habilitats ──
const jv = modelJuvenil(files('../data/fixtures/youthplayers.csv'), '2026-07-18');
assert.equal(jv.jugadors.length, 10);
const alcasser = jv.jugadors[2].instantania;               // 'Pau Alcàsser'
assert.equal(alcasser.extrem_actual, '4');                 // valor conegut
assert.equal(alcasser.extrem_potencial, 'desconegut');     // '/?' → desconegut
assert.equal(alcasser.passades_actual, 'desconegut');      // '?'  → desconegut
assert.equal(alcasser.passades_potencial, '4');            // '/4' → '4'
assert.equal(alcasser.porteria_actual, null);              // buit → no revelat
assert.equal(alcasser.dies_restants_promocio, 172);

// ── Calendari (àncora T83 = 2026-07-25) ──
const anc = { data: '2026-07-25', temporada: 83, anyDies: 112 };
assert.deepEqual(calcularSetmana('2026-07-25', anc), { temporada: 83, setmana: 1 });
assert.deepEqual(calcularSetmana('2026-08-01', anc), { temporada: 83, setmana: 2 });
assert.deepEqual(calcularSetmana('2026-07-18', anc), { temporada: 82, setmana: 16 }); // pretemporada

// ── Diferència: nous / recompra / desapareguts ──
const existents = [
  { id_hattrick: 1, estat: 'actiu' },
  { id_hattrick: 2, estat: 'actiu' },
  { id_hattrick: 3, estat: 'baixa' },            // recompra si reapareix
  { id_hattrick: 4, estat: 'pendent_de_motiu' },
];
const d = classificar([1, 3, 5], existents);
assert.deepEqual(d.nous, [5]);
assert.deepEqual(d.recompres, [3]);
assert.deepEqual(d.continuen, [1]);
assert.deepEqual(d.desapareguts, [2]);           // actiu i absent

console.log('OK — totes les proves del Bloc C passen');
