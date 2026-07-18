// Tonico — motor de regles (Fase 2). node test/regles.mjs
import assert from 'node:assert/strict';
import { REGLES, executaRegles } from '../lib/regles.js';

const ctxBase = { dataInstantania: '2026-07-25', any_dies: 112, jugadors: [], juvenils: [] };
const codis = (a) => a.map((x) => x.regla_codi);

// ALR_ANIVERSARI: venda (recomanació) + entrenable (fet); dos rellotges amb el mercat
{
  const jugadors = [
    { jugador_id: 1, nom: 'Prop', categoria: 'venda', edat_dies: 100, edat_anys: 23 },        // 12 dies → sí (venda)
    { jugador_id: 2, nom: 'Lluny', categoria: 'venda', edat_dies: 50, edat_anys: 23 },         // 62 dies → no
    { jugador_id: 3, nom: 'Entren', categoria: 'entrenable', edat_dies: 105, edat_anys: 17 },  // 7 dies → FET
  ];
  const p = { dies_avis: 14, categories: 'venda,entrenable', urgencia: 70 };
  // Sense mercat: venda → recomanació normal; entrenable → fet
  const a = REGLES.ALR_ANIVERSARI({ ...ctxBase, jugadors }, p);
  assert.deepEqual(a.map((x) => x.jugador_id), [1, 3]);
  assert.equal(a.find((x) => x.jugador_id === 1).missatge_clau, 'alerta.aniversari');
  assert.equal(a.find((x) => x.jugador_id === 3).missatge_clau, 'alerta.aniversari_fet');
  // Amb mercat en depressió i recuperació a la vora: venda → esperar (dos rellotges)
  const mercat = { depressio: true, finsRecuperacio: 1, setmanaRecuperacio: 1, esperaMax: 4 };
  const b = REGLES.ALR_ANIVERSARI({ ...ctxBase, jugadors, mercat }, p);
  assert.equal(b.find((x) => x.jugador_id === 1).missatge_clau, 'alerta.aniversari_espera');
  assert.equal(b.find((x) => x.jugador_id === 1).parametres.setmana_recuperacio, 1);
}

// ALR_JUNTA_PORTER: recordatori per a tot porter notable en venda (sense minuts)
{
  const ctx = { ...ctxBase, jugadors: [
    { jugador_id: 1, nom: 'Cast', categoria: 'venda', posicio: 'PO', porteria: 6, data_ultim_partit: '2026-07-22' }, // recent, però igual dispara
    { jugador_id: 2, nom: 'Baix', categoria: 'venda', posicio: 'PO', porteria: 4 },   // per davall del nivell → no
    { jugador_id: 3, nom: 'Camp', categoria: 'venda', posicio: 'DC', porteria: 6 },   // no és porter → no
  ] };
  const a = REGLES.ALR_JUNTA_PORTER(ctx, { posicio_porter: 'PO', porteria_min: 5, minuts_min: 60, urgencia: 90 });
  assert.deepEqual(a.map((x) => x.jugador_id), [1]);
}

// ALR_NUCLI_INCOMPLET: menys d'objectiu
{
  const set = (n) => ({ ...ctxBase, jugadors: Array.from({ length: n }, (_, i) => ({ jugador_id: i, categoria: 'entrenable' })) });
  assert.equal(REGLES.ALR_NUCLI_INCOMPLET(set(7), { objectiu: 8, urgencia: 60 }).length, 1);
  assert.equal(REGLES.ALR_NUCLI_INCOMPLET(set(8), { objectiu: 8, urgencia: 60 }).length, 0);
}

// ALR_ENTRENABLE_SENSE_MINUTS
{
  const ctx = { ...ctxBase, jugadors: [
    { jugador_id: 1, nom: 'A', categoria: 'entrenable', data_ultim_partit: '2026-07-10' },  // vell → sí
    { jugador_id: 2, nom: 'B', categoria: 'entrenable', data_ultim_partit: '2026-07-23' },  // recent → no
  ] };
  assert.deepEqual(REGLES.ALR_ENTRENABLE_SENSE_MINUTS(ctx, { dies_sense_partit: 7, urgencia: 80 }).map((x) => x.jugador_id), [1]);
}

// ALR_PROMOCIO_JUVENIL i ALR_PLANTILLA_JUVENIL_MINIMA
{
  const ctx = { ...ctxBase, juvenils: [
    { jugador_id: 1, nom: 'X', dies_restants_promocio: 5 },   // <=7 → sí
    { jugador_id: 2, nom: 'Y', dies_restants_promocio: 40 },  // no
  ] };
  assert.deepEqual(REGLES.ALR_PROMOCIO_JUVENIL(ctx, { dies_avis: 7, urgencia: 75 }).map((x) => x.jugador_id), [1]);
  assert.equal(REGLES.ALR_PLANTILLA_JUVENIL_MINIMA(ctx, { minim: 11, urgencia: 50 }).length, 1);  // 2 < 11
}

// ALR_SENSE_CATEGORIA
{
  const ctx = { ...ctxBase, jugadors: [{ jugador_id: 1, nom: 'Z', categoria: null }, { jugador_id: 2, categoria: 'venda' }] };
  assert.deepEqual(REGLES.ALR_SENSE_CATEGORIA(ctx, { urgencia: 40 }).map((x) => x.jugador_id), [1]);
}

// executaRegles: ordenat per urgència; setmana tranquil·la → cap alerta
{
  const ctx = { ...ctxBase, jugadors: [
    { jugador_id: 1, nom: 'P', categoria: 'venda', posicio: 'PO', porteria: 6, data_ultim_partit: '2026-07-10', edat_dies: 100, edat_anys: 23 },
    ...Array.from({ length: 8 }, (_, i) => ({ jugador_id: 10 + i, categoria: 'entrenable', data_ultim_partit: '2026-07-23' })),
  ] };
  const actives = [
    { codi: 'ALR_JUNTA_PORTER', params: { posicio_porter: 'PO', porteria_min: 5, minuts_min: 60, dies_sense_partit: 7, urgencia: 90 } },
    { codi: 'ALR_ANIVERSARI', params: { dies_avis: 14, categories: 'venda', urgencia: 70 } },
    { codi: 'ALR_NUCLI_INCOMPLET', params: { objectiu: 8, urgencia: 60 } },
  ];
  const a = executaRegles(ctx, actives);
  assert.deepEqual(codis(a), ['ALR_JUNTA_PORTER', 'ALR_ANIVERSARI']);   // 8 entrenables → nucli no dispara; ordenat per urgència
  // Setmana tranquil·la
  const tranquil = executaRegles({ ...ctxBase, jugadors: Array.from({ length: 8 }, (_, i) => ({ jugador_id: i, categoria: 'entrenable', data_ultim_partit: '2026-07-23' })) }, actives);
  assert.equal(tranquil.length, 0, 'Paco sap callar');
}

console.log('OK — motor de regles: 7 regles, ordenació per urgència i setmanes tranquil·les');
