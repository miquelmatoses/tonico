// Tonico — mercat (Fase 6.2): filtres de cerca i finestra de compra.
// node test/mercat_cerca.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { carregaConfigPla } from '../lib/config_pla.js';
import { filtresCompra } from '../lib/mercat_cerca.js';
import { REGLES } from '../lib/regles.js';

const { db } = nova(import.meta.url);
const config = await carregaConfigPla(db, 'fabrica');

// Buit d'un MC entrenable (5 dels 6) → filtre amb «falten: 1»
const squad = [
  ...Array.from({ length: 5 }, () => ({ posicio: 'MC', categoria: 'entrenable' })),
  ...Array.from({ length: 2 }, () => ({ posicio: 'ED', categoria: 'entrenable' })),
];
const filtres = filtresCompra(config, squad, 100000, { edat_max: 18, creativitat_min: 6 });
const mc = filtres.find((f) => f.rol === 'entrenable' && f.bucket === 'mc');
assert.equal(mc.falten, 1, 'falta 1 MC entrenable');
assert.equal(mc.creativitat_min, 6);
assert.deepEqual(mc.posicions, ['MC']);
assert.equal(filtres.find((f) => f.bucket === 'extrem').falten, 0, 'extrems coberts');

// Finestra de compra: depressió ara / a la vora / lluny
const p = { setmanes_avis: 2, urgencia: 58 };
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: true, finsDepressio: 1 } }, p)[0].missatge_clau, 'alerta.finestra_mercat_ara');
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: false, finsDepressio: 2 } }, p)[0].missatge_clau, 'alerta.finestra_mercat_prop');
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: false, finsDepressio: 5 } }, p).length, 0, 'depressió lluny → cap avís');

console.log('OK — mercat: filtres de cerca segons buits i finestra de compra');
