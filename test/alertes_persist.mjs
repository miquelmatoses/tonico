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
             INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior'),(2,1,'Fotrem','juvenil');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const files = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const senior = files('../data/fixtures/players.csv');
const youth = files('../data/fixtures/youthplayers.csv');
const actives = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes WHERE estat IN ('nova','vista')").get().n;
const teMinima = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_PLANTILLA_JUVENIL_MINIMA' AND a.estat IN ('nova','vista')").get().n;

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');
const youth9 = [youth[0], ...youth.slice(1, 10)];   // capçalera + 9 juvenils (mínim = 10)
await desar(db, 1, 'juvenil', modelJuvenil(youth9, '2026-07-18'), ancora);

// Abans de generar: el parte no està revisat
assert.equal((await estatRevisio(db, 1)).revisat, false, 'sense revisió → no revisat');

// Creació: hi ha alertes (com a mínim la del juvenil per davall del mínim, 9 < 10)
const r1 = await generaAlertes(db, 1);
assert.ok(r1.alertes >= 1, 'genera alertes');
assert.equal(actives(), r1.alertes);
assert.equal(teMinima(), 1, 'el juvenil va curt → alerta');

// Després de generar: revisat contra la instantània vigent
assert.equal((await estatRevisio(db, 1)).revisat, true, 'generat → revisat');

// Cas real (18-07): Junta del porter, aniversari-recomanació (mercat en depressió →
// esperar) i aniversari-fet d'un entrenable; tot en la mateixa instantània.
const clau = (k) => sqlite.prepare('SELECT COUNT(*) n FROM alertes WHERE missatge_clau=?').get(k).n;
// Doctrina de liquidació: tota venda no llistada genera acció (llistar ja / agenda si
// depressió profunda / ajornar si lesionat).
assert.ok(sqlite.prepare("SELECT COUNT(*) n FROM alertes WHERE missatge_clau IN ('alerta.llistar_ja','alerta.llistar_lesionat','alerta.llistar_agregat_1','alerta.llistar_agregat_n') OR (estat='agenda' AND missatge_clau='agenda.llistar')").get().n >= 1, 'venda no llistada → acció de liquidació (agregada o individual)');
assert.ok(clau('alerta.aniversari_fet') >= 1, 'aniversari d\'entrenable → fet');
// Punt #10.2: els porters del fixture són PO6/PO6/PO5 (< 7 = Notable+) → la Junta
// NO els reté → cap alerta de Junta (abans, amb el llindar 5, eren falses).
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_JUNTA_PORTER'").get().n, 0, 'porters < 7 → cap alerta de Junta');

// REFRESC de clau i18n: una alerta desada amb una clau vella (per un canvi de
// codi/config) ha de recuperar la clau viva en regenerar, preservant NOMÉS
// l'estat (vista/ignorada). Sense això quedava morta per sempre.
{
  const alerta = sqlite.prepare("SELECT id, missatge_clau FROM alertes WHERE estat='nova' LIMIT 1").get();
  const clauViva = alerta.missatge_clau;
  sqlite.prepare("UPDATE alertes SET missatge_clau='alerta.clau_morta', parametres='{}', estat='vista' WHERE id=?").run(alerta.id);
  await generaAlertes(db, 1);
  const desp = sqlite.prepare('SELECT missatge_clau, parametres, estat FROM alertes WHERE id=?').get(alerta.id);
  assert.equal(desp.missatge_clau, clauViva, 'regeneració refresca la clau i18n morta');
  assert.notEqual(desp.parametres, '{}', 'els paràmetres també es refresquen');
  assert.equal(desp.estat, 'vista', 'l\'estat (vista) es preserva');
}

// Idempotència: re-executar amb les mateixes dades no duplica
const abans = actives();
const r2 = await generaAlertes(db, 1);
assert.equal(r2.alertes, 0, 'cap alerta nova amb les mateixes dades');
assert.equal(actives(), abans);

// L'INFORME MOSTRA NOMÉS 'nova' (contracte del GET /api/alertes): marcar vist O
// ignorat amaga l'alerta, i la regeneració preserva ELS DOS estats (no torna).
const visible = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes WHERE usuari_id=1 AND estat='nova'").get().n;
for (const marca of ['vista', 'ignorada']) {
  const id = sqlite.prepare("SELECT id FROM alertes WHERE estat='nova' LIMIT 1").get().id;
  const abansV = visible();
  sqlite.prepare('UPDATE alertes SET estat=? WHERE id=?').run(marca, id);
  assert.equal(visible(), abansV - 1, `marcar ${marca} amaga l'alerta de l'informe`);
  const r = await generaAlertes(db, 1);                       // regenerar
  assert.equal(sqlite.prepare('SELECT estat FROM alertes WHERE id=?').get(id).estat, marca, `la regeneració preserva ${marca}`);
  assert.equal(r.alertes, 0, `${marca}: no es torna a crear`);
  assert.equal(visible(), abansV - 1, `${marca}: segueix amagada després de regenerar (no torna)`);
}

// 0b — IDEMPOTÈNCIA amb DATA D'ACCIÓ: la data d'acció entra a la clau, de manera que
// una anticipada VISTA i la del dia D són instàncies distintes. (Abans es provava amb
// ALR_SUBHASTA_TANCA, retirada perquè no proposa cap acció executable sobre un llistat;
// ací es prova la propietat de la CLAU directament, sense dependre de cap regla viva.)
{
  const reglaId = sqlite.prepare("SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'").get().id;
  const jug = sqlite.prepare("SELECT id FROM jugadors LIMIT 1").get().id;
  const ins = (data_accio, estat) => sqlite.prepare("INSERT INTO alertes (usuari_id, regla_id, jugador_id, data, missatge_clau, parametres, estat, urgencia, data_accio) VALUES (1,?,?,?,?,?,?,?,?)")
    .run(reglaId, jug, data_accio, 'agenda.llistar', '{}', estat, 0, data_accio);
  ins('2026-07-10', 'vista');    // anticipada, vista
  ins('2026-07-18', 'nova');     // dia D: data d'acció distinta → conviu amb l'anticipada
  const n = sqlite.prepare("SELECT COUNT(DISTINCT data_accio) c FROM alertes WHERE jugador_id=? AND regla_id=?").get(jug, reglaId).c;
  assert.equal(n, 2, 'dos dates d\'acció → dos instàncies distintes (la clau inclou data_accio)');
  assert.equal(sqlite.prepare("SELECT estat FROM alertes WHERE jugador_id=? AND data_accio='2026-07-10'").get(jug).estat, 'vista', 'l\'anticipada manté el seu estat, no es fon amb la del dia D');
}

// Resolució automàtica: si el juvenil arriba al mínim (10), l'alerta es resol sola
await desar(db, 1, 'juvenil', modelJuvenil(youth, '2026-07-18'), ancora, true);   // repuja amb els 10
await generaAlertes(db, 1);
assert.equal(teMinima(), 0, 'amb 10 juvenils, l\'alerta del mínim es resol sola');

console.log('OK — alertes: creació, idempotència, ignora preservada i resolució automàtica');
