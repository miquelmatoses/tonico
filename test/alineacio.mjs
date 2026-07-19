// Tonico — motor d'alineació (Fase 3). Valida la doctrina amb les dades del 18-07.
// node test/alineacio.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import { generaAlertes } from '../lib/orquestra_alertes.js';
import { proposaAlineacio } from '../lib/orquestra_alineacio.js';
import { alinea } from '../lib/alineacio.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior'),(2,1,'Fotrem','juvenil');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');
await generaAlertes(db, 1);   // per a l'obligació de minuts de la Junta

const a = await proposaAlineacio(db, 1);
const entrenables = sqlite.prepare("SELECT jugador_id FROM categories_jugador WHERE categoria='entrenable'").all().map((r) => r.jugador_id);

// Els 8 entrenables entrenen al 100%
const comptE = a.comptabilitat.filter((c) => c.categoria === 'entrenable');
assert.equal(comptE.length, 8, '8 entrenables comptabilitzats');
for (const c of comptE) assert.equal(c.total, 100, `${c.nom} entrena 100%`);

// 6 MC repartits 3 lliga + 3 amistós (un partit cadascú)
const mcs = comptE.filter((c) => c.partits.length === 1);
assert.equal(mcs.length, 6, '6 MC juguen un sol partit');
assert.equal(mcs.filter((c) => c.partits[0].partit === 'lliga').length, 3, '3 MC a la lliga');
assert.equal(mcs.filter((c) => c.partits[0].partit === 'amistos').length, 3, '3 MC a l\'amistós');

// 2 extrems als dos partits
const exts = comptE.filter((c) => c.partits.length === 2);
assert.equal(exts.length, 2, '2 extrems als dos partits');
for (const c of exts) assert.deepEqual(c.partits.map((p) => p.pct).sort(), [50, 50]);

// Salvatella (futur_entrenador) de davanter als dos partits
const coach = a.comptabilitat.find((c) => c.categoria === 'futur_entrenador');
assert.equal(coach.partits.length, 2, 'el futur entrenador juga els dos partits');

// El porter en venda amb Junta juga de porter a la lliga (obligació de minuts, no entrenable)
const porterLliga = a.onze.lliga.find((s) => s.bucket === 'porter').jugador;
assert.ok(porterLliga, 'porter cobert a la lliga');

// Cobertura: amb la plantilla sencera, els 8 entrenen (cap perdut)
assert.equal(a.avisos.filter((v) => v.tipus === 'entrenament_perdut').length, 0, 'tots els entrenables al 100%');

// Crisi: si es veta un extrem, apareix «7/8 entrenen» + entrenament perdut (motiu vetat);
// els MC no es toquen (últim recurs)
const unExtrem = exts[0].jugador_id;
const a2 = await proposaAlineacio(db, 1, { vetats: [unExtrem] });
assert.ok(a2.avisos.some((v) => v.tipus === 'cobertura' && v.entrenen === 7 && v.total === 8), 'avís 7/8 entrenen');
assert.ok(a2.avisos.some((v) => v.tipus === 'entrenament_perdut' && v.jugador_id === unExtrem && v.motiu === 'vetat'), 'vetat perd entrenament');
const compE2 = a2.comptabilitat.filter((c) => c.categoria === 'entrenable');
assert.equal(compE2.length, 7, '7 entrenables disponibles');
assert.ok(compE2.every((c) => c.total === 100), 'els 7 disponibles entrenen al 100%');

console.log('OK — alineació: 8 entrenables al 100%, MC 3/3, extrems dobles, coach davanter, Junta i cobertura');
