// Tonico — VENDRE (contracte v3.1, PAS 7). SENSE estimació de preu: l'orde el porta
// `sobrecost` i «es ven o s'acomiada» el decidix la SUBHASTA. node test/venda_desti.mjs
import assert from 'node:assert/strict';
import { motiuVenda, ordreVenda, urgent, desti, preguntaVenda, destiDeserta,
  EIXIDES_DESERTA, habilitatMax } from '../lib/vendes.js';

const j = { creativitat: 8, passades: 6, sou: 500 };

// ── habilitat_max: lectura del CSV, no càlcul de valor ──
assert.equal(habilitatMax(j), 8);
assert.equal(habilitatMax({}), 0, 'sense habilitats, 0 — i «no ho sabem» no és «no val res»');

// ── urgent: només l'aniversari (el v3 va retirar la clàusula de porter de la Junta) ──
assert.equal(urgent(10, 14), true);
assert.equal(urgent(20, 14), false);
assert.equal(urgent(null, 14), false, 'sense dada no s\'inventa urgència');

// ── motiu_venda ──
assert.equal(motiuVenda(j, { esRotatiu: true, temporada: 86, horitzo_eixida: 85 }), 'pic_de_valor');
assert.equal(motiuVenda(j, { sobrecost: 500 }), 'sou_desproporcionat');
assert.equal(motiuVenda(j, { enVenda: true }), 'sobrant');
assert.equal(motiuVenda(j, {}), null, 'un retingut sense sobrecost no té motiu de venda');

// ── ordre_venda: NOMÉS sobrecost (v3.1). El segon criteri era `preu_esperat DESC`, o siga
// una xifra inventada ordenant la llista. Ara ordena una xifra pròpia i prou.
assert.deepEqual(ordreVenda([
  { id: 'a', sobrecost: 0 }, { id: 'b', sobrecost: 700 }, { id: 'c', sobrecost: 300 },
]).map((x) => x.id), ['b', 'c', 'a']);

// ── destí: TRES branques (la de «despatxa per valor_net baix» ha caigut amb el preu) ──
assert.equal(desti(j, { lesionat: true }).accio, 'agenda_llistar_en_recuperar');
// El bug d'unitats que es manté cobert: amb −20 la branca no s'activava mai; amb −0,20 sí.
assert.equal(desti(j, { modificador_tancament: -0.15, depressio_profunda: -20 }).accio, 'llista_hui',
  'en enters, la depressió profunda era inassolible');
assert.equal(desti(j, { modificador_tancament: -0.25, depressio_profunda: -0.20 }).accio, 'agenda_llistar',
  'en fracció, la depressió profunda ajorna');
assert.equal(desti(j, { modificador_tancament: -0.25, depressio_profunda: -0.20, urgent: true }).accio, 'llista_hui',
  'un urgent no espera la recuperació del mercat');
// Cap combinació proposa despatxar: això ja no el decidix una previsió.
for (const o of [{}, { modificador_tancament: -0.9, depressio_profunda: -0.2 }, { urgent: true }]) {
  assert.notEqual(desti(j, o).accio, 'despatxa', 'el destí ja no despatxa per una estimació');
}

// ── LA PREGUNTA i el destí de la subhasta deserta ──
assert.deepEqual(EIXIDES_DESERTA, ['rebaixar', 'rellistar', 'despatxar', 'un_euro']);
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: null })?.pregunta, 'venut_o_deserta',
  'el dispar és la transició entre INSTANTÀNIES, no l\'estat de la fitxa');
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: null, venda_apuntada: true }), null,
  'si ja sabem què va passar, no es pregunta');
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: 1 }), null,
  'mentres seguix llistat, no es pregunta');

// ES LLISTA UNA VEGADA: un SOBRANT desert s'acomiada; un retingut, mai.
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: null, es_sobrant: true }).recomanada,
  'despatxar', 'per a un sobrant, la recomanada és despatxar-lo');
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: null, es_sobrant: false }).recomanada,
  null, 'per a un retingut no es recomana res: que decidisca Miquel');
assert.equal(destiDeserta({ es_sobrant: true }).accio, 'despatxa',
  'rellistar un sobrant cada setmana és pagar la taxa per res');
assert.equal(destiDeserta({ es_sobrant: false }).accio, 'pregunta',
  'un retingut desert no és un veredicte: és que el preu no era el bo');

console.log('OK — PAS 7 v3.1: sense estimació de preu, la subhasta decidix');
