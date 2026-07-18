// Tonico — fre anti-soroll a nivell de BD: rebutjar un intercanvi el silencia
// mentre la diferència no cresca substancialment. node test/anti_soroll.mjs
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
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');`);
const ancora = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

const pendents = () => sqlite.prepare("SELECT COUNT(*) n FROM intercanvis WHERE estat='pendent'").get().n;
// còpia del CSV amb la creativitat del reptador (ED, crea 6) fixada a `cr`
const ambCrea = (cr) => base.map((c) => {
  const d = c.slice();
  if (d[29] === 'ED' && c[22] === '6') d[22] = String(cr);
  return d;
});

// Base + primer desafiament (crea 9 → diferència 1.5 amb l'entrenable extrem)
await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');
await desar(db, 1, 'senior', modelSenior(ambCrea(9), '2026-07-25'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');
assert.equal(pendents(), 1, 'apareix el desplaçament');

// Rebutjar-lo
const x = sqlite.prepare("SELECT id FROM intercanvis WHERE estat='pendent'").get();
await intercanvis.onRequestPost({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, accio: 'rebutjar' }) }), env: { DB: db }, data: { usuari: { id: 1 } } });
assert.equal(pendents(), 0);

// Repujada amb LES MATEIXES puntuacions → NO reapareix (silenciat)
await desar(db, 1, 'senior', modelSenior(ambCrea(9), '2026-08-01'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');
assert.equal(pendents(), 0, 'rebutjat i sense créixer: no reapareix');

// La diferència creix per damunt del llindar respecte del rebuig → SÍ reapareix
await desar(db, 1, 'senior', modelSenior(ambCrea(12), '2026-08-08'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');
assert.equal(pendents(), 1, 'creix substancialment: torna a proposar-se');

console.log('OK — anti-soroll: el rebuig silencia fins que la diferència creix');
