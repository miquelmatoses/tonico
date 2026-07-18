// Tonico — persistència d'alertes (Fase 2): creació, idempotència, ignora
// preservada i resolució automàtica quan la condició desapareix.
// node test/alertes_persist.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior, modelJuvenil } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import { generaAlertes, estatRevisio } from '../lib/orquestra_alertes.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior'),(2,1,'Fotrem','juvenil');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');`);
const ancora = await carregaAncora(db);
const files = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const senior = files('../data/fixtures/players.csv');
const youth = files('../data/fixtures/youthplayers.csv');
const actives = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes WHERE estat IN ('nova','vista')").get().n;
const teMinima = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_PLANTILLA_JUVENIL_MINIMA' AND a.estat IN ('nova','vista')").get().n;

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'fabrica');
await desar(db, 1, 'juvenil', modelJuvenil(youth, '2026-07-18'), ancora);

// Abans de generar: el parte no està revisat
assert.equal((await estatRevisio(db, 1)).revisat, false, 'sense revisió → no revisat');

// Creació: hi ha alertes (com a mínim la del juvenil per davall del mínim, 10 < 11)
const r1 = await generaAlertes(db, 1);
assert.ok(r1.alertes >= 1, 'genera alertes');
assert.equal(actives(), r1.alertes);
assert.equal(teMinima(), 1, 'el juvenil va curt → alerta');

// Després de generar: revisat contra la instantània vigent
assert.equal((await estatRevisio(db, 1)).revisat, true, 'generat → revisat');

// Cas real (18-07): Junta del porter, aniversari-recomanació (mercat en depressió →
// esperar) i aniversari-fet d'un entrenable; tot en la mateixa instantània.
const clau = (k) => sqlite.prepare('SELECT COUNT(*) n FROM alertes WHERE missatge_clau=?').get(k).n;
assert.ok(sqlite.prepare("SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_JUNTA_PORTER'").get().n >= 1, 'Junta del porter');
assert.ok(clau('alerta.aniversari_espera') >= 1, 'aniversari en depressió → espera (dos rellotges)');
assert.ok(clau('alerta.aniversari_fet') >= 1, 'aniversari d\'entrenable → fet');

// Idempotència: re-executar amb les mateixes dades no duplica
const abans = actives();
const r2 = await generaAlertes(db, 1);
assert.equal(r2.alertes, 0, 'cap alerta nova amb les mateixes dades');
assert.equal(actives(), abans);

// Ignora preservada: una ignorada no reapareix
const unaId = sqlite.prepare("SELECT id FROM alertes WHERE estat='nova' LIMIT 1").get().id;
sqlite.prepare("UPDATE alertes SET estat='ignorada' WHERE id=?").run(unaId);
const r3 = await generaAlertes(db, 1);
assert.equal(r3.alertes, 0, 'una ignorada no es torna a crear');
assert.equal(sqlite.prepare('SELECT estat FROM alertes WHERE id=?').get(unaId).estat, 'ignorada');

// Resolució automàtica: si el juvenil arriba al mínim, l'alerta es resol sola
const youth11 = youth.map((c) => c.slice());
const extra = youth[1].slice(); extra[2] = 'Extra Jove'; extra[3] = '959999999';
youth11.push(extra);
await desar(db, 1, 'juvenil', modelJuvenil(youth11, '2026-07-18'), ancora, true);   // repuja substituïx
await generaAlertes(db, 1);
assert.equal(teMinima(), 0, 'amb 11 juvenils, l\'alerta del mínim es resol sola');

console.log('OK — alertes: creació, idempotència, ignora preservada i resolució automàtica');
