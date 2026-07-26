// Tonico — persistència de la classificació + regla d'or via BD (doctrina
// «ACTUA, INFORMA, DESFÉS»). Pujada 1 → categories auto; pujada 2 amb un rival
// que creix i supera el llindar → moviment EXECUTAT (informat); desfer-lo
// restaura l'estat previ. node test/classif_persist.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar } from '../functions/api/pujar.js';
import { carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import * as intercanvis from '../functions/api/intercanvis.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const files = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

const cat = (jid) => sqlite.prepare('SELECT categoria FROM categories_jugador WHERE jugador_id=? ORDER BY id DESC LIMIT 1').get(jid)?.categoria;
const idDe = (htnom) => sqlite.prepare('SELECT id FROM jugadors WHERE nom=?').get(htnom)?.id;

// ── Pujada 1: classificació inicial ──
await desar(db, 1, 'senior', modelSenior(files, '2026-07-18'), ancora);
const r1 = await classificaEquip(db, 1, 1, 'competitiva');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='entrenable'").get().n, 8);
// CONTRACTE CENTRAL: equip verge → tot és assignació inicial (auto), mai desplaçament.
assert.equal(r1.autos, 25, 'primera pujada: els 25 jugadors reben categoria auto');
assert.equal(r1.moviments, 0, 'primera pujada: ZERO moviments');
assert.equal(r1.preguntes, 0, 'primera pujada: ZERO preguntes');


// ── Pujada 2: un candidat fora dels 8 creix i supera el pitjor entrenable ──
const files2 = files.map((c) => c.slice());
const reptador = files2.find((c) => c[2] === 'Lluís Estruch');          // el reptador (9é, fora dels 8)
reptador[22] = '8';                                                     // creativitat 6 → 8: supera el 8é (Tormo, 6.0)
const nomReptador = reptador[2];
const catAbans = cat(idDe(nomReptador));
await desar(db, 1, 'senior', modelSenior(files2, '2026-07-25'), ancora);
const r2 = await classificaEquip(db, 1, 1, 'competitiva');
// ACTUA: supera el llindar → el moviment s'EXECUTA i s'informa (no pregunta)
assert.equal(r2.moviments, 1, 'un moviment executat');
assert.equal(r2.preguntes, 0, 'cap pregunta: s\'ha actuat');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='executat'").get().n, 1);
assert.notEqual(catAbans, 'entrenable');
assert.equal(cat(idDe(nomReptador)), 'entrenable', 'el rival ENTRA sol (actua)');       // regla d'or nova
const x = sqlite.prepare("SELECT id, eixent_id, categoria_previa_entrant FROM intercanvis WHERE estat='executat'").get();
assert.equal(x.categoria_previa_entrant, catAbans, 'guarda la categoria prèvia per desfer');
assert.notEqual(cat(x.eixent_id), 'entrenable', 'el desplaçat ha eixit de la plaça');

// ── DESFÉS: restaura l'estat previ complet ──
const ctx = { request: new Request('http://t/api/intercanvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, accio: 'desfer' }) }), env: { DB: db }, data: { usuari: { id: 1 } } };
const resp = await intercanvis.onRequestPost(ctx);
assert.equal(resp.status, 200);
assert.equal(cat(idDe(nomReptador)), catAbans, 'desfet: el rival torna on estava');
assert.equal(cat(x.eixent_id), 'entrenable', 'desfet: el desplaçat recupera la plaça');
assert.equal(sqlite.prepare("SELECT estat FROM intercanvis WHERE id=?").get(x.id).estat, 'desfet');

console.log('OK — persistència: classificació auto, regla d\'or (actua+informa) i DESFÉS');
