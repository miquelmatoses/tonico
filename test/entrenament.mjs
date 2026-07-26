// Tonico — Àrea C: l'entrenament és paràmetre de fase; pipeline (principal/
// secundari) i alerta de desquadre. node test/entrenament.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { entrenamentFase } from '../lib/entrenament.js';
import { REGLES } from '../lib/regles.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);`);

// La fase prescriu creativitat/100%/10% i el pipeline creativitat→passades.
const ent = await entrenamentFase(db, 'competitiva', 'competitiva');
assert.equal(ent.tipus, 'creativitat');
assert.equal(ent.intensitat, 100);
assert.equal(ent.resistencia, 10);
assert.equal(ent.principal, 'creativitat');
assert.equal(ent.secundari, 'passades');
assert.deepEqual(ent.vendibles, ['anotacio', 'extrem', 'defensa']);

// Desquadre: si el confirmat difereix del prescrit, dispara.
const p = { urgencia: 68 };
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: { tipus: 'anotacio', intensitat: 100, resistencia: 10 } }, p).length, 1, 'tipus diferent → dispara');
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: { tipus: 'creativitat', intensitat: 100, resistencia: 10 } }, p).length, 0, 'igual → no dispara');
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: null }, p).length, 0, 'sense confirmar → no dispara');
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: { intensitat: 80 } }, p).length, 1, 'intensitat diferent → dispara');

console.log('OK — entrenament: paràmetre de fase, pipeline i alerta de desquadre');
