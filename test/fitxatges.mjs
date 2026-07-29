// Tonico — QUÈ FA FALTA FITXAR i què costa. node test/fitxatges.mjs
//
// L'ORDE ÉS LA DISTÀNCIA A L'OBJECTIU: quants nivells li falten al lloc. Menys de dos no
// compta —s'arregla entrenant o esperant— i un lloc SOBRAT tampoc: no es pot arreglar
// comprant, perquè l'assignació torna a donar el lloc al millor i el fitxatge se'n va al
// residu. El sobrat el governa el `sobrecost`, a Vendes.
//
// Per damunt de tot, les PLACES BUIDES: una plaça d'entrenament buida és entrenament perdut
// cada setmana i no es recupera; un lloc de l'onze fluix continua jugant.
//
// I el PREU no s'estima: a Hattrick no el calcula el joc, el paga un altre mànager. Mentre no
// estiga declarat, la necessitat es veu però no es pot decidir.
import assert from 'node:assert/strict';
import { necessitats, ambPreus, cercaDe, clauFitxatge } from '../lib/fitxatges.js';

const est = {
  entrenables: [{ id: 1 }], entrenables_max: 3, porter_suplent: null,
  onze: [
    { bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 3 },
    { bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 2 },
    { bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 1 },   // un sol nivell: no és forat
    { bucket: 'davanter', perfil_objectiu: { anotacio: 9, passades: 5 }, distancia: 4 },
    { bucket: 'defensa', perfil_objectiu: { defensa: 8 }, distancia: 0 },
    { bucket: 'porter', perfil_objectiu: { porteria: 5 }, distancia: 0 },   // va sobrat: no li falta res
    { bucket: 'extrem', perfil_objectiu: { extrem: 9 }, distancia: 0 },   // per damunt del perfil: cap forat
    { bucket: 'lateral', perfil_objectiu: { defensa: 7, extrem: 4 }, distancia: null },   // SENSE NINGÚ
  ],
};
const n = necessitats(est, { entrenable_min: 6 });

// ── 1. Les places buides manen ──
assert.equal(n[0].tipus === 'entrenable' || n[0].tipus === 'porter_suplent', true);
// UN LLOC DE L'ONZE SENSE NINGÚ va amb els altres buits, per damunt de tot: és el senyal
// més fort que hi ha. Abans no eixia a la llista —`diferencia` és null quan no hi ha
// ocupant i el filtre el treia—, o siga que l'única cosa que no produïa res era justament
// «ahí no juga ningú».
const buides = n.filter((x) => x.distancia === Infinity).map((x) => x.motiu ?? x.tipus);
assert.deepEqual(buides.sort(), ['lloc_buit', 'placa_entrenament_buida', 'sense_porter_suplent'],
  'les tres menes de buit van per damunt de qualsevol distància');
assert.deepEqual(n.find((x) => x.motiu === 'lloc_buit').perfil, { defensa: 7, extrem: 4 },
  'i es diu quin PERFIL demana el lloc que s\'ha quedat sense ningú');
assert.equal(n.find((x) => x.tipus === 'entrenable').quants, 2, 'en falten dos dels tres');

// ── 2. Un sol nivell de distància NO és un fitxatge ──
assert.ok(!n.some((x) => x.tipus === 'lloc' && x.bucket === 'defensa'),
  'qui arriba al seu nivell no es toca');
assert.ok(!n.some((x) => x.tipus === 'lloc' && x.bucket === 'extrem'),
  'ni un sol nivell de distància');
const mc = n.find((x) => x.clau === 'mc:cre9-def6');
assert.equal(mc.quants, 2, 'els dos llocs de mig centre a dos o més nivells, no el de −1');
assert.equal(mc.distancia, 3, 'i la distància que mana és la pitjor de les seues');

// ── 2b. PER DALT NO COMPTA ──
// El porter va quatre nivells per damunt del que el flux paga. Està fora de lloc, però no hi
// ha cap compra que ho arregle: l'assignació tria el millor de l'habilitat per a cada lloc, o
// siga que un porter del nivell prescrit se n'aniria al residu i el de 9 es quedaria el lloc.
// Qui diu «ahí pagues de més» és el sobrecost, a Vendes.
assert.ok(!n.some((x) => x.bucket === 'porter' && x.tipus === 'lloc'),
  'un lloc sobrat no és una necessitat de mercat');

// ── 3. Un TIPUS de fitxatge, no un lloc: dos llocs iguals són una sola cerca ──
assert.equal(clauFitxatge('lloc', 'mc', { creativitat: 9, defensa: 6 }), 'mc:cre9-def6',
  'la clau porta el PERFIL: el preu és d\'este jugador, no d\'«un mig centre» qualsevol');
assert.notEqual(clauFitxatge('lloc', 'mc', { creativitat: 10, defensa: 6 }),
  clauFitxatge('lloc', 'mc', { creativitat: 9, defensa: 6 }),
  'i si el pressupost mou el perfil, la clau canvia i el preu vell deixa de valdre');
assert.equal(n.filter((x) => x.bucket === 'mc' && x.tipus === 'lloc').length, 1,
  'els dos llocs de mig centre es demanen una vegada');

// ── 4. L'ORDE: qui més lluny està del seu objectiu ──
const nomesLlocs = n.filter((x) => x.tipus === 'lloc');
assert.deepEqual(nomesLlocs.map((x) => x.clau), ['lateral:def7-ext4:buit', 'davanter:ano9-pas5', 'mc:cre9-def6'],
  'el lloc sense ningú primer; després davanter −4 i mig centre −3: qui més lluny està');

// ── 5. SENSE PREU no es decidix ──
{
  const buit = ambPreus(n, new Map(), 173004);
  assert.ok(buit.every((x) => x.falta === 'preu' && !x.admissible),
    'mentre no hi haja preu declarat, es veu la necessitat però no es pot comprar');
}

// ── 6. Amb preu, mana la CAIXA ──
{
  const preus = new Map([['mc:cre9-def6', { preu: 120000, data: '2026-07-20' }],
    ['davanter:ano9-pas5', { preu: 900000, data: '2026-07-20' }]]);
  const amb = ambPreus(n, preus, 173004);
  assert.equal(amb.find((x) => x.clau === 'mc:cre9-def6').admissible, true, 'entra a la caixa');
  assert.equal(amb.find((x) => x.clau === 'davanter:ano9-pas5').admissible, false, 'este no');
  assert.equal(amb.find((x) => x.clau === 'davanter:ano9-pas5').falta, 'caixa',
    'i es diu que el que falta són diners, no el preu');
}

// ── 7. Un preu VELL es marca: el mercat es mou ──
{
  const preus = new Map([['mc:cre9-def6', { preu: 120000, data: '2026-05-01' }]]);
  const amb = ambPreus(n, preus, 173004, 4, '2026-07-26');
  assert.equal(amb.find((x) => x.clau === 'mc:cre9-def6').preu_vell, true, 'dotze setmanes és massa');
  const fresc = ambPreus(n, new Map([['mc:cre9-def6', { preu: 120000, data: '2026-07-20' }]]), 173004, 4, '2026-07-26');
  assert.equal(fresc.find((x) => x.clau === 'mc:cre9-def6').preu_vell, false, 'una setmana no');
}

// ── 8. La CERCA d'una necessitat: cada tipus busca una cosa distinta, i qui decidix si hi ha
// caixa és ací, no la vista (invariant 12: la vista tria text, no compara). ──
{
  const opts = { posicions: { mc: ['MC'] }, habilitats: { mc: 'creativitat' }, edat_min: 17, edat_max: 20 };
  const PERFIL_MC = { creativitat: 9, defensa: 6 };
  const ent = cercaDe({ tipus: 'entrenable', bucket: 'mc', nivell: 6 }, { ...opts, caixa: 173004 });
  assert.equal(ent.edat_min, 17, "l'entrenable es busca jove");
  assert.equal(ent.habilitat.min, 6, 'i per damunt del mínim');
  assert.equal(ent.sense_caixa, false, 'amb caixa declarada, hi ha pressupost');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', perfil: PERFIL_MC }, opts).edat_min, undefined,
    "a un lloc de l'onze l'edat no li importa: el que es vol és que arribe");
  assert.equal(cercaDe({ tipus: 'porter_suplent', bucket: 'porter' }, opts).mes_barat, true,
    'i el porter suplent es vol barat, res més');
  // UN LLOC DE L'ONZE ES BUSCA AMB EL PERFIL SENCER: mínim per habilitat, que és el que el
  // cercador de Hattrick admet. Amb una sola habilitat li demanaves «creativitat 9» a un lloc
  // que en vol quatre, i el filtre no era el que la vara mesurava.
  assert.deepEqual(cercaDe({ tipus: 'lloc', bucket: 'mc', perfil: PERFIL_MC }, opts).perfil, PERFIL_MC,
    'el perfil que mesura és el perfil que es busca');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', perfil: PERFIL_MC }, opts).habilitat, undefined,
    'i ja no es demana una sola habilitat');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', perfil: PERFIL_MC }, { ...opts, caixa: 0 }).sense_caixa, true,
    'caixa a zero és no tindre caixa, no tindre-la declarada a zero');
  assert.equal(cercaDe({ tipus: 'lloc', bucket: 'mc', perfil: PERFIL_MC }, opts).sense_caixa, true,
    'i sense caixa, la vista ho ha de saber sense comparar res');
}

console.log('OK — fitxatges: les places buides manen, la distància ordena i sense preu no es decidix');
