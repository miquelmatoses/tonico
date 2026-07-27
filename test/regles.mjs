// Tonico — motor de regles (Fase 2). node test/regles.mjs
import assert from 'node:assert/strict';
import { REGLES, executaRegles } from '../lib/regles.js';

const ctxBase = { dataInstantania: '2026-07-25', any_dies: 112, porter_notable_min: 7, jugadors: [], juvenils: [] };
const codis = (a) => a.map((x) => x.regla_codi);

// ALR_ANIVERSARI: NOMÉS els que et quedes (l'onze i els entrenables). La venda no espera
// aniversari → ALR_LLISTAR_VENDA.
{
  const jugadors = [
    { jugador_id: 1, nom: 'Prop', grup: 'venda', edat_dies: 100, edat_anys: 23 },        // venda → NO (liquidació)
    { jugador_id: 3, nom: 'Entren', grup: 'onze', edat_dies: 105, edat_anys: 17 },  // 7 dies → FET
  ];
  // El pom nomena «venda» a posta: encara nomenant-la, la venda no ha de disparar.
  const p = { dies_avis: 14, categories: 'venda,onze,entrenable', urgencia: 70 };
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
  const rec = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', grup: 'venda', edat_dies: 40, edat_anys: 22, sou: 5000 }], mercat: { depressio: false, modificador: 20 } }, p)[0];
  assert.equal(rec.missatge_clau, 'alerta.llistar_agregat_1', 'recuperació sense urgència → agregat');
  assert.equal(rec.jugador_id, null, 'l\'agregat és de secció (sense jugador)');
  assert.equal(rec.parametres.sou_total, 5000, 'sou total de l\'agregat');
  assert.equal(rec.urgencia, 55, 'sense rellotge d\'urgència');
  // Rellotge de depreciació: porter NOTABLE (porteria >= ctx.porter_notable_min=7) → urgent.
  const depoK = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'PO7', grup: 'venda', posicio: 'PO', porteria: 7, edat_dies: 40, edat_anys: 24 }], mercat: { depressio: false, modificador: 0 } }, p)[0];
  assert.equal(depoK.urgencia, 55, 'v3: un porter valuós NO fa urgent la venda (només l\'aniversari)');
  // PO6 NO és notable (llindar únic = 7) → urgència normal.
  const depoNo = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'PO6', grup: 'venda', posicio: 'PO', porteria: 6, edat_dies: 40, edat_anys: 24 }], mercat: { depressio: false, modificador: 0 } }, p)[0];
  assert.equal(depoNo.urgencia, 55, 'PO6 no és notable → normal');
  // Lesionat → ajornar (llistar quan es recupere).
  const les = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', grup: 'venda', lesio: '2', edat_dies: 40, edat_anys: 22 }], mercat: { depressio: false, modificador: 0 } }, p)[0];
  assert.equal(les.missatge_clau, 'alerta.llistar_lesionat', 'lesionat → ajornament');
  // Depressió PROFUNDA sense urgència → agenda (esperar fins fora de depressió).
  const dep = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', grup: 'venda', edat_dies: 40, edat_anys: 22 }], mercat: { depressio: true, modificador: -30, finsRecuperacio: 1, esperaMax: 4 } }, p)[0];
  assert.equal(dep.agenda, true, 'depressió profunda sense urgència → esperar');
  assert.equal(dep.missatge_clau, 'agenda.llistar');
  // MATEIXA depressió profunda PERÒ amb aniversari a la vora → llistar HUI (urgència mana).
  const urg = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, nom: 'X', grup: 'venda', edat_dies: 105, edat_anys: 22 }], mercat: { depressio: true, modificador: -30, finsRecuperacio: 1, esperaMax: 4 } }, p)[0];
  assert.equal(urg.missatge_clau, 'alerta.llistar_ja', 'aniversari a la vora → llistar ja malgrat la depressió');
  assert.equal(urg.urgencia, 72, 'rellotge d\'urgència → urgència alta');
  // Ja llistat → cap acció (no es re-llista). Via vendes_llistades O via Transferible=1 (3a).
  assert.equal(REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, grup: 'venda', edat_dies: 40 }], vendes_llistades: [{ jugador_id: 1 }], mercat: { depressio: false } }, p).length, 0, 'ja llistat (fitxa) → res');
  assert.equal(REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors: [{ jugador_id: 1, grup: 'venda', edat_dies: 40, transferible: 1 }], mercat: { depressio: false } }, p).length, 0, 'Transferible=1 → res (3a)');
}

// 4 · AGREGACIÓ: la llista de «per llistar hui» sense urgència → UNA alerta agregada;
// els urgents del dia D queden a banda com a alertes individuals.
{
  const base = { ...ctxBase, dataInstantania: '2026-07-21', any_dies: 112 };
  const p = { urgencia: 72, urgencia_normal: 55, urgencia_lesionat: 40, dies_aniversari: 14, posicio_porter: 'PO', depressio_profunda: -20 };
  const jugadors = [
    { jugador_id: 1, nom: 'N1', grup: 'venda', edat_dies: 40, edat_anys: 22, sou: 3000 },   // normal
    { jugador_id: 2, nom: 'N2', grup: 'venda', edat_dies: 40, edat_anys: 22, sou: 2000 },   // normal
    { jugador_id: 3, nom: 'U', grup: 'venda', edat_dies: 105, edat_anys: 22, sou: 9000 },   // urgent (aniversari)
    { jugador_id: 4, nom: 'L', grup: 'venda', edat_dies: 40, edat_anys: 22, lesio: '2' },   // lesionat
    // NOMÉS EL GRUP «venda» es llista. Els altres quatre grups tenen cada un el seu motiu per
    // a estar a la plantilla, i cap d'ells és el mercat: un entrenable està entrenant, el
    // futur entrenador espera la reconversió, el porter suplent tapa el segon partit, i el
    // de despatxar ja va eixir a subhasta i ningú el va voler (eixe no es torna a llistar mai).
    { jugador_id: 5, nom: 'E', grup: 'entrenable', edat_dies: 40, edat_anys: 18, sou: 1000 },
    { jugador_id: 6, nom: 'F', grup: 'futur_entrenador', edat_dies: 40, edat_anys: 30, sou: 4000 },
    { jugador_id: 7, nom: 'P', grup: 'porter_suplent', edat_dies: 40, edat_anys: 25, sou: 500 },
    { jugador_id: 8, nom: 'D', grup: 'despatxar', edat_dies: 40, edat_anys: 28, sou: 3000 },
    { jugador_id: 9, nom: 'O', grup: 'onze', edat_dies: 40, edat_anys: 24, sou: 6000 },
  ];
  const a = REGLES.ALR_LLISTAR_VENDA({ ...base, jugadors, mercat: { depressio: false, modificador: 0 } }, p);
  const tocats = new Set(a.map((x) => x.jugador_id).filter((x) => x != null));
  for (const id of [5, 6, 7, 8, 9]) {
    assert.ok(!tocats.has(id), `el grup de ${jugadors.find((j) => j.jugador_id === id).nom} no es llista`);
  }
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

// v3 (PAS 7): urgent(j) = NOMÉS l'aniversari. La depreciació de porter valuós era del
// model retirat i el full no la contempla, així que ni la Junta ni el rellotge de porter
// governen res ací.

// ALR_NUCLI_INCOMPLET: menys d'objectiu
{
  const set = (n) => ({ ...ctxBase, jugadors: Array.from({ length: n }, (_, i) => ({ jugador_id: i, grup: 'onze' })) });
  assert.equal(REGLES.ALR_NUCLI_INCOMPLET(set(7), { objectiu: 8, urgencia: 60 }).length, 1);
  assert.equal(REGLES.ALR_NUCLI_INCOMPLET(set(8), { objectiu: 8, urgencia: 60 }).length, 0);
}

// LES QUATRE REGLES DESACTIVADES PER SEMPRE se n'han anat del motor (migració 094). Estaven
// amb `activa=0` des de fa migracions i cap migració les tornava a encendre: codi que sembla
// viu, es manté i es llig, i no pot disparar mai. El que resolen viu on toca —el que es resol
// alineant, a les seccions d'alineació; la finestra de crida, al seu rellotge; i una subhasta
// llistada no admet cap acció, que HT no deixa canviar res una vegada llistat.
for (const codi of ['ALR_NUCLI_SENSE_MINUTS', 'ALR_JUVENIL_SUPLENTS', 'ALR_CRIDA_SETMANAL', 'ALR_SUBHASTA_TANCA']) {
  assert.equal(REGLES[codi], undefined, `${codi} se n'ha anat del motor, no només de la taula`);
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

// ALR_COMPRA_ENTRENABLE: ix de les mateixes NECESSITATS que pinta Mercat, no d'una segona
// derivació. I sense preu declarat no diu «compra», diu «mira quant costa»: a Hattrick el preu
// no el calcula el joc, i suggerir sense saber-lo és decidir a cegues.
{
  const necs = [{ tipus: 'entrenable', quants: 2, nivell: 6, preu: null }];
  const sensePreu = REGLES.ALR_COMPRA_ENTRENABLE({ compra: { necessitats: necs, caixa: 150000 } }, { urgencia: 72 });
  assert.equal(sensePreu[0].missatge_clau, 'alerta.compra_entrenable_preu',
    'sense preu, es demana el número en compte de proposar la compra');
  const ambPreu = REGLES.ALR_COMPRA_ENTRENABLE({ compra: { necessitats: [{ ...necs[0], preu: 120000 }], caixa: 150000 } }, { urgencia: 72 });
  assert.equal(ambPreu[0].missatge_clau, 'alerta.compra_entrenable', 'amb preu, ja es proposa');
  assert.equal(ambPreu[0].parametres.preu, 120000, 'i el preu és el declarat');
  assert.deepEqual(REGLES.ALR_COMPRA_ENTRENABLE({ compra: { necessitats: [] } }, { urgencia: 72 }), [],
    'sense places buides, cap alerta');
}

// ALR_SENSE_CATEGORIA se n'ha anat (migració 091): amb l'assignació d'estructura, un jugador
// sense grup no pot existir —els sis grups cobrixen la plantilla sencera per construcció— i
// l'únic cas que quedava, «no hi ha formació», feia saltar la regla per a TOTS alhora.
assert.equal(REGLES.ALR_SENSE_CATEGORIA, undefined, 'la regla se n\'ha anat del motor');

// executaRegles: ordenat per urgència; setmana tranquil·la → cap alerta
{
  const ctx = { ...ctxBase, jugadors: [
    { jugador_id: 1, nom: 'P', grup: 'venda', posicio: 'PO', porteria: 7, transferible: 1, data_ultim_partit: '2026-07-10', edat_dies: 100, edat_anys: 23 },
    ...Array.from({ length: 8 }, (_, i) => ({ jugador_id: 10 + i, grup: 'onze', data_ultim_partit: '2026-07-23' })),
  ] };
  const actives = [
    { codi: 'ALR_ANIVERSARI', params: { dies_avis: 14, categories: 'venda', urgencia: 70 } },
    { codi: 'ALR_NUCLI_INCOMPLET', params: { objectiu: 8, urgencia: 60 } },
  ];
  const a = executaRegles(ctx, actives);
  assert.deepEqual(codis(a), []);   // venda ja no dispara aniversari; 8 entrenables sense data → res
  // Setmana tranquil·la
  const tranquil = executaRegles({ ...ctxBase, jugadors: Array.from({ length: 8 }, (_, i) => ({ jugador_id: i, grup: 'onze', data_ultim_partit: '2026-07-23' })) }, actives);
  assert.equal(tranquil.length, 0, 'Paco sap callar');
}

console.log('OK — motor de regles: 7 regles, ordenació per urgència i setmanes tranquil·les');

// Polit #11.2c — ALR_LESIO_VENDA: un llistat lesionat → avís d'esperar.
{
  const ctx = {
    jugadors: [
      { jugador_id: 1, nom: 'Lesionat', grup: 'venda', lesio: '2' },   // lesionat
      { jugador_id: 2, nom: 'Sa', grup: 'venda', lesio: '' },       // sa
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


// ── v3.1: DADA VELLA ≠ ABSENT ≠ ZERO (invariant 18), i la caducitat de l'estadi ──
// Amb període bi-setmanal el sistema depén de que es declare cada període. Si no arriba, ho ha
// de DIR: seguir raonant en silenci sobre xifres velles és el mode de fallar més car.
{
  const p = { urgencia: 68 };
  assert.equal(REGLES.ALR_DADES_VELLES({ economia: null }, p).length, 0,
    'sense economia no hi ha res a avisar');
  assert.equal(REGLES.ALR_DADES_VELLES({ economia: { dades_velles: false } }, p).length, 0,
    'amb dades fresques, Paco calla');
  const velles = REGLES.ALR_DADES_VELLES({ economia: { dades_velles: true, caixa_data: '2026-07-18' } }, p);
  assert.equal(velles.length, 1, 'amb dades velles, avisa');
  assert.equal(velles[0].missatge_clau, 'alerta.dades_velles');
  assert.equal(velles[0].parametres.data, '2026-07-18', 'i diu de quan són');

  assert.equal(REGLES.ALR_ESTADI_CADUC({ economia: { estadi_caduc: false } }, { urgencia: 55 }).length, 0);
  const caduc = REGLES.ALR_ESTADI_CADUC({ economia: { estadi_caduc: true, estadi_data: '2026-01-01' } }, { urgencia: 55 });
  assert.equal(caduc.length, 1, 'passades les setmanes de caducitat, es demanen números nous');
  assert.equal(caduc[0].missatge_clau, 'alerta.estadi_caduc');
}
console.log('OK — v3.1: dades velles i estadi caduc avisen, i callen quan toca');
