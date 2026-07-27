// Tonico — VENDES via API (contracte v3.1). SENSE preu proposat: Tonico no diu quant val un
// jugador. Qui ordena la llista és el SOBRECOST —el que pagues de més respecte del que el seu
// lloc mereix (PAS 7: `ordre_venda = sobrecost DESC`)—, que és una xifra pròpia i no una
// endevinalla de mercat. Qui decidix si s'acomiada és la subhasta. node test/vendes.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as vendes from '../functions/api/vendes.js';

// Integració via API
const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',2);
  -- DOTZE jugadors: qui va a Vendes és qui NO entra a l'onze, o siga que amb menys de dotze
  -- tots serien titulars i la llista de vendes eixiria buida.
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom, especialitat) VALUES
    (1,1,100,'Venut','Ràpid'),(2,1,101,'B',NULL),(3,1,102,'C',NULL),(4,1,103,'D',NULL),
    (5,1,104,'E',NULL),(6,1,105,'F',NULL),(7,1,106,'G',NULL),(8,1,107,'H',NULL),
    (9,1,108,'I',NULL),(10,1,109,'J',NULL),(11,1,110,'K',NULL),(12,1,111,'L',NULL);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, creativitat, defensa, passades, extrem, anotacio, pilota_aturada, porteria) VALUES
    (1,1,'MC',25,1,1,1,1,1,1,1),
    (1,2,'POR',25,1,1,1,1,1,1,9),(1,3,'DC',25,1,8,1,1,1,1,1),(1,4,'DC',25,1,7,1,1,1,1,1),
    (1,5,'MC',25,9,1,1,1,1,1,1),(1,6,'MC',25,8,1,1,1,1,1,1),(1,7,'MC',25,7,1,1,1,1,1,1),
    (1,8,'EX',25,1,1,1,7,1,1,1),(1,9,'EX',25,1,1,1,6,1,1,1),
    (1,10,'DV',25,1,1,1,1,8,1,1),(1,11,'DV',25,1,1,1,1,7,1,1),(1,12,'DV',25,1,1,1,1,6,1,1);
`);
const ctx = (body) => ({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });

let d = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.jugadors.length, 1, 'un jugador en venda');
assert.equal(d.jugadors[0].estat, 'pendent', 'estat per defecte');
assert.equal(d.jugadors[0].especialitat, 'Ràpid');
// v3.1: NO hi ha preu proposat ni valor net. Un sou alt ja no fa aparéixer «despatxa'l»:
// això el decidix la subhasta (destiDeserta), no una previsió de quant en trauries.
assert.equal(d.jugadors[0].preu_proposat, undefined, 'cap preu estimat a l\'eixida');
assert.equal(d.jugadors[0].valor_net, undefined, 'cap valor net: depenia del preu estimat');
assert.equal(d.jugadors[0].despatxar, undefined,
  'ni el camp: despatxar és una decisió de PLANTILLA, no de la fitxa de venda');
sqlite.exec('UPDATE instantanies_jugadors SET sou=70000 WHERE jugador_id=1');
const dn = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(dn.jugadors[0].despatxar, undefined,
  'ni amb un sou desproporcionat: la fitxa de venda no parla d\'acomiadar');
sqlite.exec('UPDATE instantanies_jugadors SET sou=NULL WHERE jugador_id=1');   // restaura per a la resta del test

// La fitxa només guarda el que mou el rellotge de la subhasta: data de llistat i estat. Un
// `preu_eixida` enviat s'IGNORA — l'API ja no en té camp.
await vendes.onRequestPost(ctx({ jugador_id: 1, preu_eixida: 250000, data_llistada: '2026-07-25', estat: 'llistat' }));
d = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.jugadors[0].estat, 'llistat');
assert.equal(d.jugadors[0].data_llistada, '2026-07-25');
assert.equal(d.jugadors[0].preu_eixida, undefined, 'cap preu a l\'eixida, ni el que s\'ha enviat');
assert.equal(sqlite.prepare('SELECT preu_eixida FROM vendes WHERE jugador_id=1').get().preu_eixida, null,
  'i tampoc s\'escriu a la BD: la porta està tancada, no només amagada');
// UN DESERT NO TORNA MAI A VENDES. Va eixir a subhasta, ningú el va voler i ja no és
// transferible: ni fitxa, ni píndola, ni missatge. L'única cosa que se'n pot fer és
// despatxar-lo, i eixa decisió és de PLANTILLA.
sqlite.exec("INSERT INTO vendes (jugador_id, usuari_id, estat) VALUES (1,1,'desert') ON CONFLICT(jugador_id) DO UPDATE SET estat='desert';");
const dDesert = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.ok(!dDesert.jugadors.some((j) => j.jugador_id === 1), 'el desert desapareix de la llista');
sqlite.exec("UPDATE vendes SET estat='pendent' WHERE jugador_id=1;");

// ── EL SOBRECOST ORDENA LA LLISTA ─────────────────────────────────────────────────────────
// Primer cal que l'economia estiga CALIBRADA: sense prou setmanes declarades el sobrecost és
// 0 per a tots (stopper del PAS 7), i eixe és el comportament que es comprova primer.
{
  const sense = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
  assert.ok(sense.jugadors.every((j) => j.valor === 0),
    'sense calibrar, ningú queda marcat com a sobrepagat per una lectura provisional');
}
sqlite.exec(`
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi) VALUES (1, 900000, '2026-07-25', 9000);
  -- Vuit setmanes declarades: el mínim que el pom setmanes_mitjana demana per a calibrar.
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,82,9,90000,40000,'2026-05-30','2026-07-25'),(1,82,10,90000,40000,'2026-06-06','2026-07-25'),
    (1,82,11,90000,40000,'2026-06-13','2026-07-25'),(1,82,12,90000,40000,'2026-06-20','2026-07-25'),
    (1,82,13,90000,40000,'2026-06-27','2026-07-25'),(1,82,14,90000,40000,'2026-07-04','2026-07-25'),
    (1,82,15,90000,40000,'2026-07-11','2026-07-25'),(1,82,16,90000,40000,'2026-07-18','2026-07-25');
  -- Dos sobrants amb la MATEIXA habilitat i sous molt distints: l'únic que els separa és el
  -- que cobren de més respecte del que el seu lloc mereix.
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (20,1,120,'Car'),(21,1,121,'Barat');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, sou, creativitat, defensa, passades, extrem, anotacio, pilota_aturada, porteria) VALUES
    (1,20,'MC',25,90000,5,1,1,1,1,1,1),(1,21,'MC',25,500,5,1,1,1,1,1,1);
`);
const d2 = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
const v = (nom) => d2.jugadors.find((j) => j.nom === nom).valor;
assert.ok(d2.jugadors.every((j) => j.preu_proposat === undefined), 'cap preu estimat a la fitxa');
assert.ok(v('Car') > 0, `el sobrepagat porta sobrecost (${v('Car')})`);
assert.equal(v('Barat'), 0, 'i qui cobra el que toca, cap');
assert.equal(d2.jugadors[0].nom, 'Car', 'la llista va per sobrecost DESC: primer el que més et costa');
assert.ok(d2.jugadors.every((j) => j.es_sobrant === true), 'tots són sobrants (grup venda)');

// (4) FORA LES MARQUES DE BUFFER: «cobrix X — ven-lo l'últim» és doctrina MORTA amb la
// liquidació. Una fitxa només pot estar en un d'estos quatre estats, i els dona el MATEIX
// conjunt derivat que l'alerta agregada (3).
sqlite.exec("UPDATE vendes SET estat='pendent', data_llistada=NULL WHERE jugador_id=1");
const dneta = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.ok(dneta.jugadors.every((j) => j.cobreix === undefined), 'cap marca de buffer a l\'eixida');
const ESTATS_LIQ = ['llistat', 'retingut', 'lesionat', 'llistable'];
assert.ok(dneta.jugadors.every((j) => ESTATS_LIQ.includes(j.estat_liquidacio)), 'tota fitxa porta un dels quatre estats');

// LLISTAT: la fitxa llistada (o Transferible=1) surt com a llistat, mai com a llistable.
sqlite.exec("UPDATE vendes SET estat='llistat', data_llistada='2026-07-30' WHERE jugador_id=1");
const dforc = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(dforc.jugadors.find((j) => j.nom === 'Venut').estat_liquidacio, 'llistat', 'llistat → estat llistat');

// Tota fila porta el seu valor de retenció derivat: mai una cel·la buida sense motiu.
sqlite.exec("UPDATE vendes SET estat='pendent', data_llistada=NULL WHERE jugador_id=1");
const dcal = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
for (const j of dcal.jugadors) {
  assert.ok(j.valor != null, `${j.nom}: sempre un valor de venda per a la retenció`);
}

// Polit #11.2b: el flag lesionat surt a l'eixida (buit = sa; valor = lesionat).
sqlite.exec("UPDATE instantanies_jugadors SET lesio='2' WHERE jugador_id=1");
const dl = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(dl.jugadors.find((j) => j.nom === 'Venut').lesionat, true, 'lesió del CSV → flag lesionat a vendes');

console.log('OK — vendes v3.1: cap preu estimat, el sobrecost ordena i la subhasta decidix');
