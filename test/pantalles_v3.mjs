// Tonico — CABLATGE DE LES PANTALLES: cap decisió del contracte es queda dins de la
// biblioteca. Comprova que l'API serveix el que els bucles decidixen.
// node test/pantalles_v3.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as mercat from '../functions/api/mercat.js';
import * as personal from '../functions/api/personal.js';
import * as vendes from '../functions/api/vendes.js';
import { preguntaVenda, EIXIDES_DESERTA } from '../lib/vendes.js';

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
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (1,'core','auto'),(2,'titular','auto');
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

// ── PERSONAL: el pla de flux arriba a la pantalla ──
const pe = await (await personal.onRequestGet(ctx)).json();
assert.ok(pe.pla_flux, 'el personal serveix el pla de flux');
assert.ok(pe.pla_flux.flux_lliure > 0, 'amb el flux lliure');
assert.ok(pe.pla_flux.pla.length > 0, 'i el pla per prioritat');
for (const x of pe.pla_flux.pla) assert.ok(x.accio, 'cada línia diu QUÈ FER');
assert.equal(pe.pla_flux.pla[0].tipus, 'assistent', 'i l\'orde és el del contracte');
// El psicòleg no entra en divisió VII (només de `divisio_psicoleg` cap amunt).
assert.equal(pe.pla_flux.pla.find((x) => x.tipus === 'psicoleg').exclos, true,
  'el psicòleg queda fora en divisió baixa');

// ── VENDA: la PREGUNTA amb les quatre eixides ──
assert.deepEqual(EIXIDES_DESERTA, ['rebaixar', 'rellistar', 'despatxar', 'un_euro']);
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: null })?.pregunta, 'venut_o_deserta',
  'la transició 1 → buit sense venda apuntada dispara la pregunta');
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: null, venda_apuntada: true }), null,
  'si ja sabem què va passar, no es pregunta');
assert.equal(preguntaVenda({ transferible_abans: 1, transferible_ara: 1 }), null, 'mentres seguix llistat, no es pregunta');

// I la tria es pot desar: cada eixida deixa la fitxa en un estat concret.
sqlite.exec("INSERT INTO vendes (jugador_id, usuari_id, estat) VALUES (1,1,'llistat');");
const post = (cos) => vendes.onRequestPost({ request: new Request('http://t', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify(cos) }), ...ctx });
await post({ jugador_id: 1, eixida_deserta: 'despatxar' });
assert.equal(sqlite.prepare('SELECT estat FROM vendes WHERE jugador_id=1').get().estat, 'despatxat');
// `un_euro` era un override del PREU; ara és NOMÉS un estat (rellistar-lo a la baixa). Cap
// import: Tonico no guarda preus perquè cap preu entra a cap fórmula.
await post({ jugador_id: 1, eixida_deserta: 'un_euro' });
const v = sqlite.prepare('SELECT estat, preu_eixida FROM vendes WHERE jugador_id=1').get();
assert.equal(v.estat, 'llistat', 'l\'1 € torna la fitxa al mercat');
assert.equal(v.preu_eixida, null, 'i no escriu cap import: el preu ja no és cosa de Tonico');

console.log('OK — pantalles: el bucle d\'estoc, el pla de flux i la pregunta de venda arriben a la vista');
