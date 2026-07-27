// Tonico — L'ONZE D'ESTRUCTURA: tots els jugadors col·locats lloc a lloc.
// node test/onze_estructura.mjs
//
// EL FORAT QUE TAPA. Per a mesurar la mancança d'un lloc fa falta saber QUI L'OCUPA, i el full
// deia «el jugador assignat al lloc (PAS 8)» — un pas que va DESPRÉS. L'avaluador se'l
// fabricava: agafava el millor retingut de cada BUCKET. Amb tres llocs de MC, això mesurava
// només el millor MC i MC2 i MC3 no existien per al sistema; la vara mesurava CINC jugadors
// dels onze. I calia decidir abans qui es quedava (PAS 6) per a poder assignar ningú.
//
// Ara es col·loquen TOTS, lloc a lloc, i els que sobren són el residu de l'assignació.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { assignaEstructura } from '../lib/onze.js';
import { onzeEstructura } from '../lib/onze_estructura.js';

// Una sola base per a tot el fitxer: els blocs 5 i 9 la comparteixen.
const { sqlite, db } = nova(import.meta.url);

// ── 1. La mecànica, en net. Els llocs arriben en l'ORDE DE LA FORMACIÓ (el davanter primer)
// per a que es veja que qui mana en la tria és el PES i no la posició a la llista. ──
const llocs = [
  { lloc: 'DAV1', bucket: 'davanter', habilitat: 'anotacio', pes: 0.89 },
  { lloc: 'MC1', bucket: 'mc', habilitat: 'creativitat', pes: 1.46 },
  { lloc: 'MC2', bucket: 'mc', habilitat: 'creativitat', pes: 1.46 },
];
const jug = (id, creativitat, anotacio, sou = 1000) => ({ id, nom: 'J' + id, creativitat, anotacio, sou });
{
  const { onze, sobrants } = assignaEstructura(
    [jug(1, 9, 2), jug(2, 7, 8), jug(3, 4, 9), jug(4, 1, 1)], llocs);
  // L'eixida va en l'orde de la formació (DAV1, MC1, MC2), però la TRIA l'han feta els MC
  // primer per pes: s'enduen els dos millors creatius i al davanter li queda el 3.
  assert.deepEqual(onze.map((l) => l.jugador?.id), [3, 1, 2],
    'els llocs de MÉS PES trien primer, encara que a la llista vagen després');
  assert.deepEqual(sobrants.map((j) => j.id), [4], 'i el que no entra és el residu');
  // MC2 s\'ha quedat el 2 (creativitat 7) encara que el 3 fora millor davanter: qui tria és el
  // lloc, per orde de pes, i el davanter tria després amb el que li queda.
  assert.equal(onze.find((l) => l.lloc === 'DAV1').jugador.id, 3);
  assert.equal(onze[0].lloc, 'DAV1', 'i l\'eixida respecta l\'orde de la formació, per a llegir-la');
}

// ── 2. UN JUGADOR, UN LLOC. Sense això el millor ocuparia tots els llocs de la seua habilitat
// i les mancances de MC2 i MC3 desapareixerien — que és exactament el forat d'abans. ──
{
  const { onze } = assignaEstructura([jug(1, 9, 9), jug(2, 3, 3), jug(3, 2, 2)], llocs);
  const ids = onze.map((l) => l.jugador?.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'cap jugador es repetix en dos llocs');
}

// ── 3. Un lloc sense ningú es queda BUIT, i eixe és el senyal fort ──
{
  const { onze, sobrants } = assignaEstructura([jug(1, 9, 9)], llocs);
  assert.equal(onze.filter((l) => l.jugador == null).length, 2, 'dos llocs sense ocupant');
  assert.deepEqual(sobrants, [], 'i cap sobrant: no en quedaven');
}

// ── 4. DETERMINISTA: a igualtat d'habilitat, el més barat; i a igualtat de sou, l'id. Si no,
// l'onze ballaria a cada pujada sense que haguera canviat res. ──
{
  const a = assignaEstructura([jug(5, 7, 0, 900), jug(6, 7, 0, 900), jug(7, 7, 0, 500)], llocs);   // eslint-disable-line
  const b = assignaEstructura([jug(7, 7, 0, 500), jug(6, 7, 0, 900), jug(5, 7, 0, 900)], llocs);
  assert.deepEqual(a.onze.map((l) => l.jugador?.id), b.onze.map((l) => l.jugador?.id),
    'el mateix conjunt dona el mateix onze, arribe en l\'orde que arribe');
  assert.equal(a.onze.find((l) => l.lloc === 'MC1').jugador.id, 7,
    'a igualtat d\'habilitat, el més barat');
}

// ── 5. I d'extrem a extrem, amb la formació de veres: 2-5-3 ──
{
  sqlite.exec(`
    INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
    INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
      VALUES (1,'competitiva','ES','VII','cap',2);
    INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
    INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  `);
  // Amb EDAT: sense ella tots passaven per joves i la prova dels entrenables no volia dir res.
  // Estos són els de sempre, ja passada l'edat de pic de venda.
  const plantilla = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1, nom: 'J' + (i + 1), sou: 1000, edat_anys: 26, edat_dies: 0,
    porteria: i === 0 ? 9 : 1, defensa: i > 0 && i < 4 ? 8 - i : 1,
    creativitat: i >= 4 && i < 8 ? 9 - i % 4 : 1,
    extrem: i >= 8 && i < 11 ? 7 : 1, anotacio: i >= 11 ? 8 : 1,
  }));
  const { onze, sobrants } = await onzeEstructura(db, 1, plantilla);
  assert.equal(onze.length, 11, 'onze llocs');
  const compta = onze.reduce((a, l) => ({ ...a, [l.bucket]: (a[l.bucket] ?? 0) + 1 }), {});
  assert.deepEqual(compta, { porter: 1, defensa: 2, mc: 3, extrem: 2, davanter: 3 },
    '1 porter · 2 defenses · 3 mig centres · 2 extrems · 3 davanters');
  assert.equal(onze.length + sobrants.length, 14, 'tots els jugadors estan comptats: onze i residu');
  const ids = onze.map((l) => l.jugador?.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'i cap repetit');

  // ── 6. LA VARA VIU A LA MATEIXA FILA: contra quina habilitat es mesura el lloc i quin
  // nivell paga el flux. Sense el sostre de sou no se n'inventa cap.
  const ambVara = await onzeEstructura(db, 1, plantilla, 10291);
  for (const l of ambVara.onze) {
    assert.ok(l.habilitat, `${l.bucket}: el lloc diu contra què es mesura`);
    assert.ok(l.nivell_objectiu > 0, `${l.bucket}: i quin nivell paga el flux`);
  }
  // Els davanters pesen més que els defenses (2-5-3), o siga que no poden demanar menys.
  const niv = (b) => ambVara.onze.find((l) => l.bucket === b).nivell_objectiu;
  assert.ok(niv('davanter') >= niv('defensa'),
    'amb 3 davanters i 2 defenses, l\'atac no pot quedar per davall de la defensa');
  const sense = await onzeEstructura(db, 1, plantilla, null);
  assert.equal(sense.onze[0].nivell_objectiu, null, 'sense sostre de sou, cap objectiu inventat');

  // ── 7. ENTRENABLES: els joves del motor, trets del RESIDU de l'onze. Tres, no cinc: només
  // els llocs que entrenen AL 100% (els mig centres) i un per cada partit extra de la setmana.
  // Els extrems entrenen al 50% i no compten.
  // Un titular JOVE i bo en creativitat: si els entrenables no isqueren del RESIDU sinó de
  // tota la plantilla, este eixiria als dos llocs alhora.
  plantilla[4] = { ...plantilla[4], edat_anys: 18, creativitat: 12 };
  const joves = [...plantilla, ...Array.from({ length: 4 }, (_, i) => ({
    id: 100 + i, nom: 'Jove' + i, sou: 500, edat_anys: 18, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 6 - i, extrem: 1, anotacio: 1,
  }))];
  const r = await onzeEstructura(db, 1, joves, 10291);
  assert.equal(r.entrenables_max, 3, 'tres places: 3 llocs al 100% × (2 partits − 1)');
  assert.equal(r.habilitat_entrenament, 'creativitat', 'i es mesuren en el que s\'entrena');
  assert.deepEqual(r.entrenables.map((j) => j.id), [100, 101, 102],
    'els millors en creativitat dels que NO han entrat a l\'onze, per orde');
  const dinsOnze = new Set(r.onze.map((l) => l.jugador?.id));
  assert.ok(r.entrenables.every((j) => !dinsOnze.has(j.id)),
    'cap entrenable està a l\'onze: ixen del residu, no es dupliquen');
  assert.ok(dinsOnze.has(plantilla[4].id) && !r.entrenables.some((j) => j.id === plantilla[4].id),
    'i el titular jove amb la millor creativitat es queda a l\'onze, no baixa a entrenable');

  // I els VELLS no hi entren, per molta creativitat que tinguen: es venen cars quan creixen, i
  // un de 26 anys ja no creix.
  const vell = [...plantilla, { id: 200, nom: 'Vell', sou: 500, edat_anys: 30, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 9, extrem: 1, anotacio: 1 }];
  const r2 = await onzeEstructura(db, 1, vell, 10291);
  assert.ok(!r2.entrenables.some((j) => j.id === 200),
    'passada l\'edat de pic de venda, ja no és entrenable');
}

// ── 8. LA DIFERÈNCIA contra l'objectiu del lloc, signada i en l'escala de Hattrick. És el que
// substituïx la puntuació a la columna: onze jugadors mesurats amb la fórmula de la seua
// categoria —nucli, venda, cos— no es podien comparar entre ells a la mateixa columna.
{
  const llocs2 = [{ lloc: 'MC1', bucket: 'mc', habilitat: 'creativitat', pes: 1.46, nivell_objectiu: 9 }];
  const curt = assignaEstructura([jug(1, 8, 0)], llocs2).onze[0];
  assert.equal(curt.diferencia, -1, 'CR 8 contra un objectiu de 9: li falta 1');
  assert.equal(curt.senyal, 'baix', 'i el senyal el tria l\'avaluador, que la vista no compara');
  const just = assignaEstructura([jug(1, 9, 0)], llocs2).onze[0];
  assert.equal(just.diferencia, 0, 'qui arriba just, ni li falta ni li sobra');
  assert.equal(just.senyal, 'alt', 'i arribar compta com a arribar');
  const sobrat = assignaEstructura([jug(1, 12, 0)], llocs2).onze[0];
  assert.equal(sobrat.diferencia, 3, 'i qui va sobrat, ho diu en positiu');
  const sensObj = assignaEstructura([jug(1, 8, 0)], [{ ...llocs2[0], nivell_objectiu: null }]).onze[0];
  assert.equal(sensObj.diferencia, null, 'sense objectiu no se n\'inventa cap diferència');
  const buit = assignaEstructura([], llocs2).onze[0];
  assert.equal(buit.diferencia, null, 'ni per a un lloc sense ningú');
}

// ── 9. FUTUR ENTRENADOR i PORTER SUPLENT: els altres dos que la segona alineació necessita.
{
  const base = (id, o) => ({ id, nom: 'X' + id, sou: 1000, edat_anys: 26, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 1, extrem: 1, passades: 1, anotacio: 1,
    pilota_aturada: 1, experiencia: 1, lideratge: 1, ...o });
  const equip = [
    base(1, { porteria: 9 }), base(2, { defensa: 8 }), base(3, { defensa: 7 }),
    // Un TITULAR amb més experiència que el veterà: el futur entrenador ha d'eixir del RESIDU,
    // o si no ens quedaríem sense mig centre per a convertir-lo en entrenador.
    base(4, { creativitat: 9, experiencia: 15 }), base(5, { creativitat: 8 }), base(6, { creativitat: 7 }),
    base(7, { extrem: 7 }), base(8, { extrem: 6 }),
    base(9, { anotacio: 8 }), base(10, { anotacio: 7 }), base(11, { anotacio: 6 }),
    base(12, { creativitat: 5, edat_anys: 18 }), base(13, { creativitat: 4, edat_anys: 18 }),
    base(14, { creativitat: 3, edat_anys: 18 }),
    base(20, { anotacio: 4, experiencia: 12, lideratge: 6 }),   // el veterà
    // Molt de lideratge i gens d'experiència: si el criteri fora el lideratge, guanyaria este.
    base(23, { anotacio: 3, experiencia: 2, lideratge: 20 }),
    // El més barat de tota la plantilla, i NO és porter: si «porter» no es deduïx, se'l tria.
    base(24, { anotacio: 2, sou: 150 }),
    base(21, { porteria: 5, sou: 400 }), base(22, { porteria: 6, sou: 900 }),
  ];
  const r = await onzeEstructura(db, 1, equip, 10291);

  // El FUTUR ENTRENADOR: el de més experiència del residu, i el preu ix de la taula de la guia
  // indexada per experiència. No es tria per com juga: el que compta és l'experiència.
  assert.equal(r.futur_entrenador.id, 20, 'el de més EXPERIÈNCIA del residu, encara que jugue mal');
  assert.notEqual(r.futur_entrenador.id, 23, 'i no el de més lideratge: el lideratge no és el criteri');
  assert.notEqual(r.futur_entrenador.id, 4, 'ni un titular, per molta experiència que tinga');
  assert.equal(r.reconversio.solid, 430000, 'i el preu ix de la seua fila de la taula');
  assert.ok(!r.onze.some((l) => l.jugador?.id === 20), 'ix del residu, no de l\'onze');

  // El PORTER SUPLENT: el porter més barat que queda. «Porter» es DEDUÏX (la porteria és la
  // seua millor habilitat); si no, el més barat de la plantilla seria un davanter amb PO 1.
  assert.equal(r.porter_suplent.id, 21, 'el porter més barat dels que queden');
  assert.notEqual(r.porter_suplent.id, 24, 'i no el més barat a seques, que és un davanter');
  assert.notEqual(r.porter_suplent.id, r.onze.find((l) => l.bucket === 'porter').jugador?.id,
    'i mai el que ja para a l\'onze');
  // Amb només DOS porters, el suplent és simplement el que queda.
  const dos = equip.filter((j) => j.id !== 22);
  assert.equal((await onzeEstructura(db, 1, dos, 10291)).porter_suplent.id, 21,
    'amb dos porters, el suplent és el que no para');
  // I sense cap més porter, no se n'inventa cap.
  const un = equip.filter((j) => j.id !== 21 && j.id !== 22);
  assert.equal((await onzeEstructura(db, 1, un, 10291)).porter_suplent, null,
    'sense segon porter no se n\'inventa: és una plaça que et falta');
}

console.log('OK — l\'onze d\'estructura: tots els jugadors, lloc a lloc, un jugador un lloc');
