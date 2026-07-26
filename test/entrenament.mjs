// Tonico — L'ENTRENAMENT ÉS PRESCRIPCIÓ (contracte v3, PAS 1), no un paràmetre de fase.
// Venia de `fases_config`, que era el model fàbrica; ara viu als poms. node test/entrenament.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { entrenamentPrescrit } from '../lib/entrenament.js';
import { REGLES } from '../lib/regles.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);`);

// El full prescriu (A,B) = (creativitat, passades), intensitat 100%, resistència 10%.
const ent = await entrenamentPrescrit(db, 'competitiva');
assert.equal(ent.tipus, 'creativitat');
assert.equal(ent.intensitat, 100);
assert.equal(ent.resistencia, 10);
assert.equal(ent.principal, 'creativitat');
assert.equal(ent.secundaria, 'passades');
assert.equal(await entrenamentPrescrit(db, 'inexistent'), null, 'sense prescripció no se n\'inventa');

// Desquadre: si el confirmat difereix del prescrit, dispara.
const p = { urgencia: 68 };
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: { tipus: 'anotacio', intensitat: 100, resistencia: 10 } }, p).length, 1, 'tipus diferent → dispara');
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: { tipus: 'creativitat', intensitat: 100, resistencia: 10 } }, p).length, 0, 'igual → no dispara');
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: null }, p).length, 0, 'sense confirmar → no dispara');
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE({ entrenament: ent, entrenament_confirmat: { intensitat: 80 } }, p).length, 1, 'intensitat diferent → dispara');

console.log('OK — entrenament: prescripció del full (no fase) i alerta de desquadre');
