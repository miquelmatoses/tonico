// Tonico — PLANTILLA del v3 (PAS 2 i PAS 6): core, rotatius, titulars, porters, cossos i
// el sobrant. Vocabulari del full; cap «entrenable» ni «farciment». node test/plantilla_v3.mjs
import assert from 'node:assert/strict';
import { comptesNucli, maxPartits, construeixPlantilla } from '../lib/plantilla.js';

// Formació 3-5-2 amb creativitat: 3 MC entrenen al 100%, 2 extrems al 50%.
const LLOCS = [
  { lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat' },
  { lloc: 'mc2', entrena: true, pct: 100, habilitat: 'creativitat' },
  { lloc: 'mc3', entrena: true, pct: 100, habilitat: 'creativitat' },
  { lloc: 'ext1', entrena: true, pct: 50, habilitat: 'extrem' },
  { lloc: 'ext2', entrena: true, pct: 50, habilitat: 'extrem' },
  { lloc: 'por', entrena: false, habilitat: 'porteria' },
  { lloc: 'dc1', entrena: false, habilitat: 'defensa' },
  { lloc: 'dc2', entrena: false, habilitat: 'defensa' },
  { lloc: 'dc3', entrena: false, habilitat: 'defensa' },
  { lloc: 'dv1', entrena: false, habilitat: 'anotacio' },
  { lloc: 'dv2', entrena: false, habilitat: 'anotacio' },
];

// ── PAS 2: els comptes del nucli ──
const c = comptesNucli(LLOCS.filter((l) => l.entrena).map((l) => ({ entrena: true, pct: l.pct })), 2);
assert.equal(c.n_core, 5, 'N_core = els llocs que entrenen (3 MC + 2 extrems)');
assert.equal(c.n_rotatius, 3, 'N_rotatius = els llocs al 100% × (partits − 1) = 3×1');
assert.deepEqual(comptesNucli([{ entrena: true, pct: 100 }], 1), { n_core: 1, n_rotatius: 0 },
  'amb un sol partit no calen rotatius');
assert.deepEqual(comptesNucli([], null), { n_core: null, n_rotatius: null },
  'sense partits_setmana no se suposa res');

// max_partits: un lloc al 50% es dobla; un cos també; un titular del 100%, no.
assert.equal(maxPartits('core', 50), 2);
assert.equal(maxPartits('core', 100), 1);
assert.equal(maxPartits('cos', 100), 2);
assert.equal(maxPartits('futur_entrenador', 100), 2);

// ── PAS 6: una plantilla sintètica de 20 (cap nom d'usuari; invariant 9) ──
const jug = (id, o) => ({ jugador_id: id, edat_anys: 20, edat_dies: 0, sou: 1000, creativitat: 1,
  extrem: 1, porteria: 1, defensa: 1, anotacio: 1, passades: 1, ...o });
const squad = [
  // 6 creatius forts (5 seran core, el 6é rotatiu)
  jug(1, { creativitat: 12 }), jug(2, { creativitat: 11 }), jug(3, { creativitat: 10 }),
  jug(4, { creativitat: 9 }), jug(5, { creativitat: 8 }), jug(6, { creativitat: 7 }),
  jug(7, { creativitat: 7, edat_anys: 30 }),                 // fora de la finestra de rotatiu
  jug(8, { creativitat: 6 }), jug(9, { creativitat: 6 }),
  // especialistes de cada lloc que no entrena
  jug(10, { porteria: 9 }), jug(11, { porteria: 8 }), jug(12, { porteria: 4 }),
  jug(13, { defensa: 9 }), jug(14, { defensa: 8 }), jug(15, { defensa: 8, sou: 500 }),
  jug(16, { anotacio: 9 }), jug(17, { anotacio: 8 }),
  // barats, per a cos
  jug(18, { sou: 200 }), jug(19, { sou: 250 }), jug(20, { sou: 20000 }),
];
const r = construeixPlantilla(squad, LLOCS, {
  A: 'creativitat', core_a_min: 5, edat_pic_venda: 25, any_dies: 112,
  partits_setmana: 2, llocs_partit: 22, habilitat_porter: 'porteria',
});

// CORE: els 5 millors en creativitat
assert.deepEqual(r.core.map((j) => j.jugador_id), [1, 2, 3, 4, 5], 'core = els millors en l\'habilitat entrenada');
// ROTATIUS: els 3 següents dins de la finestra d'edat (el 7, de 30 anys, en queda fora)
assert.equal(r.rotatius.length, 3);
assert.ok(!r.rotatius.some((j) => j.jugador_id === 7), 'un jugador passat del pic de venda no és rotatiu');
// TITULARS: un per lloc que no entrena, el millor de la seua habilitat
const titPer = Object.fromEntries(r.titulars.map((t) => [t.lloc, t.jugador_id]));
assert.equal(titPer.por, 10, 'el millor porter és el titular de porteria');
assert.equal(titPer.dc1, 13, 'el millor defensa');
assert.equal(titPer.dv1, 16, 'el millor anotador');
// A igualtat d'habilitat mana el sou més baix (el 15 costa 500 i el 14 en costa 1000)
assert.equal(titPer.dc2, 15, 'a igual defensa, el més barat');
// PORTERS: en calen 1 per partit; el titular ja compta, així que en falta un
assert.equal(r.porters_n, 2);
assert.deepEqual(r.porters.map((j) => j.jugador_id), [11], 'el segon porter, el millor dels que queden');
// COSSOS: els més barats dels que sobren
assert.ok(r.cossos.every((j) => j.sou <= 20000));
assert.ok(r.cossos.some((j) => j.jugador_id === 18), 'el més barat entra de cos');
assert.ok(!r.cossos.some((j) => j.jugador_id === 20), 'el més car no fa de cos');

// RETINGUTS i VENDA: partició neta, cap marca dins de venda
const ids = (a) => a.map((j) => j.jugador_id).sort((x, y) => x - y);
assert.deepEqual([...ids(r.retinguts), ...ids(r.venda)].sort((x, y) => x - y), squad.map((j) => j.jugador_id),
  'retinguts ∪ venda = la plantilla sencera');
assert.equal(new Set([...ids(r.retinguts), ...ids(r.venda)]).size, squad.length, 'ningú en dos conjunts');
assert.ok(r.venda.every((j) => !r.rol[j.jugador_id]), 'la venda és una categoria sencera, sense marques dins');

console.log('OK — plantilla v3: core, rotatius, titulars, porters, cossos i sobrant');
