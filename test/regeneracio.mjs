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
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);
             INSERT INTO equips (id,usuari_id,nom,tipus) VALUES (1,1,'B','senior');
             INSERT INTO plans (usuari_id,plantilla,fase_actual) VALUES (1,'competitiva','competitiva');`);
const anc = await carregaAncora(db);
const base = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
await desar(db, 1, 'senior', modelSenior(base, '2026-07-18'), anc);

// Regenerar → derivats al dia
await regeneraPipeline(db, 1);
assert.equal((await estatRevisio(db, 1)).revisat, true, 'després de regenerar: al dia');
// v3: 5 core (els llocs que entrenen). Els rotatius ja no els reparteix la classificació.
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='core'").get().n, 5);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM categories_jugador WHERE categoria='rotatiu'").get().n, 0);

// Canvi de config (un pom) → els derivats queden VELLS. `edat_pic_venda` ja no existix (se'n va
// amb el model fàbrica); es gasta un pom viu, que és el que fa la prova de veres.
sqlite.exec("UPDATE plantilles_parametres SET valor='7' WHERE plantilla='competitiva' AND clau='entrenable_creativitat_min'");
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
