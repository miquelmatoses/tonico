// Tonico — CONTRACTE PROTEGIT: la classificació és ESTABLE davant la posició de
// l'últim partit. El bucket (MC/extrem) és decisió d'alineació, no de categoria.
// Cas Maglio: si Kirsch juga d'extrem, NO pot expulsar Maglio (ni silenciosament
// ni com a intercanvi). node test/regla_or_bucket.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id,correu,contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id,usuari_id,nom,tipus) VALUES (1,1,'B','senior');
             INSERT INTO plans (usuari_id,plantilla,fase_actual) VALUES (1,'fabrica','fabrica');`);
const anc = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const catDe = (nom) => sqlite.prepare(`SELECT c.categoria FROM categories_jugador c JOIN jugadors j ON j.id=c.jugador_id
  JOIN (SELECT jugador_id,MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON c.id=m.mid WHERE j.nom=?`).get(nom)?.categoria;
const nEntrenables = () => sqlite.prepare(`SELECT COUNT(*) n FROM categories_jugador c
  JOIN (SELECT jugador_id,MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON c.id=m.mid WHERE c.categoria='entrenable'`).get().n;

// Pujada 1: Kirsch (Marc Montaner) d'MC, Maglio (Vicent Camarasa) d'EE → tots dos entrenables
await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), anc);
await classificaEquip(db, 1, 1, 'fabrica');
assert.equal(catDe('Marc Montaner'), 'entrenable');
assert.equal(catDe('Vicent Camarasa'), 'entrenable');
assert.equal(nEntrenables(), 8);

// Pujada 2: Kirsch juga d'ED (canvi de posició a l'últim partit)
const s19 = base.map((c) => c.slice());
s19.find((c) => c[2] === 'Marc Montaner')[29] = 'ED';
await desar(db, 1, 'senior', modelSenior(s19, '2026-07-19'), anc);
const r = await classificaEquip(db, 1, 1, 'fabrica');

// La posició jugada és efecte, no causa: cap canvi, cap intercanvi, Maglio dins.
assert.equal(r.autos, 0, 'cap reassignació automàtica');
assert.equal(r.intercanvis, 0, 'cap intercanvi proposat');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='pendent'").get().n, 0, 'cap desclassificació pendent');
assert.equal(catDe('Vicent Camarasa'), 'entrenable', 'Maglio segueix entrenable');
assert.equal(catDe('Marc Montaner'), 'entrenable', 'Kirsch segueix entrenable');
assert.equal(nEntrenables(), 8, '8/8 entrenables estables');

console.log('OK — contracte: la classificació és estable davant la posició de l\'últim partit (cas Maglio)');
