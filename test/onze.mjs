// Tonico — ALINEACIONS (contracte v3, PAS 9): greedy per PES, amb max_partits i les
// exclusions del contracte. node test/onze.mjs
import assert from 'node:assert/strict';
import { valorEn, alineaOnzes } from '../lib/onze.js';

const PARTITS = [{ id: 'A', competitiu: true }, { id: 'B', competitiu: false }];
// Llocs amb el seu PES (del PAS 4): el mig pesa més que la banda, i la banda que el porter.
const LLOCS = [
  { lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat', pes: 1.46 },
  { lloc: 'mc2', entrena: true, pct: 100, habilitat: 'creativitat', pes: 1.46 },
  { lloc: 'ext1', entrena: true, pct: 50, habilitat: 'extrem', pes: 0.94 },
  { lloc: 'dc1', entrena: false, habilitat: 'defensa', pes: 0.74 },
  { lloc: 'por', entrena: false, habilitat: 'porteria', pes: 0.66 },
];
const j = (id, cat, o) => ({ jugador_id: id, nom: 'J' + id, categoria: cat, sou: 1000,
  creativitat: 1, extrem: 1, defensa: 1, porteria: 1, ...o });

// ── valor(j, lloc) ──
assert.equal(valorEn(j(1, 'core', { creativitat: 5 }), LLOCS[0], 1000), 1000,
  'en un lloc que entrena, el nucli hi va pel pes d\'entrenament');
assert.equal(valorEn(j(1, 'cos', { creativitat: 5 }), LLOCS[0], 1000), 5,
  'un cos, en canvi, val el que val la seua habilitat');
assert.equal(valorEn(j(1, 'titular', { defensa: 7 }), LLOCS[3], 1000), 7);

// ── F2: NO hi ha `compatible`. Qui discrimina és valor(j, lloc): un porter en un lloc de
// defensa hi val la seua DEFENSA, i el perd contra un defensa de veres. ──
{
  const LL = [{ lloc: 'dc1', entrena: false, habilitat: 'defensa', pes: 1 }];
  const P1 = [{ id: 'A', competitiu: true }];
  const r = alineaOnzes([
    j(1, 'porter', { porteria: 9, defensa: 1 }),
    j(2, 'titular', { defensa: 7 }),
  ], LL, P1, { pes_entrenament: 1000 });
  assert.equal(r.onze.A[0].jugador.jugador_id, 2, 'el defensa guanya el lloc de defensa pel VALOR');
  // I si l'únic retingut és el porter, el lloc NO queda buit (invariant nou de F2).
  const nomesPorter = alineaOnzes([j(1, 'porter', { porteria: 9, defensa: 1 })], LL, P1, { pes_entrenament: 1000 });
  assert.equal(nomesPorter.onze.A[0].jugador.jugador_id, 1, 'cap lloc buit havent-hi un retingut disponible');
  assert.equal(nomesPorter.buits.length, 0);
}

// ── L'onze: el nucli agafa els llocs que entrenen ──
const squad = [
  // N_core = 3 llocs que entrenen; N_rotatius = 2 llocs al 100% × (2 partits − 1).
  // Calen 5 al nucli: 4 per als quatre llocs al 100% (un per partit) i 1 que doble el 50%.
  j(1, 'core', { creativitat: 9 }), j(2, 'core', { creativitat: 8 }),
  j(3, 'core', { creativitat: 7 }), j(4, 'rotatiu', { creativitat: 6 }),
  j(11, 'rotatiu', { extrem: 6 }),
  j(5, 'titular', { defensa: 8 }), j(6, 'titular', { defensa: 7 }),
  j(7, 'porter', { porteria: 9 }), j(8, 'porter', { porteria: 7 }),
  j(9, 'cos', { sou: 200 }), j(10, 'cos', { sou: 250 }),
];
const r = alineaOnzes(squad, LLOCS, PARTITS, { pes_entrenament: 1000 });
assert.equal(r.onze.A.length, LLOCS.length, 'l\'onze A té tots els llocs');
assert.equal(r.onze.B.length, LLOCS.length, 'i l\'onze B també');

// Un lloc que entrena al 100% el cobrix algú del nucli, i eixe algú NO juga l'altre partit
// (max_partits = 1): per això calen rotatius.
const mc1A = r.onze.A.find((x) => x.lloc === 'mc1').jugador;
const mc1B = r.onze.B.find((x) => x.lloc === 'mc1').jugador;
assert.notEqual(mc1A.jugador_id, mc1B.jugador_id, 'un lloc al 100% no el repetix el mateix jugador');
assert.equal(r.assignats[mc1A.jugador_id].length, 1, 'qui ocupa un lloc al 100% juga un sol partit');

// Un lloc que entrena al 50% SÍ que el pot doblar el mateix jugador (50+50 = setmana feta).
const ext1A = r.onze.A.find((x) => x.lloc === 'ext1').jugador;
const ext1B = r.onze.B.find((x) => x.lloc === 'ext1').jugador;
assert.equal(ext1A.jugador_id, ext1B.jugador_id, 'el lloc al 50% el dobla el mateix');
const comptExt = r.comptabilitat.find((c) => c.jugador_id === ext1A.jugador_id);
assert.equal(comptExt.total, 100, '50% + 50% = la setmana completa');

// La porteria queda coberta als DOS partits. Un lloc que no entrena té pct 0 (< 100), així
// que qui l'ocupa pot doblar: el millor porter juga els dos, i el segon queda retingut de
// cobertura sense jugar. És el que el contracte dona (max_partits + maximització), no una
// regla de «un porter per partit».
for (const p of ['A', 'B']) {
  assert.equal(r.onze[p].find((x) => x.lloc === 'por').jugador.categoria, 'porter',
    `la porteria del partit ${p} la cobrix un porter (és qui més hi val)`);
}
assert.equal(r.onze.A.find((x) => x.lloc === 'por').jugador.jugador_id,
  r.onze.B.find((x) => x.lloc === 'por').jugador.jugador_id,
  'i és el mateix: pot doblar perquè el seu lloc no entrena');

// ── Exclusions del contracte: llistat no juga, lesionat no s'alinea ──
const ambBaixes = squad.map((x) => (x.jugador_id === 1 ? { ...x, llistat: true }
  : x.jugador_id === 2 ? { ...x, lesionat: true } : x));
const r2 = alineaOnzes(ambBaixes, LLOCS, PARTITS, { pes_entrenament: 1000 });
const tots = (res) => Object.values(res.onze).flat().map((x) => x.jugador?.jugador_id).filter(Boolean);
assert.ok(!tots(r2).includes(1), 'un llistat no juga');
assert.ok(!tots(r2).includes(2), 'un lesionat no s\'alinea');

// El sancionat només queda fora del partit de LLIGA
const ambSancio = squad.map((x) => (x.jugador_id === 5 ? { ...x, sancionat: true } : x));
const r3 = alineaOnzes(ambSancio, LLOCS, PARTITS, { pes_entrenament: 1000, partit_lliga: 'A' });
assert.ok(!r3.onze.A.some((x) => x.jugador?.jugador_id === 5), 'sancionat: fora de la lliga');
assert.ok(r3.onze.B.some((x) => x.jugador?.jugador_id === 5), 'però juga l\'altre partit');

// ── buit(lloc): amb poca gent es juga amb un menys, no s'inventa ningú ──
const r4 = alineaOnzes([j(1, 'core', { creativitat: 9 })], LLOCS, PARTITS, { pes_entrenament: 1000 });
assert.ok(r4.buits.length > 0, 'els llocs que no es poden cobrir queden buits');
assert.ok(Object.values(r4.onze).flat().some((x) => x.jugador === null), 'i es veu que estan buits');

// ── Els fixats manuals manen (invariant 5) ──
const r5 = alineaOnzes(squad, LLOCS, PARTITS, { pes_entrenament: 1000, fixats: { 'A|mc1': 3 } });
assert.equal(r5.onze.A.find((x) => x.lloc === 'mc1').jugador.jugador_id, 3, 'el fixat ocupa el seu lloc');

// ── Cap del nucli en un lloc que NO entrena havent-hi cos; i si no n'hi ha, plaça buida ──
{
  const LL = [
    { lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat', pes: 1.46 },
    { lloc: 'dc1', entrena: false, habilitat: 'defensa', pes: 0.74 },
  ];
  const P1 = [{ id: 'A', competitiu: true }];
  const ambCos = alineaOnzes([
    j(1, 'core', { creativitat: 9 }),
    j(2, 'cos', { defensa: 3, sou: 200 }),
  ], LL, P1, { pes_entrenament: 1000 });
  assert.equal(ambCos.onze.A.find((x) => x.lloc === 'dc1').jugador.categoria, 'cos',
    'el lloc que no entrena l\'ompli el cos, no el nucli');
  assert.equal(ambCos.onze.A.find((x) => x.lloc === 'mc1').jugador.categoria, 'core');

  // Sense cos: la plaça queda BUIDA (es juga amb un menys); el del nucli no baixa a cobrir-la.
  const senseCos = alineaOnzes([j(1, 'core', { creativitat: 9, defensa: 9 })], LL, P1, { pes_entrenament: 1000 });
  assert.equal(senseCos.onze.A.find((x) => x.lloc === 'dc1').jugador, null,
    'sense cos, el lloc que no entrena queda buit');
  assert.equal(senseCos.onze.A.find((x) => x.lloc === 'mc1').jugador.jugador_id, 1,
    'i el del nucli es queda al seu lloc d\'entrenament');
  assert.ok(senseCos.buits.length === 1, 'el buit es declara, mai en silenci');
}


console.log('OK — onzes v3: greedy per pes, max_partits, exclusions i maximització pura');
