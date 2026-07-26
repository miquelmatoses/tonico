// Tonico — polit #6.4: els moviments executats caduquen a l'HISTORIAL (per temps o
// per la pujada següent); la vista mostra només els recents, però el Desfés hi és a
// l'historial mentres siguen reversibles. node test/moviments_caducitat.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as intercanvis from '../functions/api/intercanvis.js';

const { sqlite, db } = nova(import.meta.url);
// Instantània amb data clarament futura → el llindar = data de la instantània
// (regla de «la pujada següent»), determinista independentment del rellotge real.
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2027-01-01',90,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'Ent'),(2,1,101,'Recent'),(3,1,102,'Vell');
  INSERT INTO intercanvis (usuari_id, categoria, entrant_id, eixent_id, puntuacio_eixent, diferencia, desti_eixent, estat, data) VALUES
    (1,'entrenable',1,2,5,1,'venda','executat','2027-01-01'),
    (1,'entrenable',1,3,5,1,'venda','executat','2026-01-01');
`);

const d = await (await intercanvis.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.moviments.length, 1, 'un recent a la vista');
assert.equal(d.moviments[0].eixent, 'Recent');
assert.equal(d.historial.length, 1, 'el vell, a l\'historial');
assert.equal(d.historial[0].eixent, 'Vell');

// El Desfés segueix disponible per als de l'historial (encara 'executat').
const ctx = { request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: sqlite.prepare("SELECT id FROM intercanvis WHERE data='2026-01-01'").get().id, accio: 'desfer' }) }), env: { DB: db }, data: { usuari: { id: 1 } } };
assert.equal((await intercanvis.onRequestPost(ctx)).status, 200, 'es pot desfer un moviment de l\'historial');

console.log('OK — moviments: caducitat a historial plegable, Desfés disponible mentres siga reversible');
