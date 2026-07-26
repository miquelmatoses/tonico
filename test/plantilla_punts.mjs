// Tonico — polit #5.3: la puntuació de la plantilla es DERIVA de la instantània i
// la config, no del valor desat (ranci/null en desplaçats estables — cas Desplaçat).
// node test/plantilla_punts.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as plantilla from '../functions/api/plantilla.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'Desplaçat'),(2,1,101,'Titular');
  -- Dades reals de Desplaçat a prod: habilitat_max=6, edat 21, lleialtat 20, qual 3.5, sense especialitat.
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, edat_anys, creativitat, defensa, passades, pilota_aturada, extrem, anotacio, porteria, lleialtat, qualificacio_ultim_partit) VALUES
    (1,1,21,6,5,5,5,4,2,1,20,3.5),(1,2,20,9,3,3,1,1,3,1,10,4.0);
  -- Desplaçat desplaçat a venda amb puntuació NULL desada (el cas ranci de sempre).
  INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio) VALUES (1,'venda','auto',NULL);
  INSERT INTO categories_jugador (jugador_id, categoria, origen, puntuacio) VALUES (2,'entrenable','auto',9.0);
`);

const r = await (await plantilla.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
const bal = r.jugadors.find((j) => j.nom === 'Desplaçat');
assert.ok(bal, 'Desplaçat hi és');
assert.equal(bal.categoria, 'venda');
// Punt 1: el número RENDERITZAT (API) ha de coincidir amb el càlcul manual de la
// FÓRMULA COMPLETA (habilitat_max·2 + esp·3 + edat(desde 25) + lleialtat·0.05 + qual·0.2).
const habMax = 6, esp = 0, edat = 21, lleialtat = 20, qual = 3.5;
const manual = habMax * 2 + esp * 3 + (25 - edat) * 1 + lleialtat * 0.05 + qual * 0.2;   // 17.7
assert.equal(manual, 17.7, 'càlcul manual = 17.7');
assert.equal(Math.round(bal.puntuacio * 10) / 10, 17.7, `render (${bal.puntuacio}) = càlcul manual (17.7), fórmula COMPLETA`);

// Cap jugador amb categoria que puntua no ha de quedar sense punts.
const sensePunts = r.jugadors.filter((j) => ['entrenable', 'venda', 'futur_entrenador', 'experiencia', 'farciment'].includes(j.categoria) && j.puntuacio == null);
assert.equal(sensePunts.length, 0, `cap desplaçat/recategoritzat sense puntuació (${sensePunts.map((j) => j.nom)})`);

console.log('OK — plantilla: la puntuació es deriva de la instantània (Desplaçat a venda amb punts)');
