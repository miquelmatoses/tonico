// Tonico — L'ENTRENAMENT ÉS PRESCRIPCIÓ (contracte v3, PAS 1), no un paràmetre de fase.
// Venia de `fases_config`, que era el model fàbrica; ara viu als poms. node test/entrenament.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { entrenamentPrescrit } from '../lib/entrenament_places.js';
import { REGLES } from '../lib/regles.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);`);

// El full prescriu (A,B) = (creativitat, passades), intensitat 100%, resistència 10%.
const ent = await entrenamentPrescrit(db, 'competitiva');
assert.equal(ent.skill, 'creativitat');
assert.equal(ent.intensitat, 100);
assert.equal(ent.resistencia, 10);
assert.equal((await entrenamentPrescrit(db, 'inexistent')).skill, null,
  'sense prescripció no se n\'inventa cap');

// FORA L'ALERTA DE DESQUADRE. Comparava l'entrenament CONFIRMAT a HT amb el prescrit, i la
// finestra per a confirmar-lo era el panell de Personal, que se n'ha anat: l'entrenament es
// prescriu, o siga que un panell per a declarar-lo oferia una decisió que no existix. Sense el
// costat esquerre, la comparació no pot donar res. Mateix cas que ALR_ENTRENAMENT_JUVENIL.
assert.equal(REGLES.ALR_ENTRENAMENT_DESQUADRE, undefined,
  'la regla se n\'ha anat del motor, no només de la pantalla');

console.log('OK — entrenament: la prescripció ix del full, no de la fase');
