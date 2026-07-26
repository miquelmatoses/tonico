// Tonico — Àrea E: fitxes de venda amb preu d'eixida proposat des de comparables.
// node test/vendes.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { proposaPreuEixida } from '../lib/vendes.js';
import * as vendes from '../functions/api/vendes.js';

// Mediana per posició; fallback a tots.
const comps = [{ posicio: 'MC', preu: 100000 }, { posicio: 'MC', preu: 200000 }, { posicio: 'DV', preu: 50000 }];
assert.equal(proposaPreuEixida(comps, { posicio: 'MC' }), 150000, 'mediana dels MC');
assert.equal(proposaPreuEixida(comps, { posicio: 'PO' }), 100000, 'sense la posició → mediana de tots');
assert.equal(proposaPreuEixida([], { posicio: 'MC' }), null, 'sense comparables → null');

// Integració via API
const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom, especialitat) VALUES (1,1,100,'Venut','Ràpid');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, creativitat, defensa, passades, extrem, anotacio, pilota_aturada, porteria) VALUES (1,1,'MC',25,5,4,4,3,3,3,1);
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (1,'venda','auto');
  INSERT INTO preus_observats (usuari_id, posicio, edat, habilitat, preu, data) VALUES (1,'MC',25,7,100000,'2026-07-18'),(1,'MC',25,7,200000,'2026-07-18'),(1,'MC',25,7,300000,'2026-07-18');
`);
const ctx = (body) => ({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });

let d = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.jugadors.length, 1, 'un jugador en venda');
assert.equal(d.jugadors[0].preu_proposat, 200000, 'preu proposat = mediana MC (3 mostres: min_mostres=3)');
assert.equal(d.jugadors[0].estat, 'pendent', 'estat per defecte');
assert.equal(d.jugadors[0].especialitat, 'Ràpid');
// Punt #10.6: valor_net = preu − cost_llistat(1000) − sou×setmanes(3). Sense sou → net alt.
assert.equal(d.jugadors[0].valor_net, 200000 - 1000, 'valor net = preu − cost_llistat (sou nul)');
assert.equal(d.jugadors[0].despatxar, false, 'valor net positiu → no despatxar');
// Amb un sou alt, els sous meritats fins a la venda es mengen el preu → despatxar.
sqlite.exec('UPDATE instantanies_jugadors SET sou=70000 WHERE jugador_id=1');
const dn = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(dn.jugadors[0].valor_net, 200000 - 1000 - 70000 * 3, 'valor net compta els sous fins a la venda');
assert.equal(dn.jugadors[0].despatxar, true, 'valor net negatiu → despatxar (llistar és tirar diners)');
sqlite.exec('UPDATE instantanies_jugadors SET sou=NULL WHERE jugador_id=1');   // restaura per a la resta del test

await vendes.onRequestPost(ctx({ jugador_id: 1, preu_eixida: 250000, data_llistada: '2026-07-25', estat: 'llistat' }));
d = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.jugadors[0].preu_eixida, 250000);
assert.equal(d.jugadors[0].estat, 'llistat');
// Punt #12.2b: els rellotges manen sobre el despatxar. Encara que el net siga negatiu,
// un LLISTAT (forçat) MAI mostra despatxar.
sqlite.exec('UPDATE instantanies_jugadors SET sou=70000 WHERE jugador_id=1');
const dforcat = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(dforcat.jugadors[0].calibrat, true, 'té comparable → calibrat');
assert.equal(dforcat.jugadors[0].despatxar, false, '2b: un llistat (forçat) mai despatxar, encara amb net negatiu');
sqlite.exec('UPDATE instantanies_jugadors SET sou=NULL WHERE jugador_id=1');

// Punt 7.3: SENSE comparables → estimació grossa ESCALADA per la puntuació relativa.
// Afegim un 2n venda amb més habilitat (més puntuació de venda → més estimació).
sqlite.exec(`
  DELETE FROM preus_observats;
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (2,1,101,'Crack');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, creativitat, defensa, passades, extrem, anotacio, pilota_aturada, porteria) VALUES (1,2,'MC',20,9,8,8,7,7,7,1);
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (2,'venda','auto');
`);
const d2 = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
const p = (nom) => d2.jugadors.find((j) => j.nom === nom).preu_proposat;
assert.ok(d2.jugadors.every((j) => j.preu_estimacio_grossa), 'sense comparables → tots marcats estimació grossa');
// Punt #12.2a: sense calibrar (cap comparable/venda real) → cap despatxar ni valor_net;
// la fila mostra només l'estimació etiquetada.
assert.ok(d2.jugadors.every((j) => j.calibrat === false && j.valor_net === null && j.despatxar === false), '2a: sense calibrar, cap recomanació de despatxar');
assert.ok(p('Crack') > p('Venut'), `qui puntua més té més estimació (${p('Crack')} > ${p('Venut')})`);
assert.notEqual(p('Venut'), p('Crack'), 'ja no és 150.000 pla per a tots');
// Punt #11.5: la base és PER DIVISIÓ (VII per defecte = 2000, molt per davall dels
// valors inflats). La mitjana de les estimacions ronda eixa base (escala relativa).
const mitjana = d2.jugadors.reduce((a, j) => a + j.preu_proposat, 0) / d2.jugadors.length;
assert.ok(Math.abs(mitjana - 2000) < 200, `la mitjana ronda la base de divisió VII: ${mitjana}`);

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

// (5) EL DESPLAÇAT SEMPRE AMB CÀLCUL: sense comparables el valor net no es pot calcular,
// però la fila HO DIU (calibrat=false → «pendent de calibratge»), mai cel·la buida.
sqlite.exec("UPDATE vendes SET estat='pendent', data_llistada=NULL WHERE jugador_id=1");
const dcal = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
for (const j of dcal.jugadors) {
  assert.ok(j.preu_proposat != null, `${j.nom}: sempre una estimació, mai buida`);
  assert.ok(j.calibrat === true || j.valor_net === null, `${j.nom}: sense calibrar no s'inventa valor net`);
  assert.ok(j.valor != null, `${j.nom}: sempre un valor de venda per a la retenció`);
}

// Polit #11.2b: el flag lesionat surt a l'eixida (buit = sa; valor = lesionat).
sqlite.exec("UPDATE instantanies_jugadors SET lesio='2' WHERE jugador_id=1");
const dl = await (await vendes.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(dl.jugadors.find((j) => j.nom === 'Venut').lesionat, true, 'lesió del CSV → flag lesionat a vendes');

console.log('OK — vendes: estimació grossa ESCALADA per puntuació (ordena coherent amb els punts)');
