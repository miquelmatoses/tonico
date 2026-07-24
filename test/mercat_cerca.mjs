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

// Punt 7.2: creuar amb el context de pla (nucli ple + cadència de fornades).
{
  // A1 ix la T84 → la finestra de compra és la depressió de final de la T83.
  const ple = { compra: { nucli_ple: true }, pla: { temporada_raw: 83, proxima_eixida: { temporada: 84, fornades: ['A1'] } } };
  // Nucli ple + DEPRESSIÓ a la T83 → ALERTA FORTA (ara toca comprar la reposició).
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ ...ple, mercat: { depressio: true } }, p)[0].missatge_clau, 'alerta.finestra_mercat_fornada');
  // 3e: nucli ple + SENSE depressió (finestra futura) → informativa → FORA de l'informe (viu a Mercat).
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ ...ple, mercat: { depressio: false, finsDepressio: 3 } }, p).length, 0, 'finestra prevista → fora de l\'informe');
  // Un any abans (raw T82): la compra encara no és d'hui → tampoc alerta.
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ compra: { nucli_ple: true }, pla: { temporada_raw: 82, proxima_eixida: { temporada: 84, fornades: ['A1'] } }, mercat: { depressio: true } }, p).length, 0, 'finestra a més d\'una temporada → fora de l\'informe');
  // Nucli ple + eixida LLUNY (T86, compra a final T85, encara a més d'un any) → res.
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ compra: { nucli_ple: true }, pla: { temporada_raw: 83, proxima_eixida: { temporada: 86, fornades: ['A2'] } }, mercat: { depressio: true } }, p).length, 0);
  // Nucli amb BUIT (no ple) + depressió → immediatesa (comprar ja), ignora el pla.
  assert.equal(REGLES.ALR_FINESTRA_MERCAT({ ...ple, compra: { nucli_ple: false }, mercat: { depressio: true } }, p)[0].missatge_clau, 'alerta.finestra_mercat_ara');
}

console.log('OK — mercat: filtres de cerca segons buits i finestra de compra');
