// Tonico — INFORME I AGENDA (contracte v3, PAS 12). node test/informe.mjs
import assert from 'node:assert/strict';
import { nivellAccio, agrupaAlertes, ordenaAgenda } from '../lib/informe.js';

const LL = { llindar_urgent: 70, llindar_aviat: 55 };

// ── nivell(acció): les llindes són POMS, no números a la vista ──
assert.equal(nivellAccio(90, LL), 'urgent');
assert.equal(nivellAccio(70, LL), 'urgent', 'la llinda entra');
assert.equal(nivellAccio(69, LL), 'aviat');
assert.equal(nivellAccio(55, LL), 'aviat');
assert.equal(nivellAccio(54, LL), 'normal');
assert.equal(nivellAccio(null, LL), 'normal', 'sense urgència, res d\'alarmes');
assert.equal(nivellAccio(90, {}), 'normal', 'sense llindes declarades no s\'inventa cap alarma');

// ── alertes: UNA LÍNIA PER TIPUS, ordenades per urgència ──
const accions = [
  { tipus: 'llistar', urgencia: 55, nom: 'A' },
  { tipus: 'llistar', urgencia: 72, nom: 'B' },
  { tipus: 'llistar', urgencia: 40, nom: 'C' },
  { tipus: 'crida', urgencia: 60 },
];
const g = agrupaAlertes(accions, LL);
assert.equal(g.length, 2, 'una línia per tipus, no una per acció');
assert.equal(g[0].tipus, 'llistar');
assert.equal(g[0].n, 3, 'i diu quantes n\'hi ha');
assert.equal(g[0].urgencia, 72, 'l\'urgència del grup és la més alta');
assert.equal(g[0].nivell, 'urgent');
assert.equal(g[1].tipus, 'crida');
assert.equal(g[1].nivell, 'aviat');
assert.ok(g[0].exemples.length <= 3, 'el detall viu a la secció, no a la línia');
assert.deepEqual(agrupaAlertes([], LL), [], '«de moment res» no és una alerta');

// ── agenda: per data ──
const ag = ordenaAgenda([{ data_accio: '2026-08-03' }, { data_accio: '2026-07-28' }]);
assert.deepEqual(ag.map((x) => x.data_accio), ['2026-07-28', '2026-08-03']);

console.log('OK — informe: nivell per poms, alertes per tipus i agenda per data');
