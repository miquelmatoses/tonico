// Tonico — doctrina juvenil v2: llenguatge pla, desconegut ≠ venda (cas Revelable),
// juga/no juga, fre de suplents i rànquing d'eixida. node test/juvenil_v2.mjs
import assert from 'node:assert/strict';
import { avaluaPipeline } from '../lib/juvenils_vista.js';
import { recomanaJoc, freSuplents, ranquingEixida, revelacions } from '../lib/juvenil.js';
import { alineaJuvenil } from '../lib/alineacio_juvenil.js';
import { REGLES } from '../lib/regles.js';

const pipe = { principal: 'creativitat', secundari: 'passades', vendibles: ['anotacio', 'extrem', 'defensa'],
  sostre_min: 2, vendible_min: 5, fabrica_min: 5 };
const fila = (o) => ({ creativitat_actual: null, creativitat_potencial: null, ...o });

// ── Punt 2: cas Revelable — creativitat NO revelada → per determinar, MAI venda ──
const pipeDesc = avaluaPipeline(fila({}), pipe);   // creativitat desconeguda
assert.equal(pipeDesc.desconegut, true);
assert.equal(pipeDesc.motiu, 'per_determinar');
assert.equal(pipeDesc.desti_promocio, 'per_determinar', 'desconegut no assumix venda');
assert.equal(pipeDesc.fora, false, 'sense dades no és fora de pipeline');

// Motius en llenguatge pla
assert.equal(avaluaPipeline(fila({ creativitat_actual: '3', creativitat_potencial: '3' }), pipe).motiu, 'topat');
assert.equal(avaluaPipeline(fila({ creativitat_actual: '1', creativitat_potencial: '2' }), pipe).motiu, 'sostre_baix');
assert.equal(avaluaPipeline(fila({ creativitat_actual: '4', creativitat_potencial: '7' }), pipe).motiu, 'creix');

// ── Punt 3c: juga/no juga ──
assert.deepEqual(recomanaJoc({ pipeline: pipeDesc }), { juga: true, motiu: 'revelar' }, 'interessant no descobert → juga (revelar)');
assert.deepEqual(recomanaJoc({ pipeline: { fora: true } }), { juga: false, motiu: 'dud' }, 'dud confirmat → banqueta');
assert.deepEqual(recomanaJoc({ pipeline: { fora: false, desconegut: false } }), { juga: true, motiu: 'entrena' });

// Fre de suplents: si TOTS juguen, no hi ha suplent
const totsJuguen = [{ pipeline: { desconegut: true } }, { pipeline: { desconegut: true } }];
assert.equal(freSuplents(totsJuguen).ok, false, 'sense banqueta → fre');
assert.equal(freSuplents([...totsJuguen, { pipeline: { fora: true } }]).ok, true, 'amb un dud a la banqueta → ok');

// ── Punt 3b: rànquing d'eixida — menys revelats primer, mai per davall de l'objectiu ──
const js = [
  { jugador_id: 1, nom: 'Dins', pipeline: { fora: false } },
  { jugador_id: 2, nom: 'DudDescobert', pipeline: { fora: true, revelats: 7, principal_potencial: 3 } },
  { jugador_id: 3, nom: 'DudMigDescobert', pipeline: { fora: true, revelats: 2, principal_potencial: 3 } },
];
assert.deepEqual(ranquingEixida(js, 2), [3], 'sobra 1 → ix el menys revelat (a mig descobrir)');
assert.deepEqual(ranquingEixida(js, 3), [], 'a l\'objectiu → no despatxa');

// ── Punt 2c: revelacions (comparador juvenil) com a FET ──
const prev = [{ jugador_id: 10, nom: 'Revelable', creativitat_actual: '?', passades_actual: '4' }];
const curr = [{ jugador_id: 10, nom: 'Revelable', creativitat_actual: '5', passades_actual: '4' }];
const rev = revelacions(prev, curr);
assert.deepEqual(rev, [{ jugador_id: 10, nom: 'Revelable', habilitat: 'creativitat', valor: 5 }], 'creativitat revelada');
assert.equal(REGLES.ALR_REVELACIO_JUVENIL({ revelacions: rev }, { urgencia: 40 })[0].parametres.valor, 5);
assert.equal(REGLES.ALR_REVELACIO_JUVENIL({ revelacions: [] }, { urgencia: 40 }).length, 0);

// ── Doctrina v3 bloc 2 · 1: assignació per GUANY MARGINAL (slot-centric), no aparellar rànquings ──
const taula = { porteria: ['porter'], defensa: ['defensa'], creativitat: ['mc'], passades: ['mc', 'extrem', 'davanter'], extrem: ['extrem'], anotacio: ['davanter'] };
const cfg = { formacio: { porter: 1, defensa: 2, mc: 3, extrem: 2, davanter: 1 }, maxims: { porter: 1, defensa: 5, mc: 3, extrem: 2, davanter: 3 },
  minim: 9, entrenamentA: 'creativitat', entrenamentB: 'passades', taulaEntrenament: taula, marge_esperat: 3, f_marge: 0.5, pes_a: 1, pes_b: 0.66 };
const jv = (id, niv, cA, cP, pA, pP) => ({ jugador_id: id, nom: 'J' + id, nivell: niv, dies_restants_promocio: 50, creativitat_actual: cA, creativitat_potencial: cP, passades_actual: pA, passades_potencial: pP });
// Marges CONDICIONALS: (a) actual conegut + potencial desconegut → marge PLE (guany alt);
// (d) marge real; (b) tot desconegut → guany BAIX; capat → 0. «Conegut bo mana» emergix sol.
const plantilla = [
  jv(0, 20, '9', '9', '9', '9'),                                          // capat en TOT (guany 0) però NIVELL alt
  jv(1, 8, '6', undefined, 'desconegut'), jv(2, 7, '6', undefined, 'desconegut'), jv(3, 6, '6', undefined, 'desconegut'),  // (a) creativitat bo + potencial ? → MC
  jv(4, 5, '6', '6', '3', '7'), jv(5, 4, '6', '6', '3', '6'), jv(6, 3, '6', '6', '3', '6'),   // (d) marge en B → extrem/davanter
  jv(7, 9, 'desconegut', undefined, 'desconegut'), jv(8, 2, 'desconegut', undefined, 'desconegut'),  // (b) tot desconegut → guany baix
  jv(9, 1, '5', '5', '5', '5'),                                            // capat, menys nivell → banqueta
];
const o = alineaJuvenil(plantilla, cfg);
assert.equal(o.en_camp, 9, '9 en camp');
assert.equal(o.no_viable, false, 'equip viable');
// 2a: els actuals BONS coneguts (a) reben els MC (component A) ABANS que els totalment
// desconeguts (b) — la doctrina «conegut bo mana» emergix del càlcul, sense regla especial.
assert.deepEqual(o.onze.filter((s) => s.bucket === 'mc').map((s) => s.jugador_id).sort((a, b) => a - b), [1, 2, 3], 'MC per als coneguts bons (marge ple), no als desconeguts');
// Un capat en tot (guany ~0) va a ESTRUCTURA encara amb el NIVELL més alt.
assert.equal(o.onze.find((s) => s.jugador_id === 0).motiu, 'estructura', 'capat de nivell alt → estructura');
// L'estructura mai diu «descartat».
assert.ok(o.onze.filter((s) => s.motiu === 'estructura').every((s) => s.valor_placa === 'cap' || s.guany <= 0), 'estructura = guany ~0');
// Banqueta = el de menys a perdre (menys nivell entre els de guany ~0).
assert.equal(o.banqueta.length, 1, 'sempre ≥1 recanvi');
assert.equal(o.banqueta[0].jugador_id, 9, 'recanvi = el de menys nivell/guany');

// 2b: un potencial conegut BAIX no ocupa la plaça del seu component mentres un de potencial
// esperat MAJOR (desconegut) queda fora. Plaça només-B (davanter): B potencial baix (2) vs desconegut.
const r2b = alineaJuvenil([
  { jugador_id: 1, nom: 'BaixP', nivell: 8, passades_actual: 'desconegut', passades_potencial: '2', creativitat_actual: '5', creativitat_potencial: '5' },  // (c) potencial baix → guany ~0
  { jugador_id: 2, nom: 'DescP', nivell: 3, passades_actual: 'desconegut', creativitat_actual: '5', creativitat_potencial: '5' },  // (b) potencial esperat major
], { formacio: { davanter: 1 }, maxims: {}, minim: 1, entrenamentA: 'creativitat', entrenamentB: 'passades', taulaEntrenament: taula, marge_esperat: 3, f_marge: 0.5, pes_a: 1, pes_b: 0.66, potencial_esperat: 6, valor_esperat_desconegut_defecte: 4 });
assert.equal(r2b.onze.find((s) => s.bucket === 'davanter').jugador_id, 2, '2b: el de potencial esperat major ocupa la plaça, no el de potencial conegut baix');

// Equip curt (5 jugadors) → NO viable (per davall del mínim).
const curt = alineaJuvenil([jv(1, 5, 'desconegut'), jv(2, 4, 'desconegut'), jv(3, 3, 'desconegut'), jv(4, 2, 'desconegut'), jv(5, 1, 'desconegut')], cfg);
assert.equal(curt.no_viable, true, 'menys del mínim → no viable');

// ── Punt 3: tests d'ASSIGNACIÓ (no sols de fórmula) ──
const cfgUn = (form) => ({ formacio: form, maxims: {}, minim: 1, entrenamentA: 'creativitat', entrenamentB: 'passades', taulaEntrenament: taula, marge_esperat: 3, f_marge: 0.5, pes_a: 1, pes_b: 0.66 });
// 3a) plaça NOMÉS-B (davanter): un desconegut de B (loteria) guanya la plaça a un B conegut
// mínim (bitllet ratllat), a NIVELL D'ASSIGNACIÓ; i el motiu anomena l'habilitat REAL (B).
const r3a = alineaJuvenil([
  { jugador_id: 1, nom: 'DescB', nivell: 3, passades_actual: 'desconegut', creativitat_actual: '5', creativitat_potencial: '5' },
  { jugador_id: 2, nom: 'ConegutB', nivell: 9, passades_actual: '2', passades_potencial: '2', creativitat_actual: '9', creativitat_potencial: '9' },
], cfgUn({ davanter: 1 }));
const dav = r3a.onze.find((s) => s.bucket === 'davanter');
assert.equal(dav.jugador_id, 1, '3a: el desconegut de B guanya la plaça només-B (loteria > bitllet ratllat)');
assert.equal(dav.motiu, 'descobriment');
assert.equal(dav.habilitat, 'passades', '3a: el motiu anomena l\'habilitat REAL de la plaça (B), no el principal');

// 3b) plaça amb component A: entre desconeguts IGUALS, mana la promoció MÉS PRÒXIMA.
const r3b = alineaJuvenil([
  { jugador_id: 1, nom: 'Lluny', nivell: 5, dies_restants_promocio: 90, creativitat_actual: 'desconegut', passades_actual: 'desconegut' },
  { jugador_id: 2, nom: 'Prop', nivell: 5, dies_restants_promocio: 10, creativitat_actual: 'desconegut', passades_actual: 'desconegut' },
], cfgUn({ mc: 1 }));
assert.equal(r3b.onze.find((s) => s.bucket === 'mc').jugador_id, 2, '3b: desempat de descobriment → promoció més pròxima');

// 3c) cap guany MENOR ocupa plaça entrenable mentres un de guany MAJOR és a estructura.
const r3c = alineaJuvenil([
  { jugador_id: 1, nom: 'Guany', nivell: 3, creativitat_actual: '4', creativitat_potencial: '9', passades_actual: 'desconegut' },
  { jugador_id: 2, nom: 'Capat', nivell: 20, creativitat_actual: '9', creativitat_potencial: '9', passades_actual: '9', passades_potencial: '9' },
], { ...cfgUn({ mc: 1, porter: 1 }), minim: 2 });   // minim 2 → sense fre de suplents
assert.equal(r3c.onze.find((s) => s.bucket === 'mc').jugador_id, 1, '3c: la plaça entrenable va al de guany positiu');
assert.equal(r3c.onze.find((s) => s.motiu === 'estructura').jugador_id, 2, '3c: el capat (guany 0) a estructura, per alt que siga el nivell');

// ── Regles ──
const sob = REGLES.ALR_JUVENIL_SOBRANT({ juvenils: js, juvenil_objectiu: 2 }, { urgencia: 56 });
assert.equal(sob.length, 1); assert.equal(sob[0].parametres.sobren, 1);

console.log('OK — juvenil v2: Revelable (desconegut≠venda), llenguatge pla, juga/no juga, fre de suplents, rànquing i regles');
