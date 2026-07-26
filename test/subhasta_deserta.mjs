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
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom, especialitat) VALUES
    (1,1,100,'Sobrant','Ràpid'), (2,1,101,'Retingut',NULL);
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (1,'venda','auto'), (2,'core','auto');
  -- LA SETMANA PASSADA: tots dos llistats (transferible=1).
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-19',83,1);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (1,1,1,'MC',25,5,4,4,3,3,3,1), (1,2,1,'MC',24,7,5,6,3,3,3,1);
  -- ESTA SETMANA: ja no ho són, i seguixen a la plantilla → ningú els ha volgut.
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (2,1,'2026-07-26',83,2);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (2,1,NULL,'MC',25,5,4,4,3,3,3,1), (2,2,NULL,'MC',24,7,5,6,3,3,3,1);
`);
const req = { env: { DB: db }, data: { usuari: { id: 1 } } };

// ── 1. LA PUJADA DESA EL FET. No basta que la funció existisca: ha d'estar CRIDADA des del
// pipeline, que és el moment en què la instantània nova acaba d'arribar i la transició es veu.
await regeneraPipeline(db, 1, '2026-07-26');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM vendes WHERE estat='desert'").get().n, 2,
  'la regeneració del pipeline desa els deserts: sense això, la deducció es perd');
sqlite.exec('DELETE FROM vendes');
// La regeneració també RECLASSIFICA, i amb dos jugadors al fixture els posa tots dos al nucli.
// Ací el que es prova és el mecanisme del desert, no el classificador: es torna a fixar la
// categoria que fa falta (un sobrant i un retingut) i s'ha acabat.
sqlite.exec("UPDATE categories_jugador SET categoria='venda' WHERE jugador_id=1;");
sqlite.exec("UPDATE categories_jugador SET categoria='core' WHERE jugador_id=2;");

// I la funció, cridada a soles, fa el mateix i és idempotent.
const deserts = await marcaDeserts(db, 1);
assert.deepEqual([...deserts].sort(), [1, 2], 'els dos que eren llistats i ja no ho són');
await marcaDeserts(db, 1);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM vendes WHERE estat='desert'").get().n, 2,
  'cridar-ho dues vegades no duplica res');

// ── 2. FORA DE VENDES, i no per la transició sinó pel fet desat ──
let v = await (await vendes.onRequestGet(req)).json();
assert.deepEqual(v.jugadors, [], 'cap fitxa de venda: ningú el vol i del mercat ja no es parla');

// I ACÍ ESTÀ LA GRÀCIA: una pujada més tard la transició ja no es veu (les dues instantànies
// diuen «no transferible») i abans tornava a eixir. Amb el fet desat, no.
sqlite.exec(`
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (3,1,'2026-08-02',83,3);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, transferible, ${HAB}) VALUES
    (3,1,NULL,'MC',25,5,4,4,3,3,3,1), (3,2,NULL,'MC',24,7,5,6,3,3,3,1);
`);
await marcaDeserts(db, 1);
v = await (await vendes.onRequestGet(req)).json();
assert.deepEqual(v.jugadors, [], 'i una setmana després tampoc torna');
assert.equal((await desertsDesats(db, 1)).size, 2, 'el fet no s\'esborra tot sol');

// ── 3. NI CAP MISSATGE. La regla el proposava cada setmana per la mateixa raó que
// l'hauria d'haver descartat: «no és transferible». ──
const jugadors = [{ jugador_id: 1, nom: 'Sobrant', categoria: 'venda', transferible: null, sou: 9000, edat_dies: 50 }];
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

console.log('OK — la subhasta deserta es desa: fora de Vendes per sempre, i despatxable només si sobra');
