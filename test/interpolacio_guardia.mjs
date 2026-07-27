// Tonico — GUARDIÀ D'INTERPOLACIÓ (polit #5.2): cap text renderitzat pot dur un
// {parametre} sense resoldre. node test/interpolacio_guardia.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { economia } from '../lib/economia.js';

const dir = new URL('../public/i18n/', import.meta.url);
const ca = JSON.parse(readFileSync(new URL('ca-valencia.json', dir), 'utf8'));
const en = JSON.parse(readFileSync(new URL('en.json', dir), 'utf8'));
const params = (s) => new Set([...s.matchAll(/\{([a-zA-Z_][\w]*)\}/g)].map((m) => m[1]));
// Mirall de la interpolació de comu.js t().
const interpola = (s, p) => { for (const [k, v] of Object.entries(p)) s = s.replaceAll(`{${k}}`, v); return s; };
const fuga = (s) => /\{[a-zA-Z_][\w]*\}/.test(s);

// 1. PARITAT de paràmetres ca ↔ en: mateixos {params} per clau (evita deriva entre camins).
for (const k of Object.keys(ca)) {
  if (!(k in en)) continue;
  assert.deepEqual([...params(ca[k])].sort(), [...params(en[k])].sort(), `paràmetres diferents a «${k}» entre ca i en`);
}

// 2. CAS CONCRET (el símptoma): la projecció REAL d'economia interpola sense fuga.
//    (L'alerta interpolava bé; la secció Economia no — camins diferents.)
const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual, parametres) VALUES (1,'competitiva','competitiva','{"temporada_inflexio":88,"capital_objectiu":500000}');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,5000);
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi)
    VALUES (1,100000,'2026-07-25',3000);
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,21127,40500,'2026-07-19','2026-07-25'),(1,83,2,0,40500,'2026-07-25','2026-07-25');
`);
const e = await economia(db, 1);
// La secció passa objectes de l'avaluador a estes claus: no ha de quedar cap {…}.
assert.equal(fuga(interpola(ca['economia.despeses_detall'], e.despeses)), false, 'despeses_detall amb les despeses reals');
assert.equal(fuga(interpola(ca['economia.dades_velles'], { data: e.caixa_data })), false,
  'dades_velles amb la data real');
assert.ok('manteniment_estadi' in e.despeses, 'els camps que les claus referencien existixen');

console.log('OK — guardià d\'interpolació: paritat de paràmetres i economia real sense {…} sense resoldre');
