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
             INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Sènior FC','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const files = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

const cat = (jid) => sqlite.prepare('SELECT categoria FROM categories_jugador WHERE jugador_id=? ORDER BY id DESC LIMIT 1').get(jid)?.categoria;
const idDe = (htnom) => sqlite.prepare('SELECT id FROM jugadors WHERE nom=?').get(htnom)?.id;

// ── Pujada 1: classificació inicial ──
await desar(db, 1, 'senior', modelSenior(files, '2026-07-18'), ancora);
const r1 = await classificaEquip(db, 1, 1, 'competitiva');
// v3: 5 core (els llocs que entrenen). Els «rotatius» ja no els reparteix la classificació:
// són els ENTRENABLES, i ixen del residu de l'assignació d'estructura.
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='core'").get().n, 5);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='rotatiu'").get().n, 0);
// CONTRACTE CENTRAL: equip verge → tot és assignació inicial (auto), mai desplaçament.
assert.equal(r1.autos, 25, 'primera pujada: els 25 jugadors reben categoria auto');
assert.equal(r1.moviments, 0, 'primera pujada: ZERO moviments');
assert.equal(r1.preguntes, 0, 'primera pujada: ZERO preguntes');


// ── Pujada 2: un candidat de fora creix i supera el pitjor del core ──
const files2 = files.map((c) => c.slice());
const reptador = files2.find((c) => c[2] === 'Lluís Estruch');          // el reptador, fora del nucli
reptador[22] = '8';                                                     // creativitat 6 → 8: entra al nucli
const nomReptador = reptador[2];
const catAbans = cat(idDe(nomReptador));
await desar(db, 1, 'senior', modelSenior(files2, '2026-07-25'), ancora);
const r2 = await classificaEquip(db, 1, 1, 'competitiva');
// ACTUA: supera el llindar → els moviments s'EXECUTEN i s'informen (no pregunten).
// v3: els rols tenen capacitat i formen una escala, així que una millora encadena
// desplaçaments (entra al core → algú baixa a rotatiu → algú baixa a cos). El que el
// contracte fixa no és el nombre, sinó que cada desplaçament s'informa i es pot desfer.
assert.ok(r2.moviments >= 1, 'almenys un desplaçament executat');
assert.equal(r2.preguntes, 0, 'cap pregunta: ningú fixat a mà, s\'ha actuat');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='executat'").get().n, r2.moviments,
  'tots els desplaçaments queden registrats com a executats (informar + desfer)');
assert.notEqual(catAbans, 'core');
assert.equal(cat(idDe(nomReptador)), 'core', 'el rival ENTRA sol (actua)');
const x = sqlite.prepare("SELECT id, eixent_id, categoria_previa_entrant FROM intercanvis WHERE estat='executat' AND categoria='core'").get();
assert.equal(x.categoria_previa_entrant, catAbans, 'guarda la categoria prèvia per desfer');
assert.notEqual(cat(x.eixent_id), 'core', 'el desplaçat ha eixit de la plaça');

// ── DESFÉS: restaura l'estat previ complet ──
const ctx = { request: new Request('http://t/api/intercanvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, accio: 'desfer' }) }), env: { DB: db }, data: { usuari: { id: 1 } } };
const resp = await intercanvis.onRequestPost(ctx);
assert.equal(resp.status, 200);
assert.equal(cat(idDe(nomReptador)), catAbans, 'desfet: el rival torna on estava');
assert.equal(cat(x.eixent_id), 'core', 'desfet: el desplaçat recupera la plaça');
assert.equal(sqlite.prepare("SELECT estat FROM intercanvis WHERE id=?").get(x.id).estat, 'desfet');

console.log('OK — persistència: classificació auto, regla d\'or (actua+informa) i DESFÉS');
