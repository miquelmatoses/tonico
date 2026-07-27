// Tonico — CABLATGE DE LES PANTALLES: cap decisió del contracte es queda dins de la
// biblioteca. Comprova que l'API serveix el que els bucles decidixen.
// node test/pantalles_v3.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as mercat from '../functions/api/mercat.js';
import * as finances from '../functions/api/finances.js';
import * as personal from '../functions/api/personal.js';
import * as vendes from '../functions/api/vendes.js';
import { subhastaDeserta, despatxable } from '../lib/vendes.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','cap',2);
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,2);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A'),(2,1,101,'B');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, sou, creativitat, defensa, porteria, anotacio, extrem, passades)
    VALUES (1,1,'MC',22,3000,5,1,1,1,1,1),(1,2,'DC',24,2000,1,6,1,1,1,1);
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi)
    VALUES (1, 500000, '2026-07-25', 6000);
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,60000,40000,'2026-07-19','2026-07-25'),(1,83,2,0,40000,'2026-07-25','2026-07-25');
`);
const ctx = { env: { DB: db }, data: { usuari: { id: 1 } } };

// ── MERCAT: el bucle d'estoc arriba a la pantalla ──
const m = await (await mercat.onRequestGet(ctx)).json();
assert.ok(m.estoc, 'el mercat serveix el bucle d\'estoc');
assert.ok(m.estoc.caixa > 0, 'i la caixa amb què compara');
assert.ok(m.estoc.sou_sostenible > 0, 'i el sou que el flux sosté');
assert.ok(Array.isArray(m.estoc.opcions), 'amb les opcions ordenades');
assert.ok(Array.isArray(m.estoc.mancances), 'i les mancances que les justifiquen');

// SENSE PREU DECLARAT NO ES SUGGERIX MAI. A Hattrick el preu no el calcula el joc: suggerir una
// compra sense saber què costa és decidir a cegues. L'opció es VEU, amb «falta el preu», i no
// pot arribar a recomanació per molta prioritat que tinga.
{
  const fitxatges = m.estoc.opcions.filter((o) => o.tipus === 'jugador');
  assert.ok(fitxatges.length, 'hi ha fitxatges pendents al fixture');
  assert.ok(fitxatges.every((o) => o.falta === 'preu' && !o.admissible),
    'sense preu declarat, cap fitxatge és admissible');
  assert.notEqual(m.estoc.recomanada?.tipus, 'jugador',
    'i cap arriba a recomanació');

  // Declarat el preu, i cabent a la caixa, el mateix fitxatge ja es pot decidir.
  const clau = fitxatges[0].clau;
  sqlite.prepare("INSERT INTO preus_referencia (usuari_id, clau, preu, data) VALUES (1,?,?,?)")
    .run(clau, 1000, '2026-07-26');
  const m1b = await (await mercat.onRequestGet(ctx)).json();
  const ara = m1b.estoc.opcions.find((o) => o.clau === clau);
  assert.equal(ara.cost, 1000, 'el cost és el preu declarat, no un invent');
  assert.equal(ara.admissible, true, 'i amb caixa suficient ja es pot comprar');
  sqlite.prepare('DELETE FROM preus_referencia').run();
}
assert.equal(m.estoc.estadi_declarat, false, 'sense números d\'estadi, no hi ha obra a proposar');
for (const o of m.estoc.opcions) assert.ok(o.motiu, 'cada opció porta el seu motiu DERIVAT');

// Amb els números de la calculadora declarats, l'obra entra — i VA PRIMER (v3.1).
sqlite.prepare('UPDATE finances SET estadi_manteniment=?, estadi_cost_obra=? WHERE usuari_id=1').run(9000, 200000);
const m2 = await (await mercat.onRequestGet(ctx)).json();
assert.equal(m2.estoc.estadi_declarat, true, 'declarada, l\'obra ja es pot proposar');
const opEstadi = m2.estoc.opcions.find((o) => o.tipus === 'estadi');
assert.ok(opEstadi, 'i apareix com a opció');
assert.equal(opEstadi.delta_manteniment, 3000, 'amb el que AFIG de manteniment (9000 − 6000)');
assert.equal(opEstadi.eficiencia, null,
  'i SENSE eficiència: no es puntua, perquè la prioritat no es negocia');
assert.equal(m2.estoc.opcions[0].tipus, 'estadi', 'l\'estadi va primer a la llista');

// I si l'obra JA S'ESTÀ FENT, deixa de ser una proposta: la decisió està presa i no es pot
// prendre dues vegades. Tonico la repetia cada setmana perquè no tenia manera de saber-ho.
sqlite.prepare("UPDATE finances SET estadi_obra_inici='2026-07-20' WHERE usuari_id=1").run();
const m3 = await (await mercat.onRequestGet(ctx)).json();
const enCurs = m3.estoc.opcions.find((o) => o.tipus === 'estadi');
assert.equal(enCurs.obra_en_curs, true, 'la pantalla sap que l\'obra està en marxa');
assert.equal(enCurs.admissible, false, 'i per tant no és una opció admissible');
assert.equal(enCurs.motiu, 'obra_en_curs', 'i el motiu ho diu, derivat');
assert.notEqual(m3.estoc.recomanada?.tipus, 'estadi', 'no es recomana el que ja s\'està fent');

// I ELS DOS BOTONS, que és el que Miquel prem de veres. Sense això l'obra es proposava per
// sempre: té prioritat absoluta, o siga que mentre estiga damunt de la taula no es proposa res
// més, i no hi havia manera de dir-li «ja l'estic fent» ni «ja està feta».
const post = (body) => finances.onRequestPost({
  request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  env: { DB: db }, data: { usuari: { id: 1 } } });
// «ja està feta» = eixa obra ja no existix: els números de la calculadora la descrivien i es
// buiden. No és un tercer estat que calga arrossegar.
await post({ estadi_obra_inici: null, estadi_cost_obra: null, estadi_manteniment: null, estadi_data: null });
const m4 = await (await mercat.onRequestGet(ctx)).json();
assert.equal(m4.estoc.estadi_declarat, false, 'feta l\'obra, ja no hi ha cap obra a proposar');
assert.ok(!m4.estoc.opcions.some((o) => o.tipus === 'estadi'), 'ni com a opció de la llista');

// «ja l'estic fent» sobre una obra declarada: es queda com a fet, no com a proposta.
sqlite.prepare('UPDATE finances SET estadi_manteniment=?, estadi_cost_obra=? WHERE usuari_id=1').run(9000, 200000);
await post({ estadi_obra_inici: '2026-07-20' });
const m5 = await (await mercat.onRequestGet(ctx)).json();
assert.equal(m5.estoc.opcions.find((o) => o.tipus === 'estadi').admissible, false,
  'marcada en marxa, deixa de ser admissible i no bloqueja la resta');
sqlite.prepare('UPDATE finances SET estadi_obra_inici=NULL WHERE usuari_id=1').run();

// El FILTRE I LA NECESSITAT són la mateixa fitxa: cada cosa que falta porta els criteris de
// cerca enganxats. Abans eren dues llistes derivades per camins distints i podien discrepar.
assert.ok(m3.necessaris?.length, 'la pantalla de mercat diu què falta');
for (const n of m3.necessaris) assert.ok(n.cerca, 'i cada necessitat porta la seua cerca');
// L'edat de compra és un RANG: el cercador de HT demana els dos extrems, no un sostre.
for (const n of m3.necessaris.filter((x) => x.tipus === 'entrenable')) {
  assert.ok(n.cerca.edat_min != null && n.cerca.edat_max != null, 'el filtre porta els dos extrems d\'edat');
  assert.ok(n.cerca.edat_min <= n.cerca.edat_max, 'i en este ordre');
}

// ── PERSONAL: el pla de flux arriba a la pantalla ──
const pe = await (await personal.onRequestGet(ctx)).json();
assert.ok(pe.pla_flux, 'el personal serveix el pla de flux');
assert.ok(pe.pla_flux.pressupost > 0, 'amb el pressupost de personal');
assert.ok(pe.pla_flux.pla.length > 0, 'i el pla per prioritat');
for (const x of pe.pla_flux.pla) assert.ok(x.accio, 'cada línia diu QUÈ FER');
assert.equal(pe.pla_flux.pla[0].tipus, 'assistent', 'i l\'orde és el del contracte');
// El psicòleg no entra en divisió VII (només de `divisio_psicoleg` cap amunt).
// El psicòleg ja NO queda fora: `divisio_psicoleg` era una regla sense font a la guia.
assert.ok(pe.pla_flux.pla.some((x) => x.tipus === 'psicoleg'), 'el psicòleg entra a la quarta plaça');
assert.equal(pe.pla_flux.pla.length, 4, 'i les places són les 4 de la quota del joc');

// ── VENDA: la subhasta deserta es DEDUÏX ──
assert.equal(subhastaDeserta({ transferible_abans: 1, transferible_ara: null, en_plantilla: true }), true);
assert.equal(despatxable({ es_sobrant: true, desert: true }), true);

console.log('OK — pantalles: el bucle d\'estoc, el pla de flux i la pregunta de venda arriben a la vista');
