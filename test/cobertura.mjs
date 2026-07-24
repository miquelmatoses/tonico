// Tonico — COBERTURA MÍNIMA v2 derivada de l'entrenament configurat. Els mínims han
// d'EMERGIR de la config: dos entrenaments distints → places i mínims distints, sense
// cap número escrit a mà. node test/cobertura.mjs
import assert from 'node:assert/strict';
import { cobertura, entrenablesObjectiu, retingutsPerCobertura } from '../lib/cobertura.js';
import { REGLES } from '../lib/regles.js';
import { conjuntLiquidacio, estatLiquidacio } from '../lib/liquidacio.js';

const rols2 = [{ id: 'A', competitiu: 1 }, { id: 'B', competitiu: 0 }];
const slot = (codi, bucket, entrena, pct) => ({ codi, bucket, entrena, pct });

// ── ENTRENAMENT 1: creativitat (MC al 100%) + extrems al 50%+50% ──
// 3 MC × 100% + 2 EXT × 50% = 4 per partit → × 2 rols = 8 entrenables.
const cfgCreativitat = {
  rols: rols2,
  slots: [
    slot('POR', 'porter', false), slot('DC1', 'defensa', false), slot('DC2', 'defensa', false), slot('DC3', 'defensa', false),
    slot('MC1', 'mc', true, 100), slot('MC2', 'mc', true, 100), slot('MC3', 'mc', true, 100),
    slot('EXT1', 'extrem', true, 50), slot('EXT2', 'extrem', true, 50),
    slot('DAV1', 'davanter', false), slot('DAV2', 'davanter', false),
  ],
};
const c1 = cobertura(cfgCreativitat, { futur_entrenador: 1 });
assert.equal(c1.entrenables_objectiu, 8, '(3×100% + 2×50%) × 2 rols = 8 — el «8» EMERGIX, no es cabla');
assert.equal(c1.detall.llocs_restants, 5, '11 places − 5 que entrenen − 1 porteria = 5 de camp');
assert.equal(c1.camp_minim, 6, '5 restants − 1 futur entrenador + 2 de marge = 6');
assert.equal(c1.porters_minims, 2);
assert.equal(c1.total, 17, '8 entrenables + 1 futur entrenador + 2 porters + 6 de camp');

// ── ENTRENAMENT 2: defensa (5 DC al 100%), sense extrems entrenant i sense futur entrenador ──
// Places i mínims DIFERENTS, derivats de la mateixa fórmula.
const cfgDefensa = {
  rols: rols2,
  slots: [
    slot('POR', 'porter', false),
    slot('DC1', 'defensa', true, 100), slot('DC2', 'defensa', true, 100), slot('DC3', 'defensa', true, 100),
    slot('DC4', 'defensa', true, 100), slot('DC5', 'defensa', true, 100),
    slot('MC1', 'mc', false), slot('MC2', 'mc', false), slot('MC3', 'mc', false),
    slot('EXT1', 'extrem', false), slot('EXT2', 'extrem', false),
  ],
};
const c2 = cobertura(cfgDefensa, { futur_entrenador: 0 });
assert.equal(c2.entrenables_objectiu, 10, '5 places × 100% × 2 rols = 10');
assert.equal(c2.camp_minim, 7, '11 − 5 − 1 = 5 restants − 0 futur entrenador + 2 = 7');
assert.equal(c2.total, 19, '10 + 0 + 2 + 7');
assert.notEqual(c1.entrenables_objectiu, c2.entrenables_objectiu, 'entrenaments distints → objectius distints');
assert.notEqual(c1.total, c2.total, 'entrenaments distints → plantilles mínimes distintes');

// Règim: amb UN sol rol no hi ha rotació de 2 blocs → la meitat de capacitat.
assert.equal(entrenablesObjectiu(cfgCreativitat.slots, 1), 4, 'un sol partit → 4 (sense rotació)');
assert.equal(entrenablesObjectiu(cfgDefensa.slots, 1), 5);

// Poms: porters i marge d'absències mouen el mínim (política, no codi).
assert.equal(cobertura(cfgCreativitat, { futur_entrenador: 1, porters_minims: 3, marge_absencies: 0 }).total, 8 + 1 + 3 + 4);

// ── 2c · LA LIQUIDACIÓ RESPECTA LA COBERTURA ──
{
  const cand = [
    { jugador_id: 1, nom: 'Barat', posicio: 'DC', sou: 1000, valor: 500 },
    { jugador_id: 2, nom: 'Car', posicio: 'DC', sou: 9000, valor: 90000 },
    { jugador_id: 3, nom: 'Porter', posicio: 'PO', sou: 5000, valor: 1000 },
  ];
  // Cos de camp = 4; si es venen els 2 de camp en queden 2, per davall del mínim 3 → en reté 1.
  const r = retingutsPerCobertura(cand, { camp_minim: 3, cos_camp: 4, posicio_porter: 'PO' });
  assert.equal(r.size, 1, 'reté els justos per a no baixar del mínim');
  assert.ok(r.has(1), 'reté el de MENYS VALOR de venda');
  assert.ok(!r.has(3), 'el porter no compta per al cos de camp');
  // Amb cos de sobra, no reté ningú.
  assert.equal(retingutsPerCobertura(cand, { camp_minim: 3, cos_camp: 20, posicio_porter: 'PO' }).size, 0, 'amb marge, es venen tots');
  // Sense cobertura calculada, no reté ningú (no inventa retencions).
  assert.equal(retingutsPerCobertura(cand, {}).size, 0, 'sense cobertura → cap retenció');
}

// ── 1 · LA RETENCIÓ MINIMITZA VALOR RENUNCIAT, NO SOU ──
{
  // El de MENYS VALOR té el sou MÉS ALT: si es retinguera pel sou (com abans), es
  // retindria l'actiu valuós i es renunciaria a la venda bona. Ha de manar el VALOR.
  const cand = [
    { jugador_id: 1, nom: 'SenseValor', posicio: 'DC', sou: 9000, valor: 200 },
    { jugador_id: 2, nom: 'ActiuBo', posicio: 'DC', sou: 1000, valor: 80000 },
  ];
  const r = retingutsPerCobertura(cand, { camp_minim: 1, cos_camp: 1, posicio_porter: 'PO' });
  assert.ok(r.has(1) && !r.has(2), 'reté el de menys valor encara que tinga el sou més alt');

  // El SOU només DESEMPATA quan el valor és igual.
  const iguals = [
    { jugador_id: 1, posicio: 'DC', sou: 5000, valor: 1000 },
    { jugador_id: 2, posicio: 'DC', sou: 500, valor: 1000 },
  ];
  const r2 = retingutsPerCobertura(iguals, { camp_minim: 1, cos_camp: 1, posicio_porter: 'PO' });
  assert.ok(r2.has(2), 'a igualtat de valor, el sou desempata (es queda el més barat)');

  // COIXÍ PREFERENT: un cos d'alliberament/despatx es reté abans que cap actiu amb valor.
  const ambCoixi = [
    { jugador_id: 1, posicio: 'DC', sou: 1000, valor: 300, categoria: 'venda' },
    { jugador_id: 2, posicio: 'DC', sou: 1000, valor: 50000, categoria: 'venda' },
    { jugador_id: 9, posicio: 'DC', sou: 1000, valor: 40000, categoria: 'alliberament' },
  ];
  const r3 = retingutsPerCobertura(ambCoixi, { camp_minim: 1, cos_camp: 1, posicio_porter: 'PO' });
  assert.ok(r3.has(9), 'el cos d\'alliberament és coixí preferent, encara que puntue alt');
  assert.ok(!r3.has(2), 'cap actiu de valor queda retingut havent-hi coixí');
}

// ── 3 · UNA SOLA FONT DE «LLISTABLE ARA»: el recompte i el sou de l'alerta agregada
// han de coincidir EXACTAMENT amb les files marcades llistables. ──
{
  const venda = [
    { jugador_id: 1, nom: 'A', categoria: 'venda', posicio: 'DC', sou: 3000, valor: 10000, edat_dies: 40, edat_anys: 22 },
    { jugador_id: 2, nom: 'B', categoria: 'venda', posicio: 'DC', sou: 2000, valor: 9000, edat_dies: 40, edat_anys: 22 },
    { jugador_id: 3, nom: 'L', categoria: 'venda', posicio: 'DC', sou: 7000, valor: 8000, edat_dies: 40, edat_anys: 22, lesio: '2' },
    { jugador_id: 4, nom: 'R', categoria: 'venda', posicio: 'DC', sou: 500, valor: 100, edat_dies: 40, edat_anys: 22 },
  ];
  const opts = { camp_minim: 1, cos_camp: 3, posicio_porter: 'PO' };
  const conj = conjuntLiquidacio(venda, opts);
  assert.equal(conj.lesionats.length, 1, 'el lesionat fora del conjunt llistable');
  assert.equal(conj.retinguts.length, 1, 'un retingut per cobertura');
  assert.equal(conj.retinguts[0].jugador_id, 4, 'reté el de menys valor');
  assert.deepEqual(conj.llistables.map((j) => j.jugador_id), [1, 2], 'llistables = venda − lesionats − retinguts');

  // L'alerta agregada surt del MATEIX conjunt: mateix recompte i mateix sou total.
  const ctx = { dataInstantania: '2026-07-21', any_dies: 112, porter_notable_min: 7, jugadors: venda,
    cobertura: opts, mercat: { depressio: false, modificador: 0 } };
  const a = REGLES.ALR_LLISTAR_VENDA(ctx, { urgencia: 72, urgencia_normal: 55, urgencia_lesionat: 40, dies_aniversari: 14, posicio_porter: 'PO', depressio_profunda: -20 });
  const agr = a.find((x) => String(x.missatge_clau).startsWith('alerta.llistar_agregat'));
  assert.ok(agr, 'hi ha alerta agregada');
  assert.equal(agr.parametres.n, conj.llistables.length, 'el recompte de l\'alerta = files llistables');
  assert.equal(agr.parametres.sou_total, conj.llistables.reduce((s, j) => s + j.sou, 0), 'el sou total de l\'alerta = sou de les files llistables');
  assert.equal(agr.parametres.sou_total, 5000);
  // I l'estat de fitxa el dona la mateixa font.
  assert.equal(estatLiquidacio(venda[3], conj), 'retingut');
  assert.equal(estatLiquidacio(venda[2], conj), 'lesionat');
  assert.equal(estatLiquidacio(venda[0], conj), 'llistable');
}

// La regla de liquidació NO dispara per al retingut per cobertura.
{
  const ctx = {
    dataInstantania: '2026-07-21', any_dies: 112, porter_notable_min: 7,
    cobertura: { camp_minim: 2, cos_camp: 2 },
    mercat: { depressio: false, modificador: 0 },
    jugadors: [
      { jugador_id: 1, nom: 'A', categoria: 'venda', posicio: 'DC', edat_dies: 40, edat_anys: 22, sou: 1000 },
      { jugador_id: 2, nom: 'B', categoria: 'venda', posicio: 'DC', edat_dies: 40, edat_anys: 22, sou: 2000 },
    ],
  };
  const p = { urgencia: 72, urgencia_normal: 55, dies_aniversari: 14, posicio_porter: 'PO', depressio_profunda: -20 };
  const a = REGLES.ALR_LLISTAR_VENDA(ctx, p);
  assert.equal(a.length, 0, 'els dos els necessita la cobertura mínima → cap alerta de llistar');
}

// I l'objectiu del nucli es deriva de la cobertura, no del pom.
{
  const ctx = { jugadors: Array.from({ length: 6 }, (_, i) => ({ jugador_id: i, categoria: 'entrenable' })), cobertura: { entrenables_objectiu: 10 } };
  const a = REGLES.ALR_NUCLI_INCOMPLET(ctx, { objectiu: 8, urgencia: 60 });
  assert.equal(a.length, 1, '6 < 10 derivat → alerta');
  assert.equal(a[0].parametres.objectiu, 10, 'l\'objectiu ve de la cobertura derivada, no del pom 8');
  assert.equal(a[0].parametres.falten, 4);
}

console.log('OK — cobertura mínima derivada de l\'entrenament (2 configs), retenció i regles');

// ── 2 · CAS (c) DELS MARGES: actual DESCONEGUT + potencial CONEGUT no és marge 0 ──
// Propietat que faltava: un potencial conegut ALT val MÉS que un jugador del tot
// desconegut, i li guanya la plaça del seu component (no queda a estructura).
{
  const { valorHabilitat } = await import('../lib/ranquing_juvenil.js');
  const { alineaJuvenil } = await import('../lib/alineacio_juvenil.js');
  const o = { valor_esperat_desconegut: 5, marge_esperat: 3, f_marge: 0.5 };
  const potAlt = { jugador_id: 1, nom: 'PotAlt', creativitat_actual: 'desconegut', creativitat_potencial: 8 };
  const totDesc = { jugador_id: 2, nom: 'TotDesc', creativitat_actual: 'desconegut' };
  const vAlt = valorHabilitat(potAlt, 'creativitat', o);
  const vDesc = valorHabilitat(totDesc, 'creativitat', o);
  assert.ok(vAlt > vDesc, `potencial conegut alt ha de valdre MÉS que el tot desconegut (${vAlt} vs ${vDesc})`);
  assert.equal(vAlt, 6.5, 'min(esperat,potencial)=5 + (8−5)×0.5 = 6.5 — marge REAL, no 0');
  // Un potencial conegut BAIX val MENYS que el tot desconegut (informació dolenta és dolenta).
  assert.ok(valorHabilitat({ jugador_id: 3, creativitat_actual: 'desconegut', creativitat_potencial: 3 }, 'creativitat', o) < vDesc,
    'potencial conegut BAIX val menys que el desconegut');

  // I guanya la plaça del seu component: el tot desconegut no li lleva l'MC.
  const opts = { entrenamentA: 'creativitat', entrenamentB: 'passades',
    taulaEntrenament: { creativitat: ['mc'], passades: ['mc', 'extrem', 'davanter'] },
    formacio: { mc: 1, defensa: 1 }, maxims: { mc: 1, defensa: 1 }, minim: 1 };
  const r = alineaJuvenil([{ ...potAlt, nivell: 1 }, { ...totDesc, nivell: 9 }], opts);
  const mc = r.onze.find((s) => s.bucket === 'mc');
  assert.equal(mc.nom, 'PotAlt', 'el potencial conegut alt guanya la plaça del seu component');
  assert.notEqual(mc.motiu, 'estructura', 'i no hi va com a estructura');
}

// ── 6 · ETIQUETA MIXTA a l'onze juvenil ──
{
  const { alineaJuvenil } = await import('../lib/alineacio_juvenil.js');
  const opts = { entrenamentA: 'creativitat', entrenamentB: 'passades',
    taulaEntrenament: { creativitat: ['mc'], passades: ['mc', 'extrem', 'davanter'] },
    formacio: { mc: 1, defensa: 1 }, maxims: { mc: 1, defensa: 1 }, minim: 1 };
  // Coneix creativitat (component A) i desconeix passades (component B) → MIXT.
  const mixt = { jugador_id: 1, nom: 'Mixt', nivell: 9, creativitat_actual: 5, creativitat_potencial: 8 };
  const r = alineaJuvenil([mixt, { jugador_id: 2, nom: 'X', nivell: 1 }], opts);
  const mc = r.onze.find((s) => s.bucket === 'mc');
  assert.equal(mc.motiu, 'mixt', 'entrena una coneguda i en descobrix una altra');
  assert.equal(mc.habilitat_entrena, 'creativitat');
  assert.equal(mc.habilitat_descobrix, 'passades');
  // La capçalera el compta com a ENTRENANT (abans deia «0 entrenant» amb el millor conegut d'MC).
  assert.equal(r.entrenen, 1, 'el mixt compta com a entrenant');
  assert.equal(r.descobriments, 1, 'i també com a descobriment');
}
