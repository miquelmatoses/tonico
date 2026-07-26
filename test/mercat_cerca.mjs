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

// Punt 5: cobertura complementària (resta_ocupacio). El davanter de farciment queda
// cobert per un davanter d'una ALTRA categoria (FuturCoach, futur_entrenador de DV)
// → el filtre NO ha de dir «falten 1».
{
  const ambSalva = [...squad, { posicio: 'DV', categoria: 'futur_entrenador' }];
  const f = filtresCompra(config, ambSalva, 100000, { edat_max: 18, creativitat_min: 6, posicions: ['MC'] });
  assert.equal(f.some((x) => x.rol === 'farciment' && x.bucket === 'davanter'), false, 'DV cobert per una altra categoria → cap filtre de davanter');
  // Sense eixe davanter, el filtre SÍ apareix (la quota queda descoberta).
  const sense = filtresCompra(config, squad, 100000, { edat_max: 18, creativitat_min: 6, posicions: ['MC'] });
  assert.equal(sense.some((x) => x.rol === 'farciment' && x.bucket === 'davanter'), true, 'sense cobertura → falta el davanter');
  // Si el davanter només el «tapa» un jugador EN VENDA, el filtre ho diu (previsió).
  const ambVenda = [...squad, { nom: 'Davanter', posicio: 'DV', categoria: 'venda' }];
  const dv = filtresCompra(config, ambVenda, 100000, { edat_max: 18, creativitat_min: 6, posicions: ['MC'] }).find((x) => x.rol === 'farciment' && x.bucket === 'davanter');
  assert.ok(dv && dv.falten === 1 && dv.previsio_venda.includes('Davanter'), 'cobert només per venda → filtre amb previsió nominal');
}

// Finestra de compra: depressió ara / a la vora / lluny
const p = { setmanes_avis: 2, urgencia: 58 };
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: true, finsDepressio: 1 } }, p)[0].missatge_clau, 'alerta.finestra_mercat_ara');
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: false, finsDepressio: 2 } }, p).length, 0, '3e: depressió a la vora és informatiu → fora de l\'informe (viu a Mercat)');
assert.equal(REGLES.ALR_FINESTRA_MERCAT({ mercat: { depressio: false, finsDepressio: 5 } }, p).length, 0, 'depressió lluny → cap avís');

// v3: amb el nucli PLE no hi ha res a comprar; amb buit i depressió, senyal de mercat barat.
{
  const p = { urgencia: 58 };
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ compra: { nucli_ple: true }, mercat: { depressio: true } }, p).length, 0, 'nucli ple → res');
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ compra: { nucli_ple: false }, mercat: { depressio: true } }, p)[0].missatge_clau, 'alerta.finestra_mercat_ara');
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ compra: { nucli_ple: false }, mercat: { depressio: false } }, p).length, 0, 'sense depressió → res');
}

console.log('OK — mercat: filtres de cerca segons buits i finestra de compra');
