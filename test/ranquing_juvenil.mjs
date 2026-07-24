// Tonico — rànquing juvenil per NIVELL numèric (doctrina v3 bloc 2). Fixtures sintètics,
// cap dada de cap acadèmia real. node test/ranquing_juvenil.mjs
import assert from 'node:assert/strict';
import { ranquingJuvenil, valorHabilitat, valorEsperatDesconegut, lecturaPromocio } from '../lib/ranquing_juvenil.js';

const o = { f_marge: 0.5, marge_esperat: 3, valor_esperat_desconegut: 5 };
const vh = (fields, skill) => valorHabilitat(fields, skill, o);

// a) bo-no-capat > desconegut > baix
const bo = vh({ creativitat_actual: '6', creativitat_potencial: '8' }, 'creativitat');   // 6 + 2·0,5 = 7
const desc = vh({ creativitat_actual: 'desconegut' }, 'creativitat');                     // 5
const baix = vh({ creativitat_actual: '2', creativitat_potencial: '3' }, 'creativitat');  // 2 + 0,5 = 2,5
assert.ok(bo > desc && desc > baix, `bo(${bo}) > desconegut(${desc}) > baix(${baix})`);

// b) un capat val l'actual PELAT; un actual alt capat supera un mitjà amb marge
const capatAlt = vh({ creativitat_actual: '8', creativitat_potencial: '8' }, 'creativitat');   // 8
const mitjaMarge = vh({ creativitat_actual: '5', creativitat_potencial: '9' }, 'creativitat');  // 5 + 2 = 7
assert.equal(capatAlt, 8, 'capat = actual pelat');
assert.ok(capatAlt > mitjaMarge, 'actual alt capat supera un mitjà amb marge');

// c) un B ROÍN CONEGUT puntua per davall d'un B DESCONEGUT (la loteria > el bitllet ratllat)
const bRoin = vh({ passades_actual: '2', passades_potencial: '2' }, 'passades');   // 2
const bDesc = vh({ passades_actual: 'desconegut' }, 'passades');                   // 5
assert.ok(bRoin < bDesc, `B roín conegut(${bRoin}) < B desconegut(${bDesc})`);

// d) el pom autocalibra: revelacions pròpies baixes → valor esperat baix
const alta = valorEsperatDesconegut([{ creativitat_actual: '8' }, { creativitat_actual: '7' }], 'creativitat', 5);
const baixa = valorEsperatDesconegut([{ creativitat_actual: '2' }, { creativitat_actual: '3' }], 'creativitat', 5);
assert.ok(baixa < alta, `autocalibra: acadèmia baixa(${baixa}) < acadèmia alta(${alta})`);
assert.equal(valorEsperatDesconegut([{ creativitat_actual: 'desconegut' }], 'creativitat', 5), 5, 'sense revelacions → defecte');

// El rànquing ordena per NIVELL descendent (generalitat: A i B config).
const r = ranquingJuvenil([
  { jugador_id: 1, nom: 'A', creativitat_actual: '6', creativitat_potencial: '8' },
  { jugador_id: 2, nom: 'B', creativitat_actual: '2', creativitat_potencial: '3' },
  { jugador_id: 3, nom: 'C', creativitat_actual: 'desconegut' },
], { entrenamentA: 'creativitat', entrenamentB: 'passades' });
assert.equal(r[0].jugador_id, 1, 'el de més nivell primer');
assert.ok(r[0].nivell > r[1].nivell && r[1].nivell > r[2].nivell, 'nivells estrictament decreixents (cap empat artificial)');

// ── Punt 4a: lectura de PROMOCIÓ (millor NIVELL elegible: 17a I 112d) ──
const rang2 = [
  { jugador_id: 1, nom: 'A', nivell: 10, posicio_rang: 1 },
  { jugador_id: 2, nom: 'B', nivell: 5, posicio_rang: 2 },
  { jugador_id: 3, nom: 'C', nivell: 2, posicio_rang: 3 },
];
const juv = [
  { jugador_id: 1, edat_anys: 16, dies_al_promocionar: 120 },   // massa jove → NO elegible
  { jugador_id: 2, edat_anys: 17, dies_al_promocionar: 120 },   // elegible
  { jugador_id: 3, edat_anys: 18, dies_al_promocionar: 120 },   // elegible
];
const pr = lecturaPromocio(rang2, juv, { edat_min: 17, dies_academia_min: 112 });
assert.equal(pr.proposta.jugador_id, 2, 'el millor NIVELL entre els elegibles (el de nivell 10 no té 17a)');
assert.equal(pr.proposta.cua, false, 'no és cua');
// Dues condicions independents: 17a però NOMÉS 100 dies d'acadèmia → no elegible.
assert.equal(lecturaPromocio(rang2, [{ jugador_id: 3, edat_anys: 18, dies_al_promocionar: 100 }], { edat_min: 17, dies_academia_min: 112 }).proposta, null, '17a però <112d → no elegible');
// L'únic elegible és cua del rànquing → despatx/promocionar-per-vendre.
const prT = lecturaPromocio(rang2, [{ jugador_id: 3, edat_anys: 18, dies_al_promocionar: 120 }], { edat_min: 17, dies_academia_min: 112 });
assert.equal(prT.proposta.jugador_id, 3);
assert.equal(prT.proposta.cua, true, 'l\'únic elegible és cua → despatx/vendre en compte de promoció');
assert.equal(lecturaPromocio(rang2, [{ jugador_id: 1, edat_anys: 15 }], {}).proposta, null, 'cap elegible → cap proposta');

console.log('OK — rànquing juvenil: fórmula del NIVELL (4 propietats) + orde + promoció (4a)');
