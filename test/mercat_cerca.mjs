// Tonico — mercat (Fase 6.2): filtres de cerca i finestra de compra.
// node test/mercat_cerca.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { carregaConfigPla } from '../lib/config_pla.js';
import { filtresCompra } from '../lib/mercat_cerca.js';
import { REGLES } from '../lib/regles.js';

const { db } = nova(import.meta.url);
const config = await carregaConfigPla(db, 'fabrica');

// Entrenable amb aforament pla: 7 dels 8 → filtre amb «falten: 1»
const squad = Array.from({ length: 7 }, (_, i) => ({ posicio: i < 5 ? 'MC' : 'ED', categoria: 'entrenable' }));
const filtres = filtresCompra(config, squad, 100000, { edat_max: 18, creativitat_min: 6, posicions: ['MC', 'ED', 'EE'] });
const ent = filtres.find((f) => f.rol === 'entrenable');
assert.equal(ent.falten, 1, 'falta 1 entrenable (dels 8)');
assert.equal(ent.creativitat_min, 6);
assert.deepEqual(ent.posicions, ['MC', 'ED', 'EE']);

// Finestra de compra: depressió ara / a la vora / lluny
const p = { setmanes_avis: 2, urgencia: 58 };
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: true, finsDepressio: 1 } }, p)[0].missatge_clau, 'alerta.finestra_mercat_ara');
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: false, finsDepressio: 2 } }, p)[0].missatge_clau, 'alerta.finestra_mercat_prop');
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: false, finsDepressio: 5 } }, p).length, 0, 'depressió lluny → cap avís');

console.log('OK — mercat: filtres de cerca segons buits i finestra de compra');
