// Tonico — JUVENILS del v3 (PAS 10): proveïdors de rotatius. node test/juvenil_v3.mjs
import assert from 'node:assert/strict';
import { util, destiPromocio, objectiuJuvenil, sobrants, reiniciCrida } from '../lib/juvenil_v3.js';

// ── util(j): ¿arribarà al nivell que el lloc demana? ──
assert.equal(util({ creativitat_potencial: 9 }, 'creativitat', 8), true);
assert.equal(util({ creativitat_potencial: 7 }, 'creativitat', 8), false);
assert.equal(util({ creativitat_potencial: 'desconegut' }, 'creativitat', 8), null,
  'sense potencial revelat no es pot dir');
assert.equal(util({ creativitat_potencial: 9 }, 'creativitat', null), null,
  'sense nivell objectiu (economia sense dades) tampoc');

// ── el destí: DOS branques, no tres (v3.1) ──
// `PROMOCIONA_I_LLISTA` depenia d'una estimació de preu i era el juvenil-com-a-negoci que el
// canvi 9 ja havia retirat: si no arriba al nivell del lloc, no servix, i no hi ha preu que
// ho canvie.
assert.equal(destiPromocio({ esUtil: true }), 'PROMOCIONA',
  'si servix per al lloc, es promociona');
assert.equal(destiPromocio({ esUtil: false }), 'DESPATXA',
  'i si no servix, es despatxa: no hi ha branca de «promociona i ven-lo»');

// ── objectiu_juvenil = onze legal + 1 (derivat) ──
assert.equal(objectiuJuvenil(9), 10);
assert.equal(objectiuJuvenil(null), null, 'sense mínim en camp no se suposa objectiu');

// ── sobrants: menys NIVELL primer; entre iguals, els MENYS revelats ──
const juv = [
  { jugador_id: 1, nivell: 8, n_revelacions: 1 },
  { jugador_id: 2, nivell: 4, n_revelacions: 3 },
  { jugador_id: 3, nivell: 4, n_revelacions: 0 },
  { jugador_id: 4, nivell: 6, n_revelacions: 2 },
];
assert.deepEqual(sobrants(juv, 3).map((x) => x.jugador_id), [3],
  'ix el de menys nivell i, entre iguals, el MENYS revelat (el descobert es reté)');
assert.deepEqual(sobrants(juv, 2).map((x) => x.jugador_id), [3, 2]);
assert.deepEqual(sobrants(juv, 10), [], 'si no sobra ningú, no es despatxa ningú');
assert.deepEqual(sobrants(juv, null), [], 'sense objectiu no es despatxa a cegues');

// ── reinici_crida: el pròxim dia d'economia del país, una hora després ──
const r = reiniciCrida('2026-07-26T12:00:00Z', { economia_dia: 6, economia_hora: 2 });
const d = new Date(r);
assert.equal(d.getUTCDay(), 6, 'cau en el dia d\'economia del país');
assert.equal(d.getUTCHours(), 3, 'una hora després de l\'actualització econòmica');
assert.ok(new Date(r) > new Date('2026-07-26T12:00:00Z'), 'sempre cap avant');
assert.equal(reiniciCrida('2026-07-26T12:00:00Z', null), null, 'sense país declarat no se suposa horari');

console.log('OK — juvenils v3: util, destí de promoció, sobrants i reinici de crida');
