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

// ── 4b. ÒPTIM, NO VORAÇ: es mira el CONJUNT, no la millor parella una darrere l'altra.
// El cas real que ho va destapar: un davanter de 33 anys valia 6,51 al mig centre i 7,93 al
// davanter, però com que el mig PESA més la parella «mc × ell» valia més i se l'enduia el mig.
// Quan li tocava al davanter ja només quedava un molt pitjor: es guanyaven 0,06 i se'n perdien
// 1,93, i de retruc un jove queia de l'onze i acabava a venda.
//
// Fan falta DOS llocs del pes gros per a que el voraç ensopegue: el primer se l'endú el millor
// i el segon se l'endú qui hauria d'anar a l'altre lloc.
{
  const mc = (n) => ({ lloc: 'MC' + n, bucket: 'mc', habilitat: 'creativitat',
    pesos_habilitat: { creativitat: 1 }, pes: 1.5 });
  const LL = [mc(1), mc(2), { lloc: 'DAV1', bucket: 'davanter', habilitat: 'anotacio',
    pesos_habilitat: { anotacio: 1 }, pes: 1 }];
  const j = (id, cre, ano) => ({ id, nom: 'J' + id, sou: 1000, creativitat: cre, anotacio: ano });
  const B = j(1, 10, 0), A = j(2, 9, 9), D = j(3, 8, 1);
  const { onze } = assignaEstructura([B, A, D], LL);
  // El voraç faria MC1←B (15), MC2←A (13,5) i deixaria el davanter per a D (1): total 29,5.
  // L'òptim posa A al davanter i D al segon mig centre: 15 + 12 + 9 = 36.
  assert.equal(onze.find((l) => l.lloc === 'DAV1').jugador.id, A.id,
    'se\'n va on el CONJUNT guanya, encara que la seua millor parella fora el mig centre');
  assert.deepEqual(onze.filter((l) => l.bucket === 'mc').map((l) => l.jugador.id), [B.id, D.id]);
  const val = (jj, l) => (l.pes ?? 0) * (jj[l.habilitat] ?? 0);
  const total = onze.reduce((a, l) => a + (l.jugador ? val(l.jugador, l) : 0), 0);
  assert.equal(total, 36, 'i el total és el màxim possible, no el que trau la millor parella');
}

// ── 5. I d'extrem a extrem, amb la formació de veres: 2-5-3 ──
{
  sqlite.exec(`
    INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
    INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
      VALUES (1,'competitiva','ES','VII','cap',2);
    INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
    INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
    -- Cal entrenador: sense el seu nivell no hi ha velocitat, i sense velocitat no es pot dir
    -- si la pròxima pujada cau abans del límit d'edat — o siga que no hi hauria entrenables.
    INSERT INTO personal_membres (usuari_id, rol, tipus, sou, coach_entrenament)
      VALUES (1,'entrenador','entrenador',5000,'passable');
  `);
  // Amb EDAT: sense ella tots passaven per joves i la prova dels entrenables no volia dir res.
  // Estos són els de sempre, ja passada l'edat de pic de venda.
  const plantilla = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1, nom: 'J' + (i + 1), sou: 1000, edat_anys: 26, edat_dies: 0,
    porteria: i === 0 ? 9 : 1, defensa: i > 0 && i < 4 ? 8 - i : 1,
    creativitat: i >= 4 && i < 8 ? 13 - (i - 4) : 1,
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
    assert.ok(Object.keys(l.perfil_objectiu ?? {}).length > 0, `${l.bucket}: i quin perfil paga el flux`);
  }
  // EL PRESSUPOST SEGUIX EL PES, i això sí que és invariant. Abans això es provava dient «el
  // davanter ha de rebre més que el central», que era cert mentre l'atac pesava més — i va
  // deixar de ser-ho el dia que Miquel va pujar la importància de la defensa perquè encaixava
  // massa gols (117). Un guardià que fixa el RESULTAT d'una calibració peta cada volta que es
  // calibra; el que ha de fixar és la regla.
  //
  // Es compara el SOU del perfil i no el nivell (v2 del motor): l'equivalent és una mitjana
  // ponderada de les habilitats que compten en eixe lloc, i cada lloc en té un nombre distint
  // —el davanter aporta amb quatre i el central amb dues—. Repartir el mateix diner entre més
  // habilitats baixa la mitjana encara que la contribució total siga major, o siga que
  // l'equivalent val per a comparar un JUGADOR amb el SEU lloc i no dos llocs entre ells.
  const fila = (b) => ambVara.onze.find((l) => l.bucket === b);
  const buckets = [...new Set(ambVara.onze.map((l) => l.bucket))];
  for (const a of buckets) {
    for (const b of buckets) {
      if (fila(a).pes <= fila(b).pes) continue;
      assert.ok(fila(a).sou_objectiu >= fila(b).sou_objectiu,
        `${a} pesa més que ${b}, o siga que no pot rebre menys pressupost`);
    }
  }
  const sense = await onzeEstructura(db, 1, plantilla, null);
  assert.equal(sense.onze[0].perfil_objectiu, null, 'sense sostre de sou, cap objectiu inventat');

  // ── 7. ENTRENABLES: els joves del motor, trets del RESIDU de l'onze. Tres, no cinc: només
  // els llocs que entrenen AL 100% (els mig centres) i un per cada partit extra de la setmana.
  // Els extrems entrenen al 50% i no compten.
  // Un titular JOVE i bo en creativitat: si els entrenables no isqueren del RESIDU sinó de
  // tota la plantilla, este eixiria als dos llocs alhora.
  plantilla[4] = { ...plantilla[4], edat_anys: 18, creativitat: 12 };
  // Per damunt del mínim de creativitat (6): per davall ja no són candidats a entrenar.
  const joves = [...plantilla, ...Array.from({ length: 4 }, (_, i) => ({
    id: 100 + i, nom: 'Jove' + i, sou: 500, edat_anys: 18, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 9 - i, extrem: 1, anotacio: 1,
  }))];
  const r = await onzeEstructura(db, 1, joves, 10291);
  assert.equal(r.entrenables_max, 3, 'tres places: 3 llocs al 100% × (2 partits − 1)');
  assert.equal(r.habilitat_entrenament, 'creativitat', 'i es mesuren en el que s\'entrena');
  // L'ESPERAT ES DERIVA, no s'escriu: amb el policultiu, qui entra a l'onze ja no és qui té la
  // millor habilitat solta —un mig amb 8 en tot aporta més que un amb creativitat 9 i res més—,
  // o siga que la llista de qui queda al residu canvia. El que NO canvia és la regla: els
  // millors en el que s'entrena, d'entre els que no ocupen lloc.
  const aLOnze = new Set(r.onze.filter((l) => l.jugador).map((l) => l.jugador.id));
  // El llistó ix del POM, no d'un número escrit ací: és el mateix `entrenable_creativitat_min`
  // que gasten el planter i el mercat, i quan es mou (118: 6 → 7) este test ha de moure's sol.
  const llisto = Number((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenable_creativitat_min'").first()).valor);
  const esperats = joves.filter((j) => !aLOnze.has(j.id) && Number(j.creativitat ?? 0) >= llisto)
    .sort((a, b) => Number(b.creativitat) - Number(a.creativitat)).slice(0, 3).map((j) => j.id);
  assert.deepEqual(r.entrenables.map((j) => j.id), esperats,
    'els millors en creativitat dels que NO han entrat a l\'onze, per orde');
  assert.ok(r.entrenables.every((j) => !aLOnze.has(j.id)), 'i cap d\'ells ocupa lloc a l\'onze');
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

// ── 8. QUÈ LI FALTA AL LLOC per a ser el de la plantilla ideal. Hi ha una plantilla IDEAL
// —cada lloc amb el perfil que el seu pressupost paga— i una de REAL: l'única feina és
// acostar-les, i açò és eixa resta. NOMÉS EL QUE FALTA: un jugador millor que el perfil no
// deixa cap forat, i el que costa de més es cobra en euros (`sobrecost`), no en nivells.
{
  const llocs2 = [{ lloc: 'MC1', bucket: 'mc', habilitat: 'creativitat', pes: 1.46,
    pesos_habilitat: { creativitat: 3, defensa: 1 },
    perfil_objectiu: { creativitat: 9, defensa: 6 } }];
  const jugMC = (cre, def) => ({ id: 1, nom: 'J', sou: 1000, edat_anys: 26, edat_dies: 0,
    porteria: 1, defensa: def, creativitat: cre, extrem: 1, passades: 1, anotacio: 1, pilota_aturada: 1 });

  const curt = assignaEstructura([jugMC(8, 6)], llocs2).onze[0];
  assert.deepEqual(curt.mancances, { creativitat: 1 }, 'CR 8 contra un perfil de 9: li falta 1 de creativitat');
  assert.equal(curt.distancia, 3 / 4, 'i en un número, el forat ponderat pel pes de cada habilitat');
  assert.equal(curt.senyal, 'baix', 'el senyal el tria l\'avaluador, que la vista no compara');

  const just = assignaEstructura([jugMC(9, 6)], llocs2).onze[0];
  assert.deepEqual(just.mancances, {}, 'qui clava el perfil no té cap forat');
  assert.equal(just.distancia, 0);
  assert.equal(just.senyal, 'alt', 'arribar compta com a arribar');

  // EL QUE SOBRA NO ÉS UN FORAT. Amb la distància absoluta este eixiria a 3 i Tonico donaria
  // el lloc al mediocre que s'ajusta: el bug del monocultiu al revés.
  const sobrat = assignaEstructura([jugMC(12, 6)], llocs2).onze[0];
  assert.deepEqual(sobrat.mancances, {}, 'un jugador millor que el perfil el tapa del tot');
  assert.equal(sobrat.distancia, 0);

  // I NO ES COMPENSA. El que li sobra de creativitat no tapa el que li falta de defensa: el
  // forat és per habilitat, i per això es pot pintar i llegir.
  const barrejat = assignaEstructura([jugMC(12, 1)], llocs2).onze[0];
  assert.deepEqual(barrejat.mancances, { defensa: 5 }, 'li sobra creativitat i li falta defensa');
  // I EL FORAT ES VEU, però no genera necessitat: aporta més que el perfil, o siga que
  // comprar no ho arregla —l'assignació tornaria a triar-lo a ell—. La contribució decidix SI
  // hi ha necessitat i el vector diu ON.
  assert.equal(barrejat.distancia, 0, 'qui arriba en conjunt no genera necessitat de fitxatge');
  // LA VORA: qui aporta EXACTAMENT el mateix que el perfil tampoc no genera necessitat.
  // CR10/DEF3 dona (30+3)/4 = 8,25, clavat al perfil CR9/DEF6 — comprar no guanya res.
  const just2 = assignaEstructura([jugMC(10, 3)], llocs2).onze[0];
  assert.deepEqual(just2.mancances, { defensa: 3 }, 'li falta defensa…');
  assert.equal(just2.distancia, 0, '…però aporta clavat el que el perfil: no hi ha res a guanyar');
  // Qui NO arriba en conjunt sí que en genera, i el número el ponderen els pesos del lloc.
  const curt2 = assignaEstructura([jugMC(9, 1)], llocs2).onze[0];
  assert.equal(curt2.distancia, 5 / 4, 'el forat ponderat pel pes de cada habilitat al lloc');

  const sensPerfil = assignaEstructura([jugMC(8, 6)], [{ ...llocs2[0], perfil_objectiu: null }]).onze[0];
  assert.equal(sensPerfil.mancances, null, 'sense perfil no se n\'inventa cap forat');
  assert.equal(sensPerfil.distancia, null);
  const buit = assignaEstructura([], llocs2).onze[0];
  assert.equal(buit.mancances, null, 'ni per a un lloc sense ningú');
  assert.equal(buit.distancia, null);
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

// ── 9b. EL DESEMPAT ENTRE IGUALS: qui està més a prop de pujar de nivell. Mana l'habilitat
// —els entrenables són per a vendre'ls cars—, però entre dos amb la mateixa creativitat va
// primer el que porta més temps en eixe nivell, perquè li queda menys per a pujar.
//
// I NO al revés: com més fluix és un jugador, més ràpid puja (`f(nivell)` cau amb el nivell).
// Ordenar per «menys setmanes» posaria un de creativitat 2 (2,6 setmanes) per davant d'un de 9
// (6,8) i els fluixos desplaçarien els bons.
{
  const b = (id, o) => ({ id, nom: 'Z' + id, sou: 1000, edat_anys: 18, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 1, extrem: 1, passades: 1, anotacio: 1,
    pilota_aturada: 1, experiencia: 1, lideratge: 1, ...o });
  // Onze titulars vells perquè no competisquen, i quatre joves de creativitat 6.
  //
  // Amb el POLICULTIU els titulars han de ser bons en el conjunt del seu lloc, no només en una
  // habilitat: un jove amb creativitat 6 i la resta a 1 aporta més a un lloc d'extrem que un
  // vell amb extrem 6 i creativitat 1, perquè la creativitat val el 36% d'eixe lloc i l'extrem
  // el 29%. Amb els vells monotemàtics, els joves els furtaven el lloc i el desempat que ací es
  // prova —quin dels de creativitat 6 va primer— no arribava a passar.
  const vells = Array.from({ length: 11 }, (_, i) => b(i + 1, { edat_anys: 30,
    porteria: i === 0 ? 9 : 2, defensa: 8, creativitat: 8, extrem: 8, passades: 8, anotacio: 8 }));
  // El 40 es queda per davall del mínim de creativitat: no és candidat, i això és el que es
  // comprova ara a més del desempat. Els tres empatats van CLAVATS AL LLISTÓ, que ix del pom:
  // el desempat es prova on de veres passa, i quan el llistó es mou (118: 6 → 7) el fixture
  // el seguix sol en compte de quedar-se provant un número que ja no talla res.
  const llisto = Number(sqlite.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenable_creativitat_min'").get().valor);
  const joves = [b(40, { creativitat: llisto - 4 }), b(41, { creativitat: llisto }),
    b(42, { creativitat: llisto }), b(43, { creativitat: llisto })];
  // Sense ENTRENADOR declarat no hi ha velocitat, i per tant tampoc desempat: la fórmula no
  // se l'inventa. El desempat només pot actuar quan el càlcul es pot fer.
  // I el 42 porta setmanes al seu nivell: se li ha vist arribar-hi fa temps.
  sqlite.exec(`
    INSERT OR REPLACE INTO personal_membres (usuari_id, rol, tipus, nivell, sou, coach_entrenament) VALUES (1,'entrenador','entrenador',NULL,5000,'passable');
    INSERT OR IGNORE INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (42,1,942,'Z42');
    INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES
      (90,1,'2026-04-01',83,1),(91,1,'2026-06-01',83,9);
    INSERT INTO instantanies_jugadors (instantania_id, jugador_id, creativitat) VALUES (90,42,${llisto}),(91,42,${llisto});
  `);
  const r = await onzeEstructura(db, 1, [...vells, ...joves], 10291);
  const tria = r.entrenables.map((j) => j.id);
  assert.ok(!tria.includes(40), `el de creativitat ${llisto - 4} NO entra: per davall del mínim per a entrenar`);
  assert.equal(tria[0], 42, `i entre els de creativitat ${llisto}, primer el que està més a prop de pujar`);
  // Sense entrenador no hi ha velocitat, i sense velocitat no es pot dir si la pròxima pujada
  // cau abans del límit d'edat: per tant no hi ha entrenables. No s'inventa cap número.
  sqlite.exec("DELETE FROM personal_membres WHERE rol='entrenador';");
  const sense = await onzeEstructura(db, 1, [...vells, ...joves], 10291);
  assert.deepEqual(sense.entrenables, [],
    'sense entrenador declarat no es pot dir qui val la pena entrenar');
  sqlite.exec("INSERT INTO personal_membres (usuari_id, rol, tipus, sou, coach_entrenament) VALUES (1,'entrenador','entrenador',5000,'passable');");
  sqlite.exec('DELETE FROM instantanies_jugadors WHERE instantania_id IN (90,91); DELETE FROM instantanies WHERE id IN (90,91);');
}

// ── 9c. LA FINESTRA D'ENTRENAMENT NO ÉS UN TALL D'EDAT ────────────────────────────────────
// El criteri no és «menys de 20 anys» sinó «la pròxima pujada li cau abans dels 21». Un de 20
// i escaig que puja d'ací a poc encara cobra eixa pujada; un que no pujarà fins passats els 21
// ja no la cobrarà mai, tinga l'edat que tinga. I com que pujar el fa més vell i la següent
// pujada és més lenta, el criteri el trau tot sol JUST DESPRÉS d'haver pujat.
{
  const b = (id, o) => ({ id, nom: 'W' + id, sou: 1000, edat_anys: 30, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 1, extrem: 1, passades: 1, anotacio: 1,
    pilota_aturada: 1, experiencia: 1, lideratge: 1, ...o });
  // Titulars complets, com al bloc anterior: amb el policultiu un jove d'una sola habilitat
  // desplaça un titular monotemàtic, i llavors no queda al residu per a poder ser entrenable.
  const vells = Array.from({ length: 11 }, (_, i) => b(i + 1, {
    porteria: i === 0 ? 9 : 2, defensa: 8, creativitat: 8, extrem: 8, passades: 8, anotacio: 8 }));

  // Dos CLAVATS AL LLISTÓ (del pom, no d'un número escrit ací), un de 20 anys i un de 19: amb
  // el tall pla d'abans, el de 20 quedava fora i el de 19 dins. Amb la finestra, els dos pugen
  // abans dels 21 i els dos entren. El que es prova és l'EDAT, i el llistó no ha d'apagar-ho
  // quan es moga (118: 6 → 7).
  const llisto = Number(sqlite.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenable_creativitat_min'").get().valor);
  const a20 = b(60, { creativitat: llisto, edat_anys: 20, edat_dies: 0 });
  const a19 = b(61, { creativitat: llisto, edat_anys: 19, edat_dies: 0 });
  let r = await onzeEstructura(db, 1, [...vells, a20, a19], 10291);
  const ids = r.entrenables.map((j) => j.id);
  assert.ok(ids.includes(60), 'un de 20 anys que encara puja abans dels 21 SEGUIX entrenant');
  assert.ok(ids.includes(61), 'i el de 19 també');

  // I un de 20 anys i 100 dies: la pujada li cau ja passats els 21 → fora, i cap a venda.
  const tard = b(62, { creativitat: llisto, edat_anys: 20, edat_dies: 100 });
  r = await onzeEstructura(db, 1, [...vells, tard], 10291);
  assert.deepEqual(r.entrenables.map((j) => j.id), [],
    'si la pròxima pujada cau passat el límit, ja no val la pena entrenar-lo');
  assert.ok(r.venda.some((j) => j.id === 62), 'i se\'n va a venda tot sol');

  // I EL MÍNIM DE CREATIVITAT: un jove boníssim d'edat però fluix no entra.
  const fluix = b(63, { creativitat: 3, edat_anys: 17, edat_dies: 0 });
  r = await onzeEstructura(db, 1, [...vells, fluix], 10291);
  assert.deepEqual(r.entrenables.map((j) => j.id), [],
    'per davall del mínim de creativitat no es gasten setmanes d\'entrenament');
}

// ── 10. VENDA i DESPATXAR: el residu es partix en dos, i cada jugador té UN grup i només un.
{
  const base = (id, o) => ({ id, nom: 'Y' + id, sou: 1000, edat_anys: 26, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 1, extrem: 1, passades: 1, anotacio: 1,
    pilota_aturada: 1, experiencia: 1, lideratge: 1, ...o });
  const equip = [
    base(1, { porteria: 9 }), base(2, { defensa: 8 }), base(3, { defensa: 7 }),
    base(4, { creativitat: 9 }), base(5, { creativitat: 8 }), base(6, { creativitat: 7 }),
    base(7, { extrem: 7 }), base(8, { extrem: 6 }),
    base(9, { anotacio: 8 }), base(10, { anotacio: 7 }), base(11, { anotacio: 6 }),
    base(30, { anotacio: 2 }), base(31, { anotacio: 2 }),   // sobrants, sense experiència
  ];
  // El 31 ja va eixir a subhasta i ningú el va voler. `vendes` referencia `jugadors`, o siga
  // que la fila ha d'existir: el fixture d'este bloc és en memòria i la base no el coneix.
  sqlite.exec("INSERT OR IGNORE INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (31,1,931,'Y31');");
  sqlite.exec("INSERT OR REPLACE INTO vendes (jugador_id, usuari_id, estat) VALUES (31,1,'desert');");
  const r = await onzeEstructura(db, 1, equip, 10291);
  // Cap dels dos pot ser entrenador (experiència 1, i la taula comença en 4), o siga que no
  // se n'assenyala cap: van els dos al residu.
  assert.equal(r.futur_entrenador, null, 'amb experiència 1 no hi ha futur entrenador possible');
  assert.deepEqual(r.venda.map((j) => j.id), [30],
    'el sobrant que encara es pot vendre va a VENDA');
  assert.deepEqual(r.despatxar.map((j) => j.id), [31],
    'i el que ja ningú va voler, a DESPATXAR: no es torna a llistar');

  // UN GRUP I NOMÉS UN per jugador, i tots coberts. Si un caiguera en dos, es pintaria dues
  // vegades i Paco l'avisaria dues vegades.
  assert.equal(r.grups.size, equip.length, 'tots els jugadors tenen grup');
  assert.equal(r.grups.get(1), 'onze');
  assert.equal(r.grups.get(30), 'venda');
  assert.equal(r.grups.get(31), 'despatxar');
  sqlite.exec('DELETE FROM vendes;');
}

// ── 10. EL SOBRECOST: cada jugador es mesura contra EL SEU LLOC ────────────────────────────
// La vara de la venda (PAS 7). L'oracle no ix del codi: ix de la TAULA DE SALARIS de la guia,
// llegida de la base. Un davanter s'ha de mesurar contra el que paga un davanter, no contra
// el mig centre que mai serà — si es mesurara contra un altre lloc, el número seria un altre.
{
  const base = (id, o) => ({ id, nom: 'S' + id, sou: 1000, edat_anys: 27, edat_dies: 0,
    porteria: 1, defensa: 1, creativitat: 1, extrem: 1, anotacio: 1, passades: 1, pilota_aturada: 1, experiencia: 1, ...o });
  // Un davanter sobrepagat, i onze més perquè no entre a l'onze titular.
  const dav = base(40, { anotacio: 6, sou: 60000 });
  const equip = [...Array.from({ length: 11 }, (_, i) => base(50 + i, { defensa: 9, creativitat: 9, anotacio: 9, extrem: 9, porteria: 9 })), dav];
  const r = await onzeEstructura(db, 1, equip, 10291, true);
  const lloc = r.onze.find((l) => l.bucket === 'davanter');
  // L'ORACLE ÉS EL SOU DEL PERFIL que el lloc paga (v2 del motor), no el preu d'una sola
  // habilitat al nivell objectiu. Amb la vara vella, el sistema triava el jugador per tres
  // habilitats i li retreia el sou de les altres dues: dues vares oposades sobre el mateix.
  const esperat = Math.max(0, dav.sou - lloc.sou_objectiu);
  assert.ok(lloc.sou_objectiu > 0, 'el lloc ha de portar el sou del seu perfil');
  assert.equal(r.sobrecosts.get(40), esperat,
    `el davanter es mesura contra el que costa un jugador fet a mida per al seu lloc (${esperat})`);
  const sense = await onzeEstructura(db, 1, equip, 10291, false);
  assert.equal(sense.sobrecosts.get(40), 0,
    'i sense calibrar, ningú queda marcat com a sobrepagat (stopper del PAS 7)');
}

console.log('OK — l\'onze d\'estructura: tots els jugadors, lloc a lloc, un jugador un lloc');
