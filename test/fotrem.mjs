// Tonico — Fotrem (Fase 7): projecció d'aterratge, crides i alerta predictiva.
// node test/fotrem.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelJuvenil } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { projeccioAterratge, avaluaCrida } from '../lib/fotrem.js';
import { REGLES } from '../lib/regles.js';
import * as fotrem from '../functions/api/fotrem.js';

const ancora = { data: '2026-07-25', temporada: 83, anyDies: 112 };
const llindars = { '15': { compost_min: 3, per_defecte: 'accepta' }, '16': { potencial_min: 7, compost_min: 6 }, '17': { mai: true } };

// Aterratge: 125 dies des del 18-07 → T84 (cas Moyano)
assert.equal(projeccioAterratge(125, '2026-07-18', ancora).temporada, 84);

// Crides (doctrina per edat)
assert.deepEqual(avaluaCrida(17, 8, 8, llindars), { accepta: false, motiu: 'mai' });
assert.equal(avaluaCrida(16, 7, 3, llindars).motiu, 'potencial');
assert.equal(avaluaCrida(16, 5, 6, llindars).motiu, 'compost');
assert.equal(avaluaCrida(15, null, 2, llindars).accepta, false);       // compost conegut i fluix → rebutja
assert.equal(avaluaCrida(15, null, 4, llindars).accepta, true);        // compost conegut i suficient → accepta
assert.deepEqual(avaluaCrida(15, null, null, llindars), { accepta: true, motiu: 'sense_dades' });  // desconegut ≠ fluix

// Alerta predictiva de crida
const jv = (n, dies) => Array.from({ length: n }, () => ({ dies_restants_promocio: dies }));
assert.equal(REGLES.ALR_CRIDA_JUVENIL({ juvenils: [...jv(8, 10), ...jv(2, 200)] }, { dies_avis: 30, minim: 11, urgencia: 68 }).length, 1, '8 promocionen → futur 2 < 11');
assert.equal(REGLES.ALR_CRIDA_JUVENIL({ juvenils: jv(10, 200) }, { dies_avis: 30, minim: 11, urgencia: 68 }).length, 0, 'cap promoció imminent');

// Integració via API amb el fixture real
const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (2,1,'Fotrem','juvenil');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');`);
const anc = await carregaAncora(db);
const youth = readFileSync(new URL('../data/fixtures/youthplayers.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
await desar(db, 1, 'juvenil', modelJuvenil(youth, '2026-07-18'), anc);

const resp = await fotrem.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } });
const { juvenils } = await resp.json();
assert.equal(juvenils.length, 10);
const moyano = juvenils.find((j) => j.dies_restants_promocio === 125);
assert.equal(moyano.aterratge.temporada, 84, 'aterratge de Moyano a T84');
assert.ok(juvenils.every((j) => j.crida !== undefined), 'cada juvenil té avaluació de crida');

console.log('OK — Fotrem: aterratge (Moyano→T84), crides per edat i alerta predictiva');
