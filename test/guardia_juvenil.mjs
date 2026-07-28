// Tonico — G4 · EL PARTE I LA SECCIÓ DIUEN EL MATEIX, i cap secció menteix quan li falta res.
//
// Dos forats reals, els dos de la mateixa família i els dos comesos hui:
//
//  (a) La secció de Juvenils es va connectar al pla nou i el MOTOR D'ALERTES es va quedar amb
//      l'avaluador vell (`avaluaPipeline`, amb els seus llindars cablejats). Dues derivacions
//      de la mateixa pregunta: Paco podia dir «sobren tres» i la pantalla assenyalar-ne uns
//      altres. Cap guardià ho veia, perquè cada un mirava un costat.
//
//  (b) En reescriure l'endpoint, la targeta d'entrenament juvenil va quedar llegint un camp
//      que ja no existia i va caure al seu text de «falta». Res va petar i la clau i18n
//      resolia perfectament: un fallback que MENTIA. `pantalles_pinten` no pot vore-ho —
//      comprova que es pinte, no que diga la veritat.
//
// node test/guardia_juvenil.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelJuvenil } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { generaAlertes } from '../lib/orquestra_alertes.js';
import * as juvenils from '../functions/api/juvenils.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','academia',2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'S','senior'),(2,1,'J','juvenil');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-26',83,2);
`);
const ancora = await carregaAncora(db);
const files = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
// DOTZE juvenils, no deu: amb l'objectiu a 10 en calen més per a que hi haja sobrants de
// veres. Sense excedent, la comparació entre el parte i la secció no prova res.
const cru = files('../data/fixtures/youthplayers.csv');
const dotze = [cru[0], ...cru.slice(1), ...cru.slice(1, 3).map((c, i) => {
  const d = [...c]; d[3] = String(960000000 + i); d[2] = `Extra${i}`; return d;
})];
await desar(db, 1, 'juvenil', modelJuvenil(dotze, '2026-07-26'), ancora);

const ctx = { env: { DB: db }, data: { usuari: { id: 1 } } };
const vista = await (await juvenils.onRequestGet(ctx)).json();
await generaAlertes(db, 1, '2026-07-26');

// ── (a) EL MATEIX VEREDICTE ALS DOS COSTATS ──────────────────────────────────────────────
const sobraSeccio = new Set(vista.juvenils.filter((j) => j.despatxa).map((j) => j.jugador_id));
const alerta = sqlite.prepare(
  "SELECT parametres FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_JUVENIL_SOBRANT'").get();
assert.ok(vista.juvenils.length, 'el fixture ha de portar juvenils: si no, açò no prova res');
assert.ok(sobraSeccio.size > 0, 'i ha de sobrar algú, si no la comparació és buida');
assert.ok(alerta, 'si la secció diu que sobra gent, el parte també ho ha de dir');
const nombreParte = JSON.parse(alerta.parametres).sobren;
assert.equal(nombreParte, sobraSeccio.size,
  `el parte diu que sobren ${nombreParte} i la secció n'assenyala ${sobraSeccio.size}: dues derivacions`);
const nomsParte = JSON.parse(alerta.parametres).noms.split(', ').sort();
const nomsSeccio = vista.juvenils.filter((j) => j.despatxa).map((j) => j.nom).sort();
assert.deepEqual(nomsParte, nomsSeccio, 'i han de ser EXACTAMENT els mateixos, no només la mateixa quantitat');

// ── (b) CAP TEXT DE «FALTA» AMB LA DADA DECLARADA ────────────────────────────────────────
// La prescripció de l'acadèmia està declarada als poms, o siga que la secció no pot dir que
// li falte. Es comprova sobre el que la secció REP, que és on va nàixer el forat.
assert.ok(vista.pla?.principal, 'amb la prescripció juvenil declarada, el pla la porta');
assert.ok(vista.pla?.secundaria, 'les dues: principal i secundari');
const pomA = sqlite.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenament_juvenil_a'").get();
assert.equal(vista.pla.principal, pomA.valor,
  'i és la de l\'ACADÈMIA, no la del primer equip: són dos entrenaments independents');

console.log(`OK — G4: el parte i Juvenils assenyalen els mateixos ${sobraSeccio.size} sobrants,`
  + ' i la prescripció de l\'acadèmia arriba a la secció');
