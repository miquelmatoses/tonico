// Tonico — ELS DOS ONZES. node test/dos_onzes.mjs
//
// L'11B no es torna a optimitzar: es COMPON. Els llocs que entrenen al 100% són dels
// entrenables (eixe és el seu motiu d'existir), la porteria és del suplent perquè el porter no
// dobla, el futur entrenador entra si no juga ja a l'11A, i la resta la cobrixen els mateixos
// de l'11A, que no entrenen i poden doblar.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { dosOnzes } from '../lib/dos_onzes.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO personal_membres (usuari_id, rol, tipus, sou, coach_entrenament)
    VALUES (1,'entrenador','entrenador',5000,'passable');
`);
const b = (id, o) => ({ id, nom: 'P' + id, sou: 1000, edat_anys: 26, edat_dies: 0,
  porteria: 1, defensa: 1, creativitat: 1, extrem: 1, passades: 1, anotacio: 1,
  pilota_aturada: 1, experiencia: 1, lideratge: 1, ...o });

const equip = [
  b(1, { porteria: 9 }), b(2, { defensa: 8 }), b(3, { defensa: 7 }),
  b(4, { creativitat: 14 }), b(5, { creativitat: 13 }), b(6, { creativitat: 12 }),
  b(7, { extrem: 7 }), b(8, { extrem: 6 }),
  b(9, { anotacio: 8 }), b(10, { anotacio: 7 }), b(11, { anotacio: 6 }),
  // Tres joves per damunt del mínim de creativitat, i un segon porter barat.
  b(20, { creativitat: 9, edat_anys: 18 }), b(21, { creativitat: 8, edat_anys: 18 }),
  b(22, { creativitat: 7, edat_anys: 18 }),
  b(30, { porteria: 5, sou: 400 }),
  // El veterà amb experiència. La seua MILLOR habilitat és la creativitat (6), que és
  // justament la dels llocs d'entrenament: si el futur entrenador poguera agafar qualsevol
  // lloc, li llevaria la plaça a un entrenable. Ha d'anar al millor dels que QUEDEN, que és
  // el de davanter. Als 26 anys no és candidat a entrenable, així que no competix per ahí.
  b(40, { creativitat: 6, anotacio: 5, experiencia: 12, lideratge: 6 }),
];
const r = await dosOnzes(db, 1, equip, 10291);
const perCodi = (onze) => new Map(onze.map((l) => [l.lloc, l.jugador?.id ?? null]));

// ── 1. L'11A és l'onze ideal tal qual ──
assert.deepEqual(r.onze_a.map((l) => l.jugador?.id), r.estructura.onze.map((l) => l.jugador?.id),
  'l\'onze competitiu no es toca: és el del pla');

// ── 2. A l'11B, els llocs que entrenen al 100% són dels ENTRENABLES ──
{
  const mc = r.onze_b.filter((l) => l.entrena && (l.pct ?? 100) === 100);
  assert.deepEqual(mc.map((l) => l.jugador?.id), [20, 21, 22],
    'els tres mig centres de l\'11B són els entrenables, per orde de tria');
  assert.ok(mc.every((l) => l.motiu === 'entrena'));
  // I NO són els mateixos que a l'11A: si ho foren, els joves no entrenarien mai.
  const mcA = r.onze_a.filter((l) => l.entrena && (l.pct ?? 100) === 100).map((l) => l.jugador?.id);
  assert.ok(mc.every((l) => !mcA.includes(l.jugador?.id)), 'els titulars descansen eixe partit');
}

// ── 3. La PORTERIA és del suplent: el porter no dobla ──
{
  const porA = r.onze_a.find((l) => l.bucket === 'porter').jugador?.id;
  const porB = r.onze_b.find((l) => l.bucket === 'porter');
  assert.equal(porA, 1, 'a l\'11A para el millor');
  assert.equal(porB.jugador?.id, 30, 'i a l\'11B el suplent');
  assert.equal(porB.motiu, 'suplent');
}

// ── 4. El FUTUR ENTRENADOR entra en la seua MILLOR posició de les que queden ──
{
  const seu = r.onze_b.find((l) => l.jugador?.id === 40);
  assert.ok(seu, 'juga a l\'11B encara que no siga dels millors: hi va per experiència');
  assert.equal(seu.motiu, 'experiencia');
  assert.equal(seu.habilitat, 'anotacio',
    'en el millor dels llocs QUE QUEDEN: de creativitat és millor, però eixos són dels que entrenen');
  // I els entrenables conserven els seus: el futur entrenador no els desplaça.
  const mcB = r.onze_b.filter((l) => l.entrena && (l.pct ?? 100) === 100).map((l) => l.jugador?.id);
  assert.deepEqual(mcB, [20, 21, 22], 'els tres mig centres segueixen sent els entrenables');
  assert.ok(r.onze_b.find((l) => l.bucket === 'porter').jugador?.id !== 40, 'ni la porteria');
}

// ── 5. La RESTA dobla: els mateixos de l'11A ──
{
  const a = perCodi(r.onze_a), bb = perCodi(r.onze_b);
  const dobles = r.onze_b.filter((l) => l.motiu === 'dobla');
  assert.ok(dobles.length > 0, 'hi ha llocs que es cobrixen doblant');
  for (const l of dobles) assert.equal(bb.get(l.lloc), a.get(l.lloc),
    `${l.lloc}: el mateix de l'11A, que no entrena i pot jugar els dos partits`);
}

// ── 6. Sense entrenables suficients, la plaça es queda BUIDA i es diu ──
{
  const curt = equip.filter((j) => j.id !== 21 && j.id !== 22);
  const r2 = await dosOnzes(db, 1, curt, 10291);
  const buides = r2.onze_b.filter((l) => l.motiu === 'plaça_buida');
  assert.equal(buides.length, 2, 'dues places d\'entrenament sense ningú');
  assert.ok(buides.every((l) => l.jugador == null), 'i no s\'omplin amb un titular: seria entrenament perdut');
}

console.log('OK — els dos onzes: el competitiu és el del pla, i el d\'entrenament es compon');
