// Tonico — persistència de la classificació + regla d'or via BD.
// Pujada 1 → categories auto; pujada 2 amb un rival que creix → intercanvi
// pendent (res auto); acceptar-lo aplica el moviment. node test/classif_persist.mjs
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
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');`);
const ancora = await carregaAncora(db);
const files = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

const cat = (jid) => sqlite.prepare('SELECT categoria FROM categories_jugador WHERE jugador_id=? ORDER BY id DESC LIMIT 1').get(jid)?.categoria;
const idDe = (htnom) => sqlite.prepare('SELECT id FROM jugadors WHERE nom=?').get(htnom)?.id;

// ── Pujada 1: classificació inicial ──
await desar(db, 1, 'senior', modelSenior(files, '2026-07-18'), ancora);
const r1 = await classificaEquip(db, 1, 1, 'fabrica');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='entrenable'").get().n, 8);
// CONTRACTE CENTRAL: equip verge → tot és assignació inicial (auto), mai desplaçament.
assert.equal(r1.autos, 25, 'primera pujada: els 25 jugadors reben categoria auto');
assert.equal(r1.intercanvis, 0, 'primera pujada: ZERO intercanvis pendents');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='pendent'").get().n, 0);

// ── Pujada 2: un extrem de venda (ED, crea6) creix i supera un entrenable extrem ──
const files2 = files.map((c) => c.slice());
const reptador = files2.find((c) => c[29] === 'ED' && c[22] === '6');   // Cătuneanu (ED, creativitat 6)
reptador[22] = '9';                                                     // ara crea 9 → supera Maglio (7.5)
const nomReptador = reptador[2];
await desar(db, 1, 'senior', modelSenior(files2, '2026-07-25'), ancora);
const r2 = await classificaEquip(db, 1, 1, 'fabrica');
assert.equal(r2.intercanvis, 1, 'un desplaçament proposat');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='pendent'").get().n, 1);
assert.equal(cat(idDe(nomReptador)), 'venda', 'el rival NO s\'ha promogut sol');       // regla d'or

// ── Acceptar l'intercanvi ──
const x = sqlite.prepare("SELECT id, eixent_id FROM intercanvis WHERE estat='pendent'").get();
const eixentAbans = cat(x.eixent_id);
assert.equal(eixentAbans, 'entrenable', 'el titular encara ho és fins que accepte');
const ctx = { request: new Request('http://t/api/intercanvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, accio: 'acceptar' }) }), env: { DB: db }, data: { usuari: { id: 1 } } };
const resp = await intercanvis.onRequestPost(ctx);
assert.equal(resp.status, 200);
assert.equal(cat(idDe(nomReptador)), 'entrenable', 'acceptat: el rival entra');
assert.notEqual(cat(x.eixent_id), 'entrenable', 'acceptat: el titular ix de la plaça');

console.log('OK — persistència: classificació auto, regla d\'or i acceptació d\'intercanvi');
