// Tonico — VENDRE (contracte v3.1, PAS 7). SENSE estimació de preu: l'orde el porta
// `sobrecost` i «es ven o s'acomiada» el decidix la SUBHASTA. node test/venda_desti.mjs
import assert from 'node:assert/strict';
import { motiuVenda, ordreVenda, urgent, desti, subhastaDeserta, despatxable,
  habilitatMax } from '../lib/vendes.js';

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
assert.equal(motiuVenda(j, { sobrecost: 500, calibrat: true }), 'sou_desproporcionat');

// EL STOPPER: sense calibrar, el sou no desfà de ningú. `sobrecost` penja del flux, i el flux
// amb poques setmanes és soroll. Els altres dos motius SÍ que seguixen vius, que no en depenen.
assert.equal(motiuVenda(j, { sobrecost: 99999, calibrat: false }), null,
  'sense calibrar, cap venda per sou — ni amb un sobrecost enorme');
assert.equal(motiuVenda(j, { esRotatiu: true, temporada: 86, horitzo_eixida: 85, calibrat: false }),
  'pic_de_valor', 'el pic de valor va per EDAT: no depén del flux');
assert.equal(motiuVenda(j, { enVenda: true, calibrat: false }), 'sobrant',
  'i el sobrant va per estructura de plantilla: tampoc');
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

// ── LA SUBHASTA DESERTA ES DEDUÏX, NO ES PREGUNTA ──────────────────────────────────────
// Si un jugador estava transferible, ja no ho està i SEGUIX A LA PLANTILLA, ningú l'ha
// comprat. Preguntar-ho era demanar-li a Miquel una cosa que el sistema ja sap: era la
// pantalla dient «Lizer Castelló ha eixit, què va passar?» d'algú que no s'havia venut.
assert.equal(subhastaDeserta({ transferible_abans: 1, transferible_ara: null, en_plantilla: true }), true,
  'estava llistat, ja no, i seguix ací → deserta');
assert.equal(subhastaDeserta({ transferible_abans: 1, transferible_ara: null, en_plantilla: false }), false,
  'si ja no és a la plantilla, l\'han comprat: eixe és el camí del motiu de baixa');
assert.equal(subhastaDeserta({ transferible_abans: 1, transferible_ara: 1, en_plantilla: true }), false,
  'mentres seguix llistat, la subhasta encara no ha acabat');
assert.equal(subhastaDeserta({ transferible_abans: null, transferible_ara: null }), false,
  'qui no estava llistat no pot quedar desert');

// I el que en resulta: DESPATXABLE només si a més sobra.
assert.equal(despatxable({ es_sobrant: true, desert: true }), true,
  'sobrant + ningú el vol → despatxa\'l');
assert.equal(despatxable({ es_sobrant: false, desert: true }), false,
  'un retingut desert MAI: no és un veredicte sobre ell, és que el preu no era el bo');
assert.equal(despatxable({ es_sobrant: true, desert: false }), false,
  'i un sobrant que encara no s\'ha llistat tampoc');

console.log('OK — PAS 7 v3.1: sense estimació de preu, la subhasta decidix');
