// Tonico — MOTOR D'ENTRENAMENT SÈNIOR GENERAL. Canviar l'entrenament triat ha de
// canviar quines posicions entrenen, a quin %, la cobertura i l'alineació —tot derivat,
// res cablejat. node test/entrenament_places.mjs
import assert from 'node:assert/strict';
import { placesEntrenament, aplicaEntrenament } from '../lib/entrenament_places.js';
import { assignaEstructura } from '../lib/onze.js';
import { cobertura } from '../lib/cobertura.js';

const TAULA = { porteria: ['porter'], defensa: ['defensa'], creativitat: ['mc'], passades: ['mc', 'extrem', 'davanter'], extrem: ['extrem'], anotacio: ['davanter'], pilota_aturada: ['porter'] };
const BAIX = { creativitat: ['extrem'], extrem: ['defensa'] };            // guia §6

// ── 1. placesEntrenament: 100% de la taula, 50% de la taula baixa (el 100% mana) ──
assert.deepEqual(placesEntrenament('creativitat', TAULA, BAIX), { mc: 100, extrem: 50 }, 'creativitat: MC 100, extrem 50');
assert.deepEqual(placesEntrenament('defensa', TAULA, BAIX), { defensa: 100 }, 'defensa: només defensa 100');
assert.deepEqual(placesEntrenament('extrem', TAULA, BAIX), { extrem: 100, defensa: 50 }, 'extrem: extrem 100, defensa 50');
assert.deepEqual(placesEntrenament('anotacio', TAULA, BAIX), { davanter: 100 }, 'anotació: davanter 100');
assert.deepEqual(placesEntrenament('passades', TAULA, BAIX), { mc: 100, extrem: 100, davanter: 100 }, 'passades: tres buckets al 100');

// Formació fàbrica (1 POR, 3 DC, 3 MC, 2 EXT, 2 DAV).
const FORMACIO = [
  { codi: 'POR', bucket: 'porter' }, { codi: 'DC1', bucket: 'defensa' }, { codi: 'DC2', bucket: 'defensa' }, { codi: 'DC3', bucket: 'defensa' },
  { codi: 'MC1', bucket: 'mc' }, { codi: 'MC2', bucket: 'mc' }, { codi: 'MC3', bucket: 'mc' },
  { codi: 'EX1', bucket: 'extrem' }, { codi: 'EX2', bucket: 'extrem' }, { codi: 'DV1', bucket: 'davanter' }, { codi: 'DV2', bucket: 'davanter' },
];
const rols = [{ id: 'A', competitiu: 1 }, { id: 'B', competitiu: 0 }];

// ── 2. aplicaEntrenament posa entrena/pct a cada slot segons el bucket ──
const slotsCrea = aplicaEntrenament(FORMACIO, placesEntrenament('creativitat', TAULA, BAIX));
assert.equal(slotsCrea.filter((s) => s.bucket === 'mc' && s.entrena && s.pct === 100).length, 3, 'creativitat → 3 MC al 100%');
assert.equal(slotsCrea.filter((s) => s.bucket === 'extrem' && s.entrena && s.pct === 50).length, 2, 'creativitat → 2 extrems al 50%');
assert.ok(slotsCrea.filter((s) => s.bucket === 'defensa').every((s) => !s.entrena), 'creativitat → els defenses no entrenen');

const slotsDef = aplicaEntrenament(FORMACIO, placesEntrenament('defensa', TAULA, BAIX));
assert.equal(slotsDef.filter((s) => s.bucket === 'defensa' && s.entrena && s.pct === 100).length, 3, 'defensa → 3 DC al 100%');
assert.ok(slotsDef.filter((s) => s.bucket === 'mc').every((s) => !s.entrena), 'defensa → els MC ja NO entrenen');

// ── 3. LA COBERTURA es deriva: entrenaments distints → objectius distints ──
const cobCrea = cobertura({ slots: slotsCrea, rols }, { futur_entrenador: 1 });
assert.equal(cobCrea.entrenables_objectiu, 8, 'creativitat: (3×100 + 2×50) × 2 = 8');
const cobDef = cobertura({ slots: slotsDef, rols }, { futur_entrenador: 1 });
assert.equal(cobDef.entrenables_objectiu, 6, 'defensa: 3×100 × 2 = 6');
assert.notEqual(cobCrea.entrenables_objectiu, cobDef.entrenables_objectiu, 'canviar l\'entrenament mou l\'objectiu d\'entrenables');

// ── 4. L'ALINEACIÓ es deriva: amb defensa, entrenen els DEFENSES, no els MC ──
// AMB HABILITATS: un jugador que no aporta res enlloc ja no ocupa cap lloc —val més buit, que
// és el senyal fort—, o siga que un fixture sense números no provaria l'alineació sinó el buit.
const squad = Array.from({ length: 8 }, (_, i) => ({ jugador_id: i + 1, nom: 'E' + i, posicio: 'DC',
  categoria: 'core', porteria: 5, defensa: 5, creativitat: 5, extrem: 5, passades: 5, anotacio: 5 }));
const llocsDe = (slots) => slots.map((sl, i) => ({ lloc: `${sl.bucket}${i + 1}`, bucket: sl.bucket,
  entrena: !!sl.entrena, pct: sl.pct ?? 100, habilitat: { porter: 'porteria', defensa: 'defensa',
  mc: 'creativitat', extrem: 'extrem', davanter: 'anotacio' }[sl.bucket], pes: 1 }));
const rCrea = assignaEstructura(squad, llocsDe(slotsCrea));
// L'assignació torna UN onze (l'estructura); el segon es compon damunt d'ell al PAS 9.
const entrenaEn = (r, bucket) => r.onze.filter((s) => s.bucket === bucket && s.jugador && s.entrena).length;
assert.ok(entrenaEn(rCrea, 'mc') > 0, 'creativitat: hi ha entrenables entrenant d\'MC');
assert.equal(entrenaEn(rCrea, 'defensa'), 0, 'creativitat: cap entrenable entrena de defensa');

const rDef = assignaEstructura(squad, llocsDe(slotsDef));
assert.ok(entrenaEn(rDef, 'defensa') > 0, 'defensa: ara els entrenables entrenen de DEFENSA');
assert.equal(entrenaEn(rDef, 'mc'), 0, 'defensa: ja NINGÚ entrena d\'MC');
// I la comptabilitat reflectix el 100% en un sol partit (buckets al 100%, no doblen).
// La comptabilitat de minuts era de l'alineació vella (dos partits, un repartiment). L'onze
// d'estructura no reparteix minuts: assigna llocs, i el segon onze es compon damunt d'ell.

console.log('OK — motor d\'entrenament sènior general: places, %, cobertura i alineació es deriven del que es tria');

// ── 5. END-TO-END per BD: l'override entrenament_senior del pla mana sobre la fase ──
{
  const { nova } = await import('./_d1shim.mjs');
  const { entrenamentEfectiu } = await import('../lib/entrenament_places.js');
  const { sqlite, db } = nova(import.meta.url);
  sqlite.exec(`INSERT INTO usuaris (id,correu,contrasenya) VALUES (1,'z','x');
               INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
  // Per defecte: el que prescriu la fase (creativitat) → MC 100 / extrem 50.
  const def = await entrenamentEfectiu(db, 1);
  // v3 (PAS 1): l'entrenament és PRESCRIPCIÓ, no configuració. Ix dels poms del contracte
  // (creativitat + passades), no d'una fase ni d'un override del pla.
  assert.equal(def.skill, 'creativitat', 'A prescrit');
  assert.equal(def.intensitat, 100);
  assert.deepEqual(def.places, { mc: 100, extrem: 50 });
  // Canviar la prescripció (el contracte) sí que canvia la derivació; un «override del
  // pla» ja no existix.
  sqlite.prepare("UPDATE plantilles_parametres SET valor='defensa' WHERE plantilla='competitiva' AND clau='entrenament_a'").run();
  const ov = await entrenamentEfectiu(db, 1);
  assert.equal(ov.skill, 'defensa', 'canviar la prescripció canvia les places');
  assert.deepEqual(ov.places, { defensa: 100 }, 'defensa → només defensa 100 (cap 50)');
}
console.log('OK — l\'override entrenament_senior canvia la derivació per BD');
