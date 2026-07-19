// Tonico — CONTRACTE: versionat de config i regeneració del pipeline (polit #2.1).
// Un canvi de config marca els derivats com a vells; regenerar els posa al dia
// sense desclassificacions silencioses. node test/regeneracio.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { regeneraPipeline } from '../lib/pipeline.js';
import { estatRevisio } from '../lib/orquestra_alertes.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id,correu,contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id,usuari_id,nom,tipus) VALUES (1,1,'B','senior');
             INSERT INTO plans (usuari_id,plantilla,fase_actual) VALUES (1,'fabrica','fabrica');`);
const anc = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), anc);

// Regenerar → derivats al dia
await regeneraPipeline(db, 1);
assert.equal((await estatRevisio(db, 1)).revisat, true, 'després de regenerar: al dia');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='entrenable'").get().n, 8);

// Canvi de config (un pom) → els derivats queden VELLS
sqlite.exec("UPDATE plantilles_parametres SET valor='7' WHERE plantilla='fabrica' AND clau='edat_pic_venda'");
assert.equal((await estatRevisio(db, 1)).revisat, false, 'config nova → derivats vells');

// Regenerar → al dia altra vegada, idempotent
await regeneraPipeline(db, 1);
assert.equal((await estatRevisio(db, 1)).revisat, true, 'regenerat → al dia');
const r2 = await regeneraPipeline(db, 1);
assert.equal(r2.alertes.alertes, 0, 'segona regeneració sense dades noves: idempotent');

// Canvi de regla també marca vell
sqlite.exec("UPDATE regles SET activa=0 WHERE codi='ALR_FINESTRA_MERCAT'");
assert.equal((await estatRevisio(db, 1)).revisat, false, 'canvi de regla → derivats vells');

console.log('OK — regeneració: versionat de config, derivats vells i posada al dia idempotent');
