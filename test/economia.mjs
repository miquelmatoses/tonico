// Tonico — economia: signe, caixa declarada i
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
             INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual, parametres) VALUES (1,'competitiva','competitiva','{"capital_objectiu":430000}');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const ctx = (body, method = 'POST') => ({ request: new Request('http://t', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');

// Caixa i nòmina: una venda i una compra apuntades
await tx.onRequestPost(ctx({ tipus: 'venda', import: 200000, data: '2026-07-19' }));
await tx.onRequestPost(ctx({ tipus: 'compra', import: 50000, data: '2026-07-19' }));

let e = await economia(db, 1);
assert.equal(e.caixa, null, 'v3: amb moviments però sense declarar-la, la caixa és null');
assert.ok(e.nomina > 0, 'nòmina setmanal automàtica des dels sous');
// La caixa és la DECLARADA: quan s'apunta, apareix (i no és la suma dels moviments).
sqlite.exec("INSERT INTO finances (usuari_id, caixa, caixa_data) VALUES (1, 90000, '2026-07-25');");
e = await economia(db, 1);
assert.equal(e.caixa, 90000, 'mana el saldo real declarat');

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

console.log('OK — economia: signe, caixa declarada i transacció pendent');
