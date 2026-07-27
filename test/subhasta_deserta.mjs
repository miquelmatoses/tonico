// Tonico — LA SUBHASTA DESERTA ÉS UN FET, I DURA. node test/subhasta_deserta.mjs
//
// EL FORAT QUE TAPA ESTE TEST, dit tres voltes per Miquel: un jugador que ix a subhasta i
// ningú el vol NO ha de tornar a aparéixer a Vendes MAI MÉS. Ni fitxa, ni píndola, ni
// missatge. Ja no és transferible i l'única cosa que se'n pot fer és despatxar-lo, i això és
// una decisió de PLANTILLA, no de mercat.
//
// I no s'aguantava sol per una raó de mecànica: la deducció (transferible 1 → buit, i seguix a
// la plantilla) només es veu en la TRANSICIÓ entre dues instantànies. A la pujada següent les
// dues diuen «no transferible», la transició ja no existix, i el jugador tornava a Vendes com
// si res. Pitjor: `ALR_LLISTAR_VENDA` el proposava per la MATEIXA raó que l'havia de descartar
// («transferible !== 1»). Per això el fet es DESA.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { marcaDeserts, desertsDesats } from '../lib/vendes.js';
import { REGLES } from '../lib/regles.js';
import * as vendes from '../functions/api/vendes.js';
import * as plantilla from '../functions/api/plantilla.js';
import { regeneraPipeline } from '../lib/pipeline.js';

const { sqlite, db } = nova(import.meta.url);
const HAB = 'posicio_ultim_partit, edat_anys, creativitat, defensa, passades, extrem, anotacio, pilota_aturada, porteria';
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',2);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom, especialitat) VALUES
    (1,1,100,'Sobrant','Ràpid'), (2,1,101,'Retingut',NULL),
    -- ONZE de farciment: amb només dos jugadors els dos serien titulars i cap seria SOBRANT,
    -- o siga que la comprovació del despatxable no comprovaria res.
    (10,1,110,'F1',NULL),(11,1,111,'F2',NULL),(12,1,112,'F3',NULL),(13,1,113,'F4',NULL),
    (14,1,114,'F5',NULL),(15,1,115,'F6',NULL),(16,1,116,'F7',NULL),(17,1,117,'F8',NULL),
    (18,1,118,'F9',NULL),(19,1,119,'F10',NULL),(20,1,120,'F11',NULL);
  -- LA SETMANA PASSADA: tots dos llistats (transferible=1).
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-19',83,1);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (1,1,1,'MC',25,5,4,4,3,3,3,1), (1,2,1,'MC',24,7,5,6,3,3,3,1);
  -- ESTA SETMANA: ja no ho són, i seguixen a la plantilla → ningú els ha volgut.
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (2,1,'2026-07-26',83,2);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (2,1,NULL,'MC',25,5,4,4,3,3,3,1), (2,2,NULL,'MC',24,7,5,6,3,3,3,1);
  -- El farciment, millor que el «Sobrant» a cada lloc i pitjor que el «Retingut» al mig.
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (2,10,NULL,'POR',26,1,1,1,1,1,1,9),(2,11,NULL,'DC',26,1,8,1,1,1,1,1),(2,12,NULL,'DC',26,1,7,1,1,1,1,1),
    (2,13,NULL,'MC',26,6,1,1,1,1,1,1),(2,14,NULL,'MC',26,6,1,1,1,1,1,1),
    (2,15,NULL,'EX',26,1,1,1,7,1,1,1),(2,16,NULL,'EX',26,1,1,1,6,1,1,1),
    (2,17,NULL,'DV',26,1,1,1,1,8,1,1),(2,18,NULL,'DV',26,1,1,1,1,7,1,1),(2,19,NULL,'DV',26,1,1,1,1,6,1,1),
    (2,20,NULL,'DC',26,1,6,1,1,1,1,1);
`);
const req = { env: { DB: db }, data: { usuari: { id: 1 } } };

// ── 1. LA PUJADA DESA EL FET. No basta que la funció existisca: ha d'estar CRIDADA des del
// pipeline, que és el moment en què la instantània nova acaba d'arribar i la transició es veu.
await regeneraPipeline(db, 1, '2026-07-26');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM vendes WHERE estat='desert'").get().n, 2,
  'la regeneració del pipeline desa els deserts: sense això, la deducció es perd');
sqlite.exec('DELETE FROM vendes');
// El grup ja no es desa, i ací el que es prova és el mecanisme del DESERT, no qui és sobrant:
// `marcaDeserts` mira la transició de `transferible` entre les dues últimes instantànies i no
// pregunta a quin grup pertany ningú.

// I la funció, cridada a soles, fa el mateix i és idempotent.
const deserts = await marcaDeserts(db, 1);
assert.deepEqual([...deserts].sort(), [1, 2], 'els dos que eren llistats i ja no ho són');
await marcaDeserts(db, 1);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM vendes WHERE estat='desert'").get().n, 2,
  'cridar-ho dues vegades no duplica res');

// ── 2. FORA DE VENDES, i no per la transició sinó pel fet desat ──
let v = await (await vendes.onRequestGet(req)).json();
// El que es comprova és que els DESERTS no hi són, no que la llista estiga buida: hi pot haver
// altres sobrants que sí que es poden vendre, i eixos han d'eixir-hi.
const aFitxes = () => new Set(v.jugadors.map((j) => j.jugador_id));
assert.ok(!aFitxes().has(1) && !aFitxes().has(2),
  'els deserts no tenen fitxa de venda: ningú els vol i del mercat ja no es parla');

// I ACÍ ESTÀ LA GRÀCIA: una pujada més tard la transició ja no es veu (les dues instantànies
// diuen «no transferible») i abans tornava a eixir. Amb el fet desat, no.
sqlite.exec(`
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (3,1,'2026-08-02',83,3);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (3,1,NULL,'MC',25,5,4,4,3,3,3,1), (3,2,NULL,'MC',24,7,5,6,3,3,3,1),
    -- El farciment també a esta instantània: si no, l'última només tindria dos jugadors, tots
    -- dos serien titulars i cap seria sobrant.
    (3,10,NULL,'POR',26,1,1,1,1,1,1,9),(3,11,NULL,'DC',26,1,8,1,1,1,1,1),(3,12,NULL,'DC',26,1,7,1,1,1,1,1),
    (3,13,NULL,'MC',26,6,1,1,1,1,1,1),(3,14,NULL,'MC',26,6,1,1,1,1,1,1),
    (3,15,NULL,'EX',26,1,1,1,7,1,1,1),(3,16,NULL,'EX',26,1,1,1,6,1,1,1),
    (3,17,NULL,'DV',26,1,1,1,1,8,1,1),(3,18,NULL,'DV',26,1,1,1,1,7,1,1),(3,19,NULL,'DV',26,1,1,1,1,6,1,1),
    (3,20,NULL,'DC',26,1,6,1,1,1,1,1);
`);
await marcaDeserts(db, 1);
v = await (await vendes.onRequestGet(req)).json();
assert.ok(!aFitxes().has(1) && !aFitxes().has(2), 'i una setmana després tampoc tornen');
assert.equal((await desertsDesats(db, 1)).size, 2, 'el fet no s\'esborra tot sol');

// ── 3. NI CAP MISSATGE. La regla el proposava cada setmana per la mateixa raó que
// l'hauria d'haver descartat: «no és transferible». ──
const jugadors = [{ jugador_id: 1, nom: 'Sobrant', grup: 'venda', transferible: null, sou: 9000, edat_dies: 50 }];
const params = { urgencia: 70, dies_urgencia: 14, posicio_porter: 'PO' };
assert.ok(REGLES.ALR_LLISTAR_VENDA({ jugadors, any_dies: 112, deserts: new Set() }, params).length > 0,
  'control: sense la marca, la regla el proposaria (és el bug)');
assert.deepEqual(REGLES.ALR_LLISTAR_VENDA({ jugadors, any_dies: 112, deserts: new Set([1]) }, params), [],
  'amb la marca, cap missatge de llistar-lo');

// ── 4. DESPATXABLE, i només el SOBRANT. Per a un retingut una subhasta deserta no és un
// veredicte sobre el jugador: és que el preu no era el bo. I la marca viu a la PLANTILLA. ──
const p = await (await plantilla.onRequestGet(req)).json();
const sobrant = p.jugadors.find((j) => j.id === 1), retingut = p.jugadors.find((j) => j.id === 2);
assert.equal(sobrant.desert, true, 'el fet arriba a la plantilla');
assert.equal(sobrant.despatxar, true, 'i el sobrant desert és despatxable');
assert.equal(retingut.desert, true, 'el retingut també ha quedat desert');
assert.equal(retingut.despatxar, false, 'però no es despatxa: continua tenint lloc a l\'onze');

// ── 4b. LA TRANSICIÓ VELLA TAMBÉ COMPTA. Mirar només les dues últimes instantànies només
// veu les subhastes que van quedar desertes EIXA setmana: si el termini es va acabar fa tres
// pujades, la transició ja no és entre consecutives d'ara i el jugador no es marcava mai. Ací
// hi ha un jugador que va ser transferible al principi de tot i mai més.
{
  sqlite.exec(`
    INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (3,1,102,'Vell');
    INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
      (1,3,1,'DV',29,1,1,1,1,1,1,1), (2,3,NULL,'DV',29,1,1,1,1,1,1,1),
      (3,3,NULL,'DV',29,1,1,1,1,1,1,1);
  `);
  sqlite.exec("DELETE FROM vendes;");
  const tots = await marcaDeserts(db, 1);
  assert.ok(tots.has(3),
    'la subhasta que va quedar deserta fa dues pujades també es recupera: es mira TOT l\'històric');
}

// ── 5. I PACO EN PARLA. El desert no torna al mercat, però tampoc desapareix: cobra cada
// setmana sense ocupar cap lloc del pla, i l'única eixida és despatxar-lo. L'alerta va
// agregada perquè és una decisió de plantilla, no un avís per cap.
{
  const jugadors = [
    { jugador_id: 1, nom: 'A', grup: 'despatxar', sou: 4000 },
    { jugador_id: 2, nom: 'B', grup: 'despatxar', sou: 3000 },
    { jugador_id: 3, nom: 'C', grup: 'onze', sou: 9000 },
  ];
  const a = REGLES.ALR_DESPATXAR({ jugadors }, { urgencia: 72 });
  assert.equal(a.length, 1, 'una sola alerta per a tots: és una decisió, no onze avisos');
  assert.equal(a[0].parametres.n, 2, 'els dos que no es poden vendre');
  assert.equal(a[0].parametres.sou_total, 7000, 'i el que et costen cada setmana, sumat');
  assert.deepEqual(REGLES.ALR_DESPATXAR({ jugadors: [jugadors[2]] }, { urgencia: 72 }), [],
    'sense cap desert, cap alerta');
}

console.log('OK — la subhasta deserta es desa: fora de Vendes per sempre, i despatxable només si sobra');
