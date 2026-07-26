// Tonico — fre anti-soroll (doctrina «ACTUA, INFORMA, DESFÉS»): un DESFÉS
// silencia el moviment mentre la diferència no cresca substancialment (un
// desfés equival al rebuig antic). node test/anti_soroll.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import * as intercanvis from '../functions/api/intercanvis.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

const executats = () => sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='executat'").get().n;
// còpia del CSV amb la creativitat del reptador (el 9é del rànquing) fixada a `cr`
const ambCrea = (cr) => base.map((c) => {
  const d = c.slice();
  if (d[2] === 'Lluís Estruch') d[22] = String(cr);
  return d;
});

// Base + primer desafiament (crea 9): supera el llindar → S'EXECUTA i s'informa
await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');
await desar(db, 1, 'senior', modelSenior(ambCrea(9), '2026-07-25'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');
assert.equal(executats(), 1, 'el desplaçament s\'executa');

// DESFER-lo (= rebuig antic): silencia i restaura
const x = sqlite.prepare("SELECT id FROM intercanvis WHERE estat='executat'").get();
await intercanvis.onRequestPost({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, accio: 'desfer' }) }), env: { DB: db }, data: { usuari: { id: 1 } } });
assert.equal(executats(), 0, 'desfet: ja no és un moviment viu');

// Repujada amb LES MATEIXES puntuacions → NO torna a executar-se (silenciat)
await desar(db, 1, 'senior', modelSenior(ambCrea(9), '2026-08-01'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');
assert.equal(executats(), 0, 'desfet i sense créixer: no torna a actuar');

// La diferència creix per damunt del llindar respecte del desfés → SÍ torna a actuar
await desar(db, 1, 'senior', modelSenior(ambCrea(12), '2026-08-08'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');
assert.equal(executats(), 1, 'creix substancialment: torna a executar-se');

console.log('OK — anti-soroll: el desfés silencia fins que la diferència creix');
