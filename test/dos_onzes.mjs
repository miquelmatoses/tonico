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

// TITULARS COMPLETS, no monotemàtics: amb el policultiu un jove amb creativitat 9 i la resta a
// 1 li lleva la plaça a un titular que només té la seua habilitat, i llavors els entrenables
// —que han d'eixir del RESIDU— es queden sense residu d'on eixir.
const t = (o) => ({ defensa: 6, creativitat: 6, extrem: 6, passades: 6, anotacio: 6, ...o });
const equip = [
  b(1, t({ porteria: 12, defensa: 8 })), b(2, t({ defensa: 12 })), b(3, t({ defensa: 11 })),
  b(4, t({ creativitat: 14 })), b(5, t({ creativitat: 13 })), b(6, t({ creativitat: 12 })),
  b(7, t({ extrem: 11 })), b(8, t({ extrem: 10 })),
  b(9, t({ anotacio: 12 })), b(10, t({ anotacio: 11 })), b(11, t({ anotacio: 10 })),
  // Tres joves per damunt del mínim de creativitat, i un segon porter barat.
  b(20, { creativitat: 9, edat_anys: 18 }), b(21, { creativitat: 8, edat_anys: 18 }),
  b(22, { creativitat: 7, edat_anys: 18 }),
  b(30, { porteria: 5, sou: 400 }),
  // El veterà amb experiència. La seua MILLOR habilitat és la creativitat (6), que és
  // justament la dels llocs d'entrenament: si el futur entrenador poguera agafar qualsevol
  // lloc, li llevaria la plaça a un entrenable. Ha d'anar al millor dels que QUEDEN, que és
  // el de davanter. Als 26 anys no és candidat a entrenable, així que no competix per ahí.
  b(40, { creativitat: 6, extrem: 5, anotacio: 4, experiencia: 12, lideratge: 6 }),
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

// ── 2b. ELS EXTREMS DOBLEN SÍ O SÍ. Entrenen al 50%, o siga que el seu lloc també és
// entrenament: no se cedix a ningú, ni al futur entrenador. Són els mateixos de l'11A.
{
  const exA = r.onze_a.filter((l) => l.bucket === 'extrem').map((l) => l.jugador?.id);
  const exB = r.onze_b.filter((l) => l.bucket === 'extrem');
  assert.deepEqual(exB.map((l) => l.jugador?.id), exA, 'els mateixos extrems als dos onzes');
  assert.ok(exB.every((l) => l.motiu === 'entrena_mig'),
    'i el motiu és que ENTRENEN, no que dobles per omplir');
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
    'en el millor dels llocs QUE QUEDEN: de creativitat i d\'extrem és millor, però eixos entrenen');
  // I els entrenables conserven els seus: el futur entrenador no els desplaça.
  const mcB = r.onze_b.filter((l) => l.entrena && (l.pct ?? 100) === 100).map((l) => l.jugador?.id);
  assert.deepEqual(mcB, [20, 21, 22], 'els tres mig centres segueixen sent els entrenables');
  assert.ok(r.onze_b.find((l) => l.bucket === 'porter').jugador?.id !== 40, 'ni la porteria');
  assert.ok(!r.onze_b.some((l) => l.bucket === 'extrem' && l.jugador?.id === 40),
    'ni cap extrem, encara que hi valga més que de davanter: eixos llocs entrenen');
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

// ── 7. SENSE PORTER SUPLENT, la porteria de l'onze_B es queda BUIDA i es diu ──
// Abans s'hi quedava el TITULAR amb el motiu «dobla» — justament l'única cosa que no pot
// passar (el porter no dobla). Es pintava una alineació legal que no ho era, i alhora Mercat
// demanava comprar un porter suplent: les dues pantalles dient coses distintes.
{
  const senseSuplent = equip.filter((j) => j.id !== 30);
  const r3 = await dosOnzes(db, 1, senseSuplent, 10291);
  const por = r3.onze_b.find((l) => l.bucket === 'porter');
  assert.equal(por.jugador, null, 'la porteria de l\'onze_B es queda sense ningú');
  assert.equal(por.motiu, 'porteria_buida', 'i es diu, no es dissimula amb un «dobla»');
  const titular = r3.onze_a.find((l) => l.bucket === 'porter').jugador;
  assert.ok(titular, 'el titular seguix a l\'onze_A');
  assert.notEqual(r3.onze_b.find((l) => l.bucket === 'porter').jugador?.id, titular.id,
    'i no apareix als dos onzes: el porter no dobla');
}

// ── 8. UNA LESIÓ AL DAVANT NO ES MENJA L'ENTRENAMENT ──
// El davanter titular cau i el millor recanvi disponible és el jove de creativitat: a l'11A
// juga de davanter (l'assignació és maximització pura), però SEGUIX SENT ENTRENABLE — a
// l'11B entra al mig centre, i el lloc de davanter que buida l'ocupa el millor que no jugue
// ja eixe partit. Abans el jove eixia dels entrenables (ja no era residu), doblava de
// davanter sense entrenar i el mig centre es quedava buit: es jugava amb un menys.
{
  const lesio = equip.map((j) => (j.id === 9 ? { ...j, lesio: '3' }
    : j.id === 20 ? { ...j, anotacio: 7 } : j));
  const r4 = await dosOnzes(db, 1, lesio, 10291);
  const davA = r4.onze_a.filter((l) => l.bucket === 'davanter').map((l) => l.jugador?.id);
  assert.ok(davA.includes(20), 'el jove tapa el forat de la lesió a l\'onze A');
  assert.ok(!r4.onze_a.some((l) => l.jugador?.id === 9), 'el lesionat no juga l\'11A');
  const mc = r4.onze_b.filter((l) => l.entrena && (l.pct ?? 100) === 100);
  assert.deepEqual(mc.map((l) => l.jugador?.id), [20, 21, 22],
    'el jove no perd el seu lloc d\'entrenament a l\'11B');
  const ids = r4.onze_b.map((l) => l.jugador?.id).filter((x) => x != null);
  assert.equal(new Set(ids).size, ids.length, 'ningú apareix dues vegades a l\'11B');
  assert.equal(ids.length, 11, 'cap lloc buit: el davanter que buida el jove l\'ompli el millor disponible');
  assert.ok(!ids.includes(9), 'el lesionat tampoc juga l\'11B');
}

console.log('OK — els dos onzes: el competitiu és el del pla, i el d\'entrenament es compon');
