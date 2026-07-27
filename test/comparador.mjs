// Tonico — comparador (F1-D) i repuja-substituïx. node test/comparador.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import * as comparador from '../functions/api/comparador.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Sènior FC','senior');`);
const ancora = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

// Snap 1 (T82 s16) i snap 2 (T83 s1) amb un pop de passades i +TSI
await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), ancora);
const snap2 = base.map((c) => c.slice());
const mc = snap2.find((c) => c[29] === 'MC' && c[22] === '7');
mc[24] = String(Number(mc[24]) + 1);            // passades +1 → pop
mc[12] = String(Number(mc[12]) + 100);          // TSI +100
const nomPop = mc[2];
await desar(db, 1, 'senior', modelSenior(snap2, '2026-07-25'), ancora);

const resp = await comparador.onRequestGet({ request: new Request('http://t/api/comparador'), env: { DB: db }, data: { usuari: { id: 1 } } });
const d = await resp.json();
assert.equal(d.comparable, true);
assert.equal(d.dies, 7, 'dies reals entre instantànies');
assert.equal(d.canvi_temporada, true, 'frontera de temporada T82→T83');
assert.ok(d.pops.some((p) => p.nom === nomPop && p.habilitats.includes('passades')), 'detecta el pop');
assert.ok(d.tsi_sou.find((r) => r.nom === nomPop).delta_tsi === 100, 'delta de TSI');

// Repuja del mateix dia: sense confirmar → error; amb reemplaça → substituïx
await assert.rejects(desar(db, 1, 'senior', modelSenior(snap2, '2026-07-25'), ancora, false), /instantania_existix/);
await desar(db, 1, 'senior', modelSenior(snap2, '2026-07-25'), ancora, true);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM instantanies WHERE equip_id=1').get().n, 2, 'màxim un punt per dia i equip');

// Punt #10.4: altes i baixes al comparador. snap3 (26-07): treu un jugador (baixa) i
// n'afig un de nou (alta), amb edat i categoria a la fitxa.
const baixa = snap2[5][2];                              // nom d'un jugador existent
const snap3 = snap2.filter((c) => c[2] !== baixa);
const altaRow = snap2[3].slice(); altaRow[2] = 'Alta Test'; altaRow[3] = '999999999'; altaRow[10] = '17';  // nom, id nou, edat_anys
snap3.push(altaRow);
await desar(db, 1, 'senior', modelSenior(snap3, '2026-07-26'), ancora);
const d2 = await (await comparador.onRequestGet({ request: new Request('http://t/api/comparador'), env: { DB: db }, data: { usuari: { id: 1 } } })).json();
const alta = d2.nous.find((f) => f.nom === 'Alta Test');
assert.ok(alta && alta.edat_anys === 17, 'alta declarada amb edat');
assert.ok(d2.desapareguts.some((f) => f.nom === baixa), 'baixa declarada');

console.log('OK — comparador: parella per defecte, pops, frontera de temporada, repuja i altes/baixes');
