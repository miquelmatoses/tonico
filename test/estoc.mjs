// Tonico — BUCLE D'ESTOC (contracte v3, PAS 8): jugadors i estadi competixen pel mateix
// diner amb la mateixa unitat. node test/estoc.mjs
import assert from 'node:assert/strict';
import { guanyJugador, admissibleJugador, deltaFlux, guanyEstadi, admissibleEstadi,
  eficiencia, decisioEstoc } from '../lib/estoc.js';

// ── Opció JUGADOR ──
assert.equal(guanyJugador(3, 1.5), 4.5, 'guany = mancança × pes (la mètrica única)');
assert.equal(guanyJugador(null, 1.5), null);
assert.equal(admissibleJugador({ preu: 50000, sou: 900 }, { caixa_disponible: 100000, pressupost_sou_lloc: 1000 }), true);
assert.equal(admissibleJugador({ preu: 150000, sou: 900 }, { caixa_disponible: 100000, pressupost_sou_lloc: 1000 }), false,
  'no es compra amb diners que no tens');
assert.equal(admissibleJugador({ preu: 50000, sou: 5000 }, { caixa_disponible: 100000, pressupost_sou_lloc: 1000 }), false,
  'ni un sou que el lloc no sosté');
assert.equal(admissibleJugador({ preu: 1 }, { caixa_disponible: null }), false,
  'sense caixa declarada no es compra res');

// ── Opció ESTADI ──
assert.equal(deltaFlux(9000, 6000), 3000, 'el manteniment que t\'estalvies cada setmana');
assert.equal(deltaFlux(null, 6000), null);

const TS = { creativitat: { 1: 250, 2: 270, 3: 330, 4: 510, 5: 850 }, defensa: { 1: 250, 2: 270, 3: 310 } };
const PESOS = { mc: 1.5, defensa: 0.7 };
const MANC = {
  mc: { habilitat: 'creativitat', mancanca: 2 },
  defensa: { habilitat: 'defensa', mancanca: 0 },     // ja cobert: pujar-li el sostre val 0
};
const g = guanyEstadi(MANC, { sou_sostenible: 300, delta_flux: 3000, taula_salaris: TS, pesos: PESOS });
assert.ok(g > 0, 'més flux desbloqueja nivell on hi ha mancança');
const gSenseManc = guanyEstadi({ defensa: MANC.defensa }, { sou_sostenible: 300, delta_flux: 3000, taula_salaris: TS, pesos: PESOS });
assert.equal(gSenseManc, 0, 'sense mancança, pujar el sostre no val res');
assert.equal(guanyEstadi(MANC, { sou_sostenible: null, delta_flux: 3000, taula_salaris: TS, pesos: PESOS }), null,
  'sense sou sostenible no es pot dir què desbloqueja');

assert.equal(admissibleEstadi({ cost: 50000, caixa_disponible: 100000, flux: 1000, delta_flux: 500 }), true);
assert.equal(admissibleEstadi({ cost: 150000, caixa_disponible: 100000, flux: 1000, delta_flux: 500 }), false,
  'l\'obra tampoc es paga amb diners que no tens');
assert.equal(admissibleEstadi({ cost: 50000, caixa_disponible: 100000, flux: 1000, delta_flux: -2000 }), false,
  'ni una obra que et deixe el flux en negatiu');

// ── La decisió: la mateixa unitat per a tot ──
assert.equal(eficiencia(4.5, 50000), 0.00009);
assert.equal(eficiencia(4.5, 0), null, 'sense cost no hi ha eficiència');
const tria = decisioEstoc([
  { id: 'jugador', admissible: true, eficiencia: eficiencia(4.5, 50000) },
  { id: 'estadi', admissible: true, eficiencia: eficiencia(3.0, 20000) },
  { id: 'car', admissible: true, eficiencia: eficiencia(9.0, 900000) },
]);
assert.equal(tria.id, 'estadi', 'guanya la millor relació guany/cost, no el guany més gran');
assert.equal(decisioEstoc([{ id: 'x', admissible: false, eficiencia: 1 }]), null,
  'sense cap opció admissible, cap compra: només es ven');
assert.equal(decisioEstoc([]), null);

console.log('OK — bucle d\'estoc: jugadors i estadi amb la mateixa unitat');
