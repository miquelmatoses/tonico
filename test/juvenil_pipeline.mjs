// Tonico — Àrees F/G: juvenils avaluats contra el pipeline de la fàbrica +
// especialitats. node test/juvenil_pipeline.mjs
import assert from 'node:assert/strict';
import { avaluaPipeline, vistaJuvenil } from '../lib/fotrem.js';
import { REGLES } from '../lib/regles.js';

const pipe = { principal: 'creativitat', secundari: 'passades', vendibles: ['anotacio', 'extrem', 'defensa'],
  sostre_min: 2, vendible_min: 5, fabrica_min: 5, parells_permesos: ['defensa', 'anotacio', 'creativitat'] };
const fila = (o) => ({ creativitat_actual: null, creativitat_potencial: null, anotacio_potencial: null, extrem_potencial: null, defensa_potencial: null, ...o });

// En pipeline i amb sostre alt → candidat a fàbrica.
let r = avaluaPipeline(fila({ creativitat_actual: '3', creativitat_potencial: '6' }), pipe);
assert.equal(r.fora, false); assert.equal(r.desti_promocio, 'fabrica');

// ForaPipe (actual = potencial) → fora; sense valor vendible → cua d'eixida.
r = avaluaPipeline(fila({ creativitat_actual: '5', creativitat_potencial: '5' }), pipe);
assert.equal(r.topat, true); assert.equal(r.fora, true); assert.equal(r.proposta, 'cua_eixida');

// Sostre baix (≤2) → fora; desti venda (potencial < fabrica_min).
r = avaluaPipeline(fila({ creativitat_actual: '1', creativitat_potencial: '2' }), pipe);
assert.equal(r.sostre_baix, true); assert.equal(r.desti_promocio, 'venda');

// EXCEPCIÓ: fora de pipeline però potencial vendible ≥5 → promocionar-i-vendre.
r = avaluaPipeline(fila({ creativitat_actual: '4', creativitat_potencial: '4', anotacio_potencial: '7' }), pipe);
assert.equal(r.fora, true); assert.equal(r.vendible, true); assert.equal(r.proposta, 'promocionar_vendre');

// vistaJuvenil exposa pipeline + especialitat
const v = vistaJuvenil({ jugador_id: 1, nom: 'X', edat_anys: 17, dies_restants_promocio: 30, especialitat: 'Ràpid',
  ...fila({ creativitat_actual: '5', creativitat_potencial: '5' }) }, '2026-07-25', { data: '2026-07-25', temporada: 83, anyDies: 112 }, null, pipe);
assert.equal(v.especialitat, 'Ràpid');
assert.equal(v.pipeline.proposta, 'cua_eixida');

// Regla F.11: fora de pipeline → UNA alerta AGREGADA (silencia els ja decidits)
const juvenils = [
  { jugador_id: 1, nom: 'ForaPipe', estat: 'seguiment', pipeline: { fora: true, proposta: 'cua_eixida' } },
  { jugador_id: 2, nom: 'Vendible', estat: 'seguiment', pipeline: { fora: true, proposta: 'promocionar_vendre' } },
  { jugador_id: 3, nom: 'Decidit', estat: 'cua_eixida', pipeline: { fora: true, proposta: 'cua_eixida' } },
  { jugador_id: 4, nom: 'Dins', estat: 'seguiment', pipeline: { fora: false } },
];
// 3c: sense crida disponible o sense sobrepassar l'objectiu → res (la taula de Fotrem ho mostra).
assert.equal(REGLES.ALR_JOVE_FORA_PIPELINE({ juvenils }, { urgencia: 50 }).length, 0, 'sense crida disponible → res');
assert.equal(REGLES.ALR_JOVE_FORA_PIPELINE({ juvenils, crida: { disponible: true }, juvenil_objectiu: 10 }, { urgencia: 50 }).length, 0, 'crida disponible però sense sobrepassar l\'objectiu → res');
// Amb crida disponible I sobrepassament de l'objectiu (acceptar el nou passaria de 3) → una línia.
const fp = REGLES.ALR_JOVE_FORA_PIPELINE({ juvenils, crida: { disponible: true }, juvenil_objectiu: 3 }, { urgencia: 50 });
assert.equal(fp.length, 1, 'una sola línia agregada, no una per jugador');
assert.equal(fp[0].missatge_clau, 'alerta.jove_fora_agregat');
assert.equal(fp[0].parametres.n, 2, 'compta els fora sense decisió (2), no els decidits ni els de dins');

// Regla G.14: especialitat descoberta. 3d: només CANDIDATS REALS a eixida.
const je = [
  { jugador_id: 1, nom: 'X', especialitat: 'Ràpid', pipeline: { fora: true } },   // candidat → alerta
  { jugador_id: 2, nom: 'Y', especialitat: 'Ràpid', pipeline: { fora: false } },  // dins → cap alerta
  { jugador_id: 3, nom: 'Z', especialitat: null },
];
assert.deepEqual(REGLES.ALR_JOVE_ESPECIALITAT({ juvenils: je }, { urgencia: 48 }).map((x) => x.jugador_id), [1], '3d: només el candidat real a eixida');

// Regla F.12: entrenament juvenil invàlid
const p = { urgencia: 55 };
assert.equal(REGLES.ALR_ENTRENAMENT_JUVENIL({ entrenament: pipe, entrenament_juvenil: { principal: 'passades', secundari: 'anotacio' } }, p).length, 0, 'passades servix el pipeline → ok');
assert.equal(REGLES.ALR_ENTRENAMENT_JUVENIL({ entrenament: pipe, entrenament_juvenil: { principal: 'porteria', secundari: 'extrem' } }, p)[0].missatge_clau, 'alerta.entrenament_juvenil_fora', 'cap servix el pipeline');
assert.equal(REGLES.ALR_ENTRENAMENT_JUVENIL({ entrenament: pipe, entrenament_juvenil: { principal: 'porteria', secundari: 'porteria' } }, p)[0].missatge_clau, 'alerta.entrenament_juvenil_igual', 'parell igual no permés');
assert.equal(REGLES.ALR_ENTRENAMENT_JUVENIL({ entrenament: pipe, entrenament_juvenil: { principal: 'creativitat', secundari: 'creativitat' } }, p).length, 0, 'creativitat+creativitat és parell permés i servix');

console.log('OK — juvenils: pipeline (fora/topat/vendible/destí), especialitat i validació d\'entrenament');
