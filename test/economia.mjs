// Tonico — economia (Fase 5): signe, caixa, marges per fornada, projecció i
// alerta de transacció pendent. node test/economia.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import { generaAlertes } from '../lib/orquestra_alertes.js';
import { economia, signa } from '../lib/economia.js';
import * as tx from '../functions/api/transaccions.js';

// Signe per tipus
assert.equal(signa('venda', 100), 100);
assert.equal(signa('compra', 100), -100);
assert.equal(signa('sou_setmanal', 100), -100);
assert.equal(signa('altres', -50), -50);

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual, parametres) VALUES (1,'fabrica','fabrica','{"capital_objectiu":430000}');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const ctx = (body, method = 'POST') => ({ request: new Request('http://t', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');

// Una venda d'un entrenable d'A1 → marge de la fornada A1
const a1jugador = sqlite.prepare(`SELECT fj.jugador_id FROM fornades_jugadors fj JOIN fornades f ON f.id=fj.fornada_id WHERE f.lletra='A1' LIMIT 1`).get().jugador_id;
await tx.onRequestPost(ctx({ tipus: 'venda', import: 200000, jugador_id: a1jugador, data: '2026-07-19' }));
await tx.onRequestPost(ctx({ tipus: 'compra', import: 50000, data: '2026-07-19' }));

const e = await economia(db, 1);
assert.equal(e.caixa, 150000, 'caixa = 200000 venda − 50000 compra');
assert.ok(e.nomina > 0, 'nòmina setmanal automàtica des dels sous');   // 7a
const a1 = e.margesFornada.find((m) => m.fornada === 'A1');
assert.equal(a1.vendes, 200000);
assert.equal(a1.marge, 200000);
assert.equal(e.projeccio.objectiu, 430000);
assert.equal(e.projeccio.falta, 280000);

// ALR_TRANSACCIO_PENDENT: un jugador que desapareix sense venda apuntada
const sr2 = senior.filter((c) => c[3] !== '900000001');   // en llevem un
await desar(db, 1, 'senior', modelSenior(sr2, '2026-07-25'), ancora);   // → estat pendent_de_motiu
await generaAlertes(db, 1);
const pendent = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_TRANSACCIO_PENDENT' AND a.estat IN ('nova','vista')").get().n;
assert.equal(pendent(), 1, 'desaparegut sense transacció → alerta');

// En apuntar la venda, l'alerta es resol sola
const foraId = sqlite.prepare('SELECT id FROM jugadors WHERE id_hattrick=900000001').get().id;
await tx.onRequestPost(ctx({ tipus: 'venda', import: 90000, jugador_id: foraId, data: '2026-07-25' }));
await generaAlertes(db, 1);
assert.equal(pendent(), 0, 'apuntada la venda → alerta resolta');

console.log('OK — economia: signe, caixa, marges per fornada, projecció i transacció pendent');
