// Tonico — pla mestre (Fase 4): estat i regles de fase. node test/pla.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import { generaAlertes } from '../lib/orquestra_alertes.js';
import { estatPla } from '../lib/pla.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (id, usuari_id, plantilla, fase_actual, parametres) VALUES (1,1,'fabrica','fabrica','{"temporada_inflexio":88,"capital_objectiu":430000}');
             INSERT INTO plans_temporades (pla_id, temporada, mode, accions_previstes) VALUES
               (1,84,'fabrica','{"eixides_fornada":["A1"],"events":["Ix A1"]}'),
               (1,88,'inflexio','{"events":["INFLEXIÓ"],"canvi_fase":"inflexio"}');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');

// Estat del pla
const e = await estatPla(db, 1);
assert.equal(e.temporadaActual, 83, 'temporada competitiva actual = T83 (pretemporada de T83)');
assert.equal(e.parametres.temporada_inflexio, 88);
assert.equal(e.temporades.find((t) => t.temporada === 84).estat, 'futura');

// Regles de fase: canvi de fase (T88) encara no
await generaAlertes(db, 1);
const clau = (k) => sqlite.prepare('SELECT COUNT(*) n FROM alertes WHERE missatge_clau=?').get(k).n;
assert.equal(clau('alerta.canvi_fase'), 0, 'inflexió T88 encara lluny');

console.log('OK — pla mestre: estat, temporada actual i regla de canvi de fase');
