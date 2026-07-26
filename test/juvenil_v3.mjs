// Tonico — JUVENILS del v3 (PAS 10): proveïdors de rotatius. node test/juvenil_v3.mjs
import assert from 'node:assert/strict';
import { util, valorNetPromo, destiPromocio, objectiuJuvenil, sobrants, reiniciCrida } from '../lib/juvenil_v3.js';

// ── util(j): ¿arribarà al nivell que el lloc demana? ──
assert.equal(util({ creativitat_potencial: 9 }, 'creativitat', 8), true);
assert.equal(util({ creativitat_potencial: 7 }, 'creativitat', 8), false);
assert.equal(util({ creativitat_potencial: 'desconegut' }, 'creativitat', 8), null,
  'sense potencial revelat no es pot dir');
assert.equal(util({ creativitat_potencial: 9 }, 'creativitat', null), null,
  'sense nivell objectiu (economia sense dades) tampoc');

// ── valor_net_promo i el destí ──
assert.equal(valorNetPromo(300000, { cost_promocio: 20000, sou_estimat: 5000 }), 270000);
assert.equal(valorNetPromo(null, {}), null);
assert.equal(destiPromocio({ esUtil: true, valor_net_promo: -1 }), 'PROMOCIONA',
  'si servix per al lloc, es promociona encara que vendre\'l no rendira');
assert.equal(destiPromocio({ esUtil: false, valor_net_promo: 100 }), 'PROMOCIONA_I_LLISTA');
assert.equal(destiPromocio({ esUtil: false, valor_net_promo: -100 }), 'DESPATXA');
assert.equal(destiPromocio({ esUtil: false, valor_net_promo: null }), 'DESPATXA');

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
