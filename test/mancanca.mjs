// Tonico — MANCANÇA, la mètrica única (contracte v3, PAS 5). node test/mancanca.mjs
import assert from 'node:assert/strict';
import { nivellActual, mancanca, exces, sobrecost, prioritat, mancances, perPrioritat } from '../lib/mancanca.js';

// nivell_actual: l'habilitat de l'ocupant; un lloc buit val 0 (no null: buit ÉS informació)
assert.equal(nivellActual({ creativitat: 7 }, 'creativitat'), 7);
assert.equal(nivellActual(null, 'creativitat'), 0, 'lloc buit → 0');
assert.equal(nivellActual({ }, 'creativitat'), 0, 'habilitat desconeguda → 0');

// mancança = MAX(0; objectiu − actual): tindre'n de sobra no és mancança negativa
assert.equal(mancanca(9, 6), 3);
assert.equal(mancanca(6, 9), 0, 'per damunt de l\'objectiu no hi ha mancança');
assert.equal(mancanca(null, 6), null, 'sense objectiu no es pot dir');

// excés i sobrecost: les dues cares de pagar de més
assert.equal(exces({ creativitat: 9 }, 'creativitat', 6), 3);
assert.equal(exces({ creativitat: 5 }, 'creativitat', 6), 0);
const TS = { creativitat: { 1: 250, 2: 270, 3: 330, 4: 510 } };
assert.equal(sobrecost({ sou: 900 }, 'creativitat', 3, TS), 570, '900 € per a un lloc que en val 330');
assert.equal(sobrecost({ sou: 300 }, 'creativitat', 3, TS), 0, 'per davall del que val el lloc: cap sobrecost');
assert.equal(sobrecost({ sou: 900 }, 'creativitat', 0, TS), 900, 'un lloc que no es pot pagar: tot és sobrecost');

// prioritat = mancança × pes: la unitat comuna
assert.equal(prioritat(3, 1.5), 4.5);
assert.equal(prioritat(0, 1.5), 0, 'sense mancança no hi ha prioritat');
assert.equal(prioritat(3, null), null);

// El PAS 5 sencer sobre una formació avaluada
const nivells = {
  mc:       { pes: 1.5, habilitat: 'creativitat', nivell_objectiu: 9, pressupost_sou: 5000 },
  defensa:  { pes: 0.7, habilitat: 'defensa',     nivell_objectiu: 7, pressupost_sou: 2000 },
  porter:   { pes: 0.6, habilitat: 'porteria',    nivell_objectiu: 6, pressupost_sou: 1500 },
};
const m = mancances(nivells, {
  mc: { jugador_id: 1, creativitat: 6 },      // en falten 3 al lloc que més pesa
  defensa: { jugador_id: 2, defensa: 8 },     // de sobra
  porter: null,                               // buit
});
assert.equal(m.mc.mancanca, 3);
assert.equal(m.mc.prioritat, 4.5);
assert.equal(m.defensa.mancanca, 0, 'un defensa per damunt de l\'objectiu no reclama res');
assert.equal(m.porter.nivell_actual, 0);
assert.equal(m.porter.mancanca, 6, 'un lloc buit reclama tot el nivell');

// L'orde de prioritat és l'orde en què val la pena gastar
const orde = perPrioritat(m);
assert.deepEqual(orde.map((x) => x.lloc), ['mc', 'porter'],
  'mc 3×1,5=4,5 per damunt de porter 6×0,6=3,6: no mana la mancança sola, mana mancança×pes');
assert.ok(orde.every((x) => x.prioritat > 0), 'els llocs sense mancança no ixen a la llista');

console.log('OK — mancança: la mètrica única (mancança × pes) i el seu orde');
