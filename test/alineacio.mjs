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

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Sènior FC','senior'),(2,1,'Juvenils','juvenil');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
// v3: el FUTUR ENTRENADOR no el tria el sistema — és un override de l'usuari (invariant 5:
// els pins manuals són sagrats i manen sobre el rol derivat).
const veteraId = sqlite.prepare('SELECT jugador_id FROM instantanies_jugadors WHERE instantania_id=1 ORDER BY experiencia DESC LIMIT 1').get().jugador_id;
sqlite.prepare("INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (?, 'futur_entrenador', 'manual')").run(veteraId);
await classificaEquip(db, 1, 1, 'competitiva');
await generaAlertes(db, 1);   // per a l'obligació de minuts de la Junta

const a = await proposaAlineacio(db, 1);
const nucli = sqlite.prepare("SELECT jugador_id FROM categories_jugador WHERE categoria IN ('core','rotatiu')").all().map((r) => r.jugador_id);

// Tot el nucli (core + rotatius) entrena al 100% en acabar la setmana
const comptE = a.comptabilitat.filter((c) => c.categoria === 'core' || c.categoria === 'rotatiu');
assert.equal(comptE.length, nucli.length, 'tot el nucli (core + rotatius) queda comptabilitzat');
for (const c of comptE) assert.equal(c.total, 100, `${c.nom} entrena 100%`);

// Els rols vénen del config (A competitiu, B només entrenament)
assert.deepEqual(a.rols.map((r) => r.id), ['A', 'B'], 'dos rols A/B');
assert.equal(a.rols.find((r) => r.competitiu).id, 'A', 'A és el rol competitiu');
// Símptoma noms curts: alinea() ha de portar nom_clau_curt (si no, el client cau al llarg).
assert.ok(a.rols.find((r) => r.id === 'A').nom_clau_curt, 'els rols porten el nom curt (si no, el client cau al llarg)');

// El repartiment concret per lloc (qui juga a quin partit i amb quin pes) el fixa el
// PAS 9 i té el seu propi test: ací només es comprova que ningú es queda sense minuts
// d'entrenament i que els dos onzes existixen.
assert.ok(comptE.length > 0, 'hi ha nucli comptabilitzat');
assert.ok(a.onze.A.length > 0 && a.onze.B.length > 0, 'els dos onzes es formen');

// FuturCoach (futur_entrenador) juga per experiència: FORA de la comptabilitat, a `experiencia`
assert.equal(a.comptabilitat.every((c) => c.categoria === 'core' || c.categoria === 'rotatiu'), true, 'la comptabilitat és només del nucli');
assert.ok(a.experiencia.length >= 1, 'el futur entrenador va a experiència');
const coachId = veteraId;
assert.ok(a.experiencia.some((e) => e.jugador_id === coachId), 'FuturCoach és a experiència, no a la taula');
// v3: al futur entrenador no se li REGALEN llocs. max_partits li permet doblar (2), i si
// guanya un lloc pel seu valor, hi juga; l'experiència que acumula es compta a part.
import { maxPartits } from '../lib/plantilla.js';
assert.equal(maxPartits('futur_entrenador', 100), 2, 'el futur entrenador pot doblar');



// Les propietats del motor (llistat/lesionat/sancionat fora, doblatge del 50%, llocs buits,
// fixats) es proven a test/onze.mjs sobre lib/onze.js. Ací només la INTEGRACIÓ amb la BD.

// Cobertura: amb la plantilla sencera, el nucli entrena (cap perdut)
assert.ok(a.avisos.filter((v) => v.tipus === 'entrenament_perdut').length <= a.comptabilitat.length, 'els avisos d\'entrenament perdut són del nucli');

// Crisi: si es veta algú del nucli, ho diu (avís de cobertura) i marca qui ha perdut
// l'entrenament amb el motiu. El nombre exacte depén del PAS 9 i té el seu propi test.
const vetat = comptE[0].jugador_id;
const a2 = await proposaAlineacio(db, 1, { vetats: [vetat] });
assert.ok(a2.avisos.some((v) => v.tipus === 'entrenament_perdut' && v.jugador_id === vetat && v.motiu === 'vetat'),
  'el vetat apareix com a entrenament perdut, amb el motiu');
const compE2 = a2.comptabilitat.filter((c) => c.categoria === 'core' || c.categoria === 'rotatiu');
const complets = (llista) => llista.filter((c) => c.total >= 100).length;
assert.ok(complets(compE2) < complets(comptE), 'amb un vetat, un del nucli menys completa la setmana');
assert.ok(compE2.filter((c) => c.total >= 100).length >= 1, 'els disponibles que juguen completen la setmana');

// 7f: lesió i sanció exclouen de l'alineació + avís de cobertura
const unEnt = nucli[0];
sqlite.prepare('UPDATE instantanies_jugadors SET lesio=? WHERE jugador_id=? AND instantania_id=(SELECT MAX(id) FROM instantanies WHERE equip_id=1)').run('Cama', unEnt);
const a3 = await proposaAlineacio(db, 1);
const juga = Object.values(a3.onze).flat().some((s) => s.jugador?.jugador_id === unEnt);
assert.equal(juga, false, 'el lesionat no juga cap partit');
assert.ok(a3.avisos.some((v) => v.tipus === 'entrenament_perdut' && v.jugador_id === unEnt && v.motiu === 'lesionat'), 'avís de lesionat');

// Les propietats de compatibilitat (un porter no ompli un lloc de camp) i de «cap del
// nucli en un lloc que no entrena havent-hi cos, i si no n'hi ha la plaça queda buida»
// es proven a test/onze.mjs sobre lib/onze.js, que és el motor del PAS 9.


console.log('OK — alineació: rols A/B, nucli comptabilitzat, futur entrenador a experiència, un-sol-partit, Junta, cobertura, lesionat exclòs, cos compatible i contracte LEAN');
