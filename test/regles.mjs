// Tonico — motor de regles (Fase 2). node test/regles.mjs
import assert from 'node:assert/strict';
import { REGLES, executaRegles } from '../lib/regles.js';

const ctxBase = { dataInstantania: '2026-07-25', any_dies: 112, porter_notable_min: 7, jugadors: [], juvenils: [] };
const codis = (a) => a.map((x) => x.regla_codi);

// ALR_ANIVERSARI: NOMÉS entrenable (fet). La venda no espera aniversari → ALR_LLISTAR_VENDA.
{
  const jugadors = [
    { jugador_id: 1, nom: 'Prop', categoria: 'venda', edat_dies: 100, edat_anys: 23 },        // venda → NO (liquidació)
    { jugador_id: 3, nom: 'Entren', categoria: 'entrenable', edat_dies: 105, edat_anys: 17 },  // 7 dies → FET
  ];
  const p = { dies_avis: 14, categories: 'venda,entrenable', urgencia: 70 };
  const a = REGLES.ALR_ANIVERSARI({ ...ctxBase, jugadors }, p);
  assert.deepEqual(a.map((x) => x.jugador_id), [3], 'la venda ja no la governa l\'aniversari');
  assert.equal(a[0].missatge_clau, 'alerta.aniversari_fet');
}

// ALR_LLISTAR_VENDA (doctrina de liquidació): el valor no espera.
{
  const base = { ...ctxBase, dataInstantania: '2026-07-21', setmana_inici_data: '2026-07-18', dies_subhasta: 3, any_dies: 112 };
  const p = { urgencia: 72, urgencia_normal: 55, urgencia_lesionat: 40, dies_aniversari: 14, posicio_porter: 'PO', depressio_profunda: -20 };
  // Sense urgència, mercat en recuperació → LLISTAR HUI (mai s'espera). Un de sol
  // s'agrega igualment (mateixa medicina): agregat_1, jugador_id null, urgència normal.
  const rec = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', categoria: 'venda', edat_dies: 40, edat_anys: 22, sou: 5000 }], mercat: { depressio: false, modificador: 20 } }, p)[0];
  assert.equal(rec.missatge_clau, 'alerta.llistar_agregat_1', 'recuperació sense urgència → agregat');
  assert.equal(rec.jugador_id, null, 'l\'agregat és de secció (sense jugador)');
  assert.equal(rec.parametres.sou_total, 5000, 'sou total de l\'agregat');
  assert.equal(rec.urgencia, 55, 'sense rellotge d\'urgència');
  // Rellotge de depreciació: porter NOTABLE (porteria >= ctx.porter_notable_min=7) → urgent.
  const depoK = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'PO7', categoria: 'venda', posicio: 'PO', porteria: 7, edat_dies: 40, edat_anys: 24 }], mercat: { depressio: false, modificador: 0 } }, p)[0];
  assert.equal(depoK.urgencia, 72, 'porter notable (7) → depreciació urgent');
  // PO6 NO és notable (llindar únic = 7) → urgència normal.
  const depoNo = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'PO6', categoria: 'venda', posicio: 'PO', porteria: 6, edat_dies: 40, edat_anys: 24 }], mercat: { depressio: false, modificador: 0 } }, p)[0];
  assert.equal(depoNo.urgencia, 55, 'PO6 no és notable → normal');
  // Lesionat → ajornar (llistar quan es recupere).
  const les = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', categoria: 'venda', lesio: '2', edat_dies: 40, edat_anys: 22 }], mercat: { depressio: false, modificador: 0 } }, p)[0];
  assert.equal(les.missatge_clau, 'alerta.llistar_lesionat', 'lesionat → ajornament');
  // Depressió PROFUNDA sense urgència → agenda (esperar fins fora de depressió).
  const dep = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', categoria: 'venda', edat_dies: 40, edat_anys: 22 }], mercat: { depressio: true, modificador: -30, finsRecuperacio: 1, esperaMax: 4 } }, p)[0];
  assert.equal(dep.agenda, true, 'depressió profunda sense urgència → esperar');
  assert.equal(dep.missatge_clau, 'agenda.llistar');
  // MATEIXA depressió profunda PERÒ amb aniversari a la vora → llistar HUI (urgència mana).
  const urg = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', categoria: 'venda', edat_dies: 105, edat_anys: 22 }], mercat: { depressio: true, modificador: -30, finsRecuperacio: 1, esperaMax: 4 } }, p)[0];
  assert.equal(urg.missatge_clau, 'alerta.llistar_ja', 'aniversari a la vora → llistar ja malgrat la depressió');
  assert.equal(urg.urgencia, 72, 'rellotge d\'urgència → urgència alta');
  // Ja llistat → cap acció (no es re-llista). Via vendes_llistades O via Transferible=1 (3a).
  assert.equal(REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, categoria: 'venda', edat_dies: 40 }], vendes_llistades: [{ jugador_id: 1 }], mercat: { depressio: false } }, p).length, 0, 'ja llistat (fitxa) → res');
  assert.equal(REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, categoria: 'venda', edat_dies: 40, transferible: 1 }], mercat: { depressio: false } }, p).length, 0, 'Transferible=1 → res (3a)');
}

// 4 · AGREGACIÓ: la llista de «per llistar hui» sense urgència → UNA alerta agregada;
// els urgents del dia D queden a banda com a alertes individuals.
{
  const base = { ...ctxBase, dataInstantania: '2026-07-21', any_dies: 112 };
  const p = { urgencia: 72, urgencia_normal: 55, urgencia_lesionat: 40, dies_aniversari: 14, posicio_porter: 'PO', depressio_profunda: -20 };
  const jugadors = [
    { jugador_id: 1, nom: 'N1', categoria: 'venda', edat_dies: 40, edat_anys: 22, sou: 3000 },   // normal
    { jugador_id: 2, nom: 'N2', categoria: 'venda', edat_dies: 40, edat_anys: 22, sou: 2000 },   // normal
    { jugador_id: 3, nom: 'U', categoria: 'venda', edat_dies: 105, edat_anys: 22, sou: 9000 },   // urgent (aniversari)
    { jugador_id: 4, nom: 'L', categoria: 'venda', edat_dies: 40, edat_anys: 22, lesio: '2' },   // lesionat
  ];
  const a = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors, mercat: { depressio: false, modificador: 0 } }, p);
  const agr = a.find((x) => x.missatge_clau === 'alerta.llistar_agregat_n');
  assert.ok(agr, 'els llistables → UNA agregada');
  // UNA SOLA FONT: l'agregada cobrix TOT el conjunt llistable (inclosos els urgents,
  // que a més es destaquen a banda). El lesionat NO hi és: no és llistable ara.
  assert.equal(agr.parametres.n, 3, 'compta els 3 llistables (2 normals + 1 urgent)');
  assert.equal(agr.parametres.sou_total, 14000, 'sou total de tot el conjunt llistable');
  assert.equal(agr.jugador_id, null, 'agregada de secció');
  assert.equal(a.filter((x) => x.missatge_clau === 'alerta.llistar_ja').length, 1, 'l\'urgent del dia D destaca individualment dins de l\'agregada');
  assert.equal(a.filter((x) => x.missatge_clau === 'alerta.llistar_lesionat').length, 1, 'el lesionat, avís propi d\'ajornament');
}

// ALR_JUNTA_PORTER: venda-pla vs llistat-fet (columna Transferible). Llindar «notable»
// = ctx.porter_notable_min (font única), no un pom propi de la regla.
{
  const p = { posicio_porter: 'PO', minuts_min: 60, dies_sense_partit: 7, urgencia: 90, urgencia_suau: 45 };
  // No llistat (venda-pla) → recordatori suau
  const suau = REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ jugador_id: 1, categoria: 'venda', posicio: 'PO', porteria: 7, data_ultim_partit: '2026-07-22' }] }, p);
  assert.equal(suau[0].missatge_clau, 'alerta.junta_porter_suau');
  // Llistat i sense jugar → urgent
  const urgent = REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ jugador_id: 1, categoria: 'venda', posicio: 'PO', porteria: 7, transferible: 1, data_ultim_partit: '2026-07-05' }] }, p);
  assert.equal(urgent[0].missatge_clau, 'alerta.junta_porter_urgent');
  // Llistat i jugant recentment → cap alerta
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ jugador_id: 1, categoria: 'venda', posicio: 'PO', porteria: 7, transferible: 1, data_ultim_partit: '2026-07-23' }] }, p).length, 0);
  // PorterA (PO6) i PorterB (PO5) < 7 → la Junta NO els reté → cap alerta (falses abans)
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [
    { jugador_id: 2, nom: 'PorterA', categoria: 'venda', posicio: 'PO', porteria: 6, transferible: 1, data_ultim_partit: '2026-07-05' },
    { jugador_id: 3, nom: 'PorterB', categoria: 'venda', posicio: 'PO', porteria: 5, transferible: 1, data_ultim_partit: '2026-07-05' },
  ] }, p).length, 0);

  // EXEMPCIONS de retenció (guia §17), una per cas. Base: PO7 llistat i sense jugar
  // (dispararia urgent si no fóra per l'exempció).
  const base = { jugador_id: 9, categoria: 'venda', posicio: 'PO', porteria: 7, transferible: 1, data_ultim_partit: '2026-07-05' };
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ ...base, setmanes_club: 1 }] }, p).length, 0, 'nouvingut (<2 setmanes) exempt');
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ ...base, bonificacio_origen: 1 }] }, p).length, 0, 'ex-juvenil de la casa exempt');
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ ...base, lesio: '2' }] }, p).length, 0, 'lesionat exempt (les lesions no compten)');
  // Sense cap exempció (setmanes_club alt, no de la casa, sa) → sí dispara.
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, jugadors: [{ ...base, setmanes_club: 20, bonificacio_origen: 0, lesio: '' }] }, p).length, 1, 'sense exempció → reté');
}

// UN CONCEPTE, UN LLINDAR (correcció post-auditoria #1, punt 1): el mateix ctx.porter_notable_min
// governa la Junta I el rellotge de depreciació. Cap regla el redefinix pel seu compte.
{
  const jJunta = [{ jugador_id: 1, categoria: 'venda', posicio: 'PO', porteria: 6, transferible: 1, data_ultim_partit: '2026-07-05' }];
  const jDep = [{ jugador_id: 1, nom: 'PO6', categoria: 'venda', posicio: 'PO', porteria: 6, edat_dies: 40, edat_anys: 24 }];
  const pJ = { posicio_porter: 'PO', minuts_min: 60, dies_sense_partit: 7, urgencia: 90, urgencia_suau: 45 };
  const pD = { urgencia: 72, urgencia_normal: 55, posicio_porter: 'PO', dies_aniversari: 14, depressio_profunda: -20 };
  const mNoDep = { depressio: false, modificador: 0 };
  // Amb el llindar a 6, PO6 és notable per a LES DUES regles.
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, porter_notable_min: 6, jugadors: jJunta }, pJ).length, 1, 'llindar 6 → Junta reté PO6');
  assert.equal(REGLES.ALR_LLISTAR_VENDA({ ...ctxBase, porter_notable_min: 6, dataInstantania: '2026-07-21', jugadors: jDep, mercat: mNoDep }, pD)[0].urgencia, 72, 'llindar 6 → depreciació urgent PO6');
  // Amb el llindar a 7, PO6 deixa de ser notable per a LES DUES.
  assert.equal(REGLES.ALR_JUNTA_PORTER({ ...ctxBase, porter_notable_min: 7, jugadors: jJunta }, pJ).length, 0, 'llindar 7 → Junta no reté PO6');
  assert.equal(REGLES.ALR_LLISTAR_VENDA({ ...ctxBase, porter_notable_min: 7, dataInstantania: '2026-07-21', jugadors: jDep, mercat: mNoDep }, pD)[0].urgencia, 55, 'llindar 7 → depreciació normal PO6');
}

// ALR_NUCLI_INCOMPLET: menys d'objectiu
{
  const set = (n) => ({ ...ctxBase, jugadors: Array.from({ length: n }, (_, i) => ({ jugador_id: i, categoria: 'entrenable' })) });
  assert.equal(REGLES.ALR_NUCLI_INCOMPLET(set(7), { objectiu: 8, urgencia: 60 }).length, 1);
  assert.equal(REGLES.ALR_NUCLI_INCOMPLET(set(8), { objectiu: 8, urgencia: 60 }).length, 0);
}

// ALR_ENTRENABLE_SENSE_MINUTS: no dispara per a nouvinguts (setmanes_club < 1)
{
  const ctx = { ...ctxBase, jugadors: [
    { jugador_id: 1, nom: 'A', categoria: 'entrenable', data_ultim_partit: '2026-07-10', setmanes_club: 30 }, // vell → sí
    { jugador_id: 2, nom: 'B', categoria: 'entrenable', data_ultim_partit: '2026-07-23', setmanes_club: 30 }, // recent → no
    { jugador_id: 3, nom: 'C', categoria: 'entrenable', data_ultim_partit: null, setmanes_club: 0 },          // nouvingut → no (no podia jugar)
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

// ALR_COMPRA_ENTRENABLE: filtre concret + pressupost màxim derivat
{
  const filtres = [{ rol: 'entrenable', posicions: ['MC'], edat_max: 18, creativitat_min: 6, falten: 1 }];
  const amb = REGLES.ALR_COMPRA_ENTRENABLE({ compra: { filtres, caixa: 200000, reserva: 50000 } }, { urgencia: 72 });
  assert.equal(amb[0].missatge_clau, 'alerta.compra_entrenable');
  assert.equal(amb[0].parametres.pressupost, 150000);           // (200000 − 50000) / 1
  const sense = REGLES.ALR_COMPRA_ENTRENABLE({ compra: { filtres, caixa: 0, reserva: 50000 } }, { urgencia: 72 });
  assert.equal(sense[0].missatge_clau, 'alerta.compra_entrenable_sense_caixa');
  assert.equal(REGLES.ALR_COMPRA_ENTRENABLE({ compra: { filtres: [{ rol: 'entrenable', falten: 0 }], caixa: 1 } }, { urgencia: 72 }).length, 0);
}

// ALR_SENSE_CATEGORIA
{
  const ctx = { ...ctxBase, jugadors: [{ jugador_id: 1, nom: 'Z', categoria: null }, { jugador_id: 2, categoria: 'venda' }] };
  assert.deepEqual(REGLES.ALR_SENSE_CATEGORIA(ctx, { urgencia: 40 }).map((x) => x.jugador_id), [1]);
}

// ALR_SUPPORTER: caducitat dins de la finestra respecte de la instantània
{
  const p = { dies_avis: 7, urgencia: 62 };
  assert.equal(REGLES.ALR_SUPPORTER({ ...ctxBase, pla: { supporterCaducitat: '2026-07-30' } }, p).length, 1, '5 dies → sí');
  assert.equal(REGLES.ALR_SUPPORTER({ ...ctxBase, pla: { supporterCaducitat: '2026-08-20' } }, p).length, 0, 'lluny → no');
  assert.equal(REGLES.ALR_SUPPORTER({ ...ctxBase, pla: { supporterCaducitat: '2026-07-20' } }, p).length, 0, 'ja caducat → no');
  assert.equal(REGLES.ALR_SUPPORTER({ ...ctxBase, pla: {} }, p).length, 0, 'sense data → no');
}

// executaRegles: ordenat per urgència; setmana tranquil·la → cap alerta
{
  const ctx = { ...ctxBase, jugadors: [
    { jugador_id: 1, nom: 'P', categoria: 'venda', posicio: 'PO', porteria: 7, transferible: 1, data_ultim_partit: '2026-07-10', edat_dies: 100, edat_anys: 23 },
    ...Array.from({ length: 8 }, (_, i) => ({ jugador_id: 10 + i, categoria: 'entrenable', data_ultim_partit: '2026-07-23' })),
  ] };
  const actives = [
    { codi: 'ALR_JUNTA_PORTER', params: { posicio_porter: 'PO', minuts_min: 60, dies_sense_partit: 7, urgencia: 90 } },
    { codi: 'ALR_ANIVERSARI', params: { dies_avis: 14, categories: 'venda', urgencia: 70 } },
    { codi: 'ALR_NUCLI_INCOMPLET', params: { objectiu: 8, urgencia: 60 } },
  ];
  const a = executaRegles(ctx, actives);
  assert.deepEqual(codis(a), ['ALR_JUNTA_PORTER']);   // venda ja no dispara aniversari; 8 entrenables sense data → res
  // Setmana tranquil·la
  const tranquil = executaRegles({ ...ctxBase, jugadors: Array.from({ length: 8 }, (_, i) => ({ jugador_id: i, categoria: 'entrenable', data_ultim_partit: '2026-07-23' })) }, actives);
  assert.equal(tranquil.length, 0, 'Paco sap callar');
}

console.log('OK — motor de regles: 7 regles, ordenació per urgència i setmanes tranquil·les');

// Polit #11.2c — ALR_LESIO_VENDA: un llistat lesionat → avís d'esperar.
{
  const ctx = {
    jugadors: [
      { jugador_id: 1, nom: 'Lesionat', categoria: 'venda', lesio: '2' },   // lesionat
      { jugador_id: 2, nom: 'Sa', categoria: 'venda', lesio: '' },       // sa
    ],
    vendes_llistades: [
      { jugador_id: 1, nom: 'Lesionat', data_llistada: '2026-07-20' },
      { jugador_id: 2, nom: 'Sa', data_llistada: '2026-07-20' },
    ],
  };
  const a = REGLES.ALR_LESIO_VENDA(ctx, { urgencia: 80 });
  assert.equal(a.length, 1, 'només el llistat lesionat');
  assert.equal(a[0].jugador_id, 1);
  assert.equal(a[0].missatge_clau, 'alerta.lesio_venda');
  // Sense llistar, ni encara que estiga lesionat, no dispara (només afecta els que ja són al mercat).
  assert.equal(REGLES.ALR_LESIO_VENDA({ jugadors: ctx.jugadors, vendes_llistades: [] }, { urgencia: 80 }).length, 0);
}
console.log('OK — ALR_LESIO_VENDA: llistat lesionat avisa');
// (La depreciació mecànica està plegada dins d'ALR_LLISTAR_VENDA com a rellotge d'urgència;
//  el llindar «porter notable» és ctx.porter_notable_min, compartit amb la Junta.)
