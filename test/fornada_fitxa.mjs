// Tonico — fornada manual (només entrenables) i fitxa amb pops. node test/fornada_fitxa.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import * as fornada from '../functions/api/fornada.js';
import * as jugadorApi from '../functions/api/jugador.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');`);
const ancora = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const ctx = (body, url = 'http://t') => ({ request: new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });
const jidDe = (ht) => sqlite.prepare('SELECT id FROM jugadors WHERE id_hattrick=?').get(ht)?.id;

await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');

// ── Fornada manual: només a entrenables ──
const unEntrenable = sqlite.prepare("SELECT jugador_id FROM categories_jugador WHERE categoria='entrenable' LIMIT 1").get().jugador_id;
const unVenda = sqlite.prepare("SELECT jugador_id FROM categories_jugador WHERE categoria='venda' LIMIT 1").get().jugador_id;
let r = await fornada.onRequestPost(ctx({ jugador_id: unEntrenable, lletra: 'A2' }));
assert.equal(r.status, 201);
const fj = sqlite.prepare('SELECT origen FROM fornades_jugadors WHERE jugador_id=?').get(unEntrenable);
assert.equal(fj.origen, 'manual');
r = await fornada.onRequestPost(ctx({ jugador_id: unVenda, lletra: 'A2' }));
assert.equal(r.status, 409, 'un no-entrenable no pot tindre fornada');

// ── Fitxa amb pop d'habilitat entre dos setmanes ──
const snap2 = base.map((c) => c.slice());
const mc = snap2.find((c) => c[29] === 'MC' && c[22] === '7');   // un entrenable MC
mc[24] = String(Number(mc[24]) + 1);                             // passades +1 → pop
const htPop = mc[3];
await desar(db, 1, 'senior', modelSenior(snap2, '2026-07-25'), ancora);

const resp = await jugadorApi.onRequestGet({ request: new Request('http://t/api/jugador?id=' + jidDe(htPop)), env: { DB: db }, data: { usuari: { id: 1 } } });
const cos = await resp.json();
assert.equal(cos.instantanies.length, 2);
assert.ok(cos.instantanies[1].pops.includes('passades'), 'detecta el pop de passades');
assert.equal(cos.instantanies[0].pops.length, 0, 'la primera instantània no té pops');

console.log('OK — fornada manual (només entrenables) i fitxa amb pops');
