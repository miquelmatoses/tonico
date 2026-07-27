// Tonico — QUÈ FA FALTA FITXAR i què costa. node test/fitxatges.mjs
//
// La prioritat no és negociable: una PLAÇA BUIDA d'entrenament o de porter suplent va per
// damunt de qualsevol mancança de l'onze. Una plaça d'entrenament buida és entrenament perdut
// cada setmana i no es recupera; un lloc de l'onze fluix continua jugant.
//
// I el PREU no s'estima: a Hattrick no el calcula el joc, el paga un altre mànager. Mentre no
// estiga declarat, la necessitat es veu però no es pot decidir.
import assert from 'node:assert/strict';
import { necessitats, ambPreus, cercaDe, clauFitxatge } from '../lib/fitxatges.js';

const est = {
  entrenables: [{ id: 1 }], entrenables_max: 3, porter_suplent: null,
  onze: [
    { bucket: 'mc', nivell_objectiu: 9, diferencia: -3 },
    { bucket: 'mc', nivell_objectiu: 9, diferencia: -2 },
    { bucket: 'mc', nivell_objectiu: 9, diferencia: -1 },   // un sol nivell: no és forat
    { bucket: 'davanter', nivell_objectiu: 9, diferencia: -4 },
    { bucket: 'defensa', nivell_objectiu: 8, diferencia: 0 },
    { bucket: 'porter', nivell_objectiu: 5, diferencia: 2 },
  ],
};
const pesos = { mc: 1.46, davanter: 0.89, defensa: 0.74, porter: 0.66 };
const n = necessitats(est, { entrenable_min: 6, pesos });

// ── 1. Les places buides manen ──
assert.equal(n[0].tipus === 'entrenable' || n[0].tipus === 'porter_suplent', true);
const buides = n.filter((x) => x.prioritat === Infinity).map((x) => x.tipus);
assert.deepEqual(buides.sort(), ['entrenable', 'porter_suplent'],
  'dues places buides, i les dues per damunt de qualsevol mancança');
assert.equal(n.find((x) => x.tipus === 'entrenable').quants, 2, 'en falten dos dels tres');

// ── 2. Un sol nivell de distància NO és un fitxatge ──
assert.ok(!n.some((x) => x.tipus === 'lloc' && x.bucket === 'defensa'),
  'qui arriba al seu nivell no es toca');
assert.ok(!n.some((x) => x.tipus === 'lloc' && x.bucket === 'porter'),
  'ni qui va sobrat (i el porter suplent buit és una altra cosa: eixe sí que hi és)');
const mc = n.find((x) => x.clau === 'mc:9');
assert.equal(mc.quants, 2, 'els dos llocs de mig centre a dos o més nivells, no el de −1');
assert.equal(mc.mancanca, 3, 'i la mancança que mana és la pitjor de les seues');

// ── 3. Un TIPUS de fitxatge, no un lloc: dos llocs iguals són una sola cerca ──
assert.equal(clauFitxatge('lloc', 'mc', 9), 'mc:9');
assert.equal(n.filter((x) => x.bucket === 'mc' && x.tipus === 'lloc').length, 1,
  'els dos llocs de mig centre es demanen una vegada');

// ── 4. L'orde de la resta és `mancança × pes`, la mètrica única ──
const nomesLlocs = n.filter((x) => x.tipus === 'lloc');
assert.deepEqual(nomesLlocs.map((x) => x.clau), ['mc:9', 'davanter:9'],
  'mc 3×1,46=4,38 per damunt de davanter 4×0,89=3,56');

// ── 5. SENSE PREU no es decidix ──
{
  const buit = ambPreus(n, new Map(), 173004);
  assert.ok(buit.every((x) => x.falta === 'preu' && !x.admissible),
    'mentre no hi haja preu declarat, es veu la necessitat però no es pot comprar');
}

// ── 6. Amb preu, mana la CAIXA ──
{
  const preus = new Map([['mc:9', { preu: 120000, data: '2026-07-20' }],
    ['davanter:9', { preu: 900000, data: '2026-07-20' }]]);
  const amb = ambPreus(n, preus, 173004);
  assert.equal(amb.find((x) => x.clau === 'mc:9').admissible, true, 'entra a la caixa');
  assert.equal(amb.find((x) => x.clau === 'davanter:9').admissible, false, 'este no');
  assert.equal(amb.find((x) => x.clau === 'davanter:9').falta, 'caixa',
    'i es diu que el que falta són diners, no el preu');
}

// ── 7. Un preu VELL es marca: el mercat es mou ──
{
  const preus = new Map([['mc:9', { preu: 120000, data: '2026-05-01' }]]);
  const amb = ambPreus(n, preus, 173004, 4, '2026-07-26');
  assert.equal(amb.find((x) => x.clau === 'mc:9').preu_vell, true, 'dotze setmanes és massa');
  const fresc = ambPreus(n, new Map([['mc:9', { preu: 120000, data: '2026-07-20' }]]), 173004, 4, '2026-07-26');
  assert.equal(fresc.find((x) => x.clau === 'mc:9').preu_vell, false, 'una setmana no');
}

// ── 8. La CERCA d'una necessitat: cada tipus busca una cosa distinta, i qui decidix si hi ha
// caixa és ací, no la vista (invariant 12: la vista tria text, no compara). ──
{
  const opts = { posicions: { mc: ['MC'] }, habilitats: { mc: 'creativitat' }, edat_min: 17, edat_max: 20 };
  const ent = cercaDe({ tipus: 'entrenable', bucket: 'mc', nivell: 6 }, { ...opts, caixa: 173004 });
  assert.equal(ent.edat_min, 17, "l'entrenable es busca jove");
  assert.equal(ent.habilitat.min, 6, 'i per damunt del mínim');
  assert.equal(ent.sense_caixa, false, 'amb caixa declarada, hi ha pressupost');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', nivell: 9 }, opts).edat_min, undefined,
    "a un lloc de l'onze l'edat no li importa: el que es vol és que arribe");
  assert.equal(cercaDe({ tipus: 'porter_suplent', bucket: 'porter' }, opts).mes_barat, true,
    'i el porter suplent es vol barat, res més');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', nivell: 9 }, { ...opts, caixa: 0 }).sense_caixa, true,
    'caixa a zero és no tindre caixa, no tindre-la declarada a zero');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', nivell: 9 }, opts).sense_caixa, true,
    'i sense caixa, la vista ho ha de saber sense comparar res');
}

console.log('OK — fitxatges: les places buides manen, un nivell no és forat, i sense preu no es decidix');
