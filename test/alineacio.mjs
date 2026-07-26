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
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8').replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');
await generaAlertes(db, 1);   // per a l'obligació de minuts de la Junta

const a = await proposaAlineacio(db, 1);
const entrenables = sqlite.prepare("SELECT jugador_id FROM categories_jugador WHERE categoria='entrenable'").all().map((r) => r.jugador_id);

// Els 8 entrenables entrenen al 100%
const comptE = a.comptabilitat.filter((c) => c.categoria === 'entrenable');
assert.equal(comptE.length, 8, '8 entrenables comptabilitzats');
for (const c of comptE) assert.equal(c.total, 100, `${c.nom} entrena 100%`);

// Els rols vénen del config (A competitiu, B només entrenament)
assert.deepEqual(a.rols.map((r) => r.id), ['A', 'B'], 'dos rols A/B');
assert.equal(a.rols.find((r) => r.competitiu).id, 'A', 'A és el rol competitiu');
// Símptoma noms curts: alinea() ha de portar nom_clau_curt (si no, el client cau al llarg).
assert.equal(a.rols.find((r) => r.id === 'A').nom_clau_curt, 'rol.fabrica_a_curt', 'rols porten el nom curt');

// 6 MC repartits 3 A (competitiu) + 3 B (un partit cadascú)
const mcs = comptE.filter((c) => c.partits.length === 1);
assert.equal(mcs.length, 6, '6 MC juguen un sol partit');
assert.equal(mcs.filter((c) => c.partits[0].partit === 'A').length, 3, '3 MC al rol A');
assert.equal(mcs.filter((c) => c.partits[0].partit === 'B').length, 3, '3 MC al rol B');

// 2 extrems als dos rols
const exts = comptE.filter((c) => c.partits.length === 2);
assert.equal(exts.length, 2, '2 extrems als dos rols');
for (const c of exts) assert.deepEqual(c.partits.map((p) => p.pct).sort(), [50, 50]);

// FuturCoach (futur_entrenador) juga per experiència: FORA de la comptabilitat, a `experiencia`
assert.equal(a.comptabilitat.every((c) => c.categoria === 'entrenable'), true, 'la comptabilitat és només d\'entrenables');
assert.ok(a.experiencia.length >= 1, 'el futur entrenador va a experiència');
const coachId = sqlite.prepare("SELECT jugador_id FROM categories_jugador WHERE categoria='futur_entrenador' LIMIT 1").get().jugador_id;
assert.ok(a.experiencia.some((e) => e.jugador_id === coachId), 'FuturCoach és a experiència, no a la taula');
assert.equal(['A', 'B'].every((r) => a.onze[r].some((s) => s.jugador?.jugador_id === coachId)), true, 'juga de davanter als dos rols');

// El porter en venda amb Junta juga de porter al rol competitiu (obligació de minuts, no entrenable)
const porterA = a.onze.A.find((s) => s.bucket === 'porter').jugador;
assert.ok(porterA, 'porter cobert al rol competitiu');
// Punt #10.4: cada slot ocupat porta la categoria (base de la columna MOTIU).
assert.ok(a.onze.A.filter((s) => s.jugador).every((s) => s.jugador.categoria != null), 'el slot ocupat porta categoria');

// FORA L'APARADOR (1a) — el LLISTAT no juga MAI: ni al rol competitiu ni enlloc.
// Cap prioritat de venda; qui no entrena és cos i prou.
{
  const config = {
    rols: [{ id: 'A', competitiu: 1, nom_clau: 'x' }, { id: 'B', competitiu: 0, nom_clau: 'y' }],
    slots: [{ codi: 'PO', bucket: 'porter', entrena: 0, pct: 0 }, { codi: 'DC', bucket: 'defensa', entrena: 0, pct: 0 }],
    buckets: { porter: ['PO'], defensa: ['DC'] },
  };
  const squad = [
    { jugador_id: 1, nom: 'PorterLlistat', posicio: 'PO', categoria: 'venda', llistat: true },
    { jugador_id: 3, nom: 'PorterCos', posicio: 'PO', categoria: 'farciment' },
    { jugador_id: 4, nom: 'DefCos', posicio: 'DC', categoria: 'farciment' },
  ];
  const r = alinea(squad, config, { rols_actius: ['A', 'B'] });
  const juga = (nom) => ['A', 'B'].some((k) => r.onze[k].some((s) => s.jugador?.nom === nom));
  assert.equal(juga('PorterLlistat'), false, 'el llistat no juga mai (protecció de l\'actiu)');
  assert.equal(r.onze.A.find((s) => s.bucket === 'porter').jugador.nom, 'PorterCos', 'la porteria la cobrix el cos');
}

// (1c) DOBLATGE DE FARCIMENT REPARTIT: amb prou cossos ningú dobla; si no n'hi ha
// prou, el doblatge es repartix (no carrega sempre el mateix). Derivat de comptar partits.
{
  const config = {
    rols: [{ id: 'A', competitiu: 1, nom_clau: 'x' }, { id: 'B', competitiu: 0, nom_clau: 'y' }],
    slots: [{ codi: 'DV', bucket: 'davanter', entrena: 0, pct: 0 }],
    buckets: { davanter: ['DV'] },
  };
  const cos = (id, nom) => ({ jugador_id: id, nom, posicio: 'DV', categoria: 'farciment' });
  // Prou cossos (2 places en total, 2 cossos) → cap doblatge.
  const r2 = alinea([cos(1, 'C1'), cos(2, 'C2')], config, { rols_actius: ['A', 'B'] });
  const partitsDe = (r, nom) => ['A', 'B'].filter((k) => r.onze[k].some((s) => s.jugador?.nom === nom)).length;
  assert.equal(partitsDe(r2, 'C1'), 1, 'amb prou cossos, C1 juga un sol partit');
  assert.equal(partitsDe(r2, 'C2'), 1, 'amb prou cossos, C2 juga un sol partit');
  // Un sol cos per a dues places → dobla (no queda buit), però perquè no hi ha alternativa.
  const r1 = alinea([cos(1, 'C1')], config, { rols_actius: ['A', 'B'] });
  assert.equal(partitsDe(r1, 'C1'), 2, 'sense alternativa, el cos dobla i no deixa buit');
}

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

// 7f: lesió i sanció exclouen de l'alineació + avís de cobertura
const unEnt = entrenables[0];
sqlite.prepare('UPDATE instantanies_jugadors SET lesio=? WHERE jugador_id=? AND instantania_id=(SELECT MAX(id) FROM instantanies WHERE equip_id=1)').run('Cama', unEnt);
const a3 = await proposaAlineacio(db, 1);
const juga = Object.values(a3.onze).flat().some((s) => s.jugador?.jugador_id === unEnt);
assert.equal(juga, false, 'el lesionat no juga cap partit');
assert.ok(a3.avisos.some((v) => v.tipus === 'entrenament_perdut' && v.jugador_id === unEnt && v.motiu === 'lesionat'), 'avís de lesionat');

// Punt 5: ompliment amb cos compatible — cap porter en posició de camp
{
  const config = { rols: [{ id: 'A', competitiu: true, nom_clau: 'x' }, { id: 'B', competitiu: false, nom_clau: 'y' }], buckets: { porter: ['PO'], mc: ['MC'] },
    slots: [{ codi: 'POR', bucket: 'porter', entrena: false }, { codi: 'MC1', bucket: 'mc', entrena: true, pct: 100 }] };
  const squad = [{ jugador_id: 1, nom: 'Porter', posicio: 'PO', categoria: 'venda' }, { jugador_id: 2, nom: 'Migcampista', posicio: 'MC', categoria: 'venda' }];
  const r = alinea(squad, config);
  assert.notEqual(r.onze.A.find((s) => s.bucket === 'mc').jugador?.jugador_id, 1, 'un porter no ompli una posició de camp');
}

// Punt 2: setmana amb NOMÉS un partit (sense amistós) → els extrems entrenen al 50%,
// no es compten com a perduts, i Paco ho declara.
{
  const a1 = await proposaAlineacio(db, 1, { rols_actius: ['A'] });
  assert.deepEqual(Object.keys(a1.onze), ['A'], 'només el rol competitiu esta setmana');
  const extsUn = a1.comptabilitat.filter((c) => c.partits.length === 1 && c.partits[0].pct === 50);
  assert.ok(extsUn.length >= 1, 'els extrems queden al 50%');
  assert.ok(a1.avisos.some((v) => v.tipus === 'una_alineacio'), 'Paco declara la setmana d\'un sol partit');
  assert.equal(a1.avisos.some((v) => v.tipus === 'entrenament_perdut' && extsUn.some((e) => e.jugador_id === v.jugador_id)), false, 'l\'extrem al 50% no es compta com a perdut');
}

// CONTRACTE (doctrina LEAN): cap entrenable ocupa un lloc NO entrenable mentres hi haja
// cos disponible; i si no hi ha cos, la plaça queda BUIDA (jugar amb 10), mai un entrenable
// fora del seu entrenament.
{
  const config = { rols: [{ id: 'A', competitiu: 1, nom_clau: 'x' }, { id: 'B', competitiu: 0, nom_clau: 'y' }],
    buckets: { mc: ['MC'], defensa: ['DC'] },
    slots: [{ codi: 'MC1', bucket: 'mc', entrena: true, pct: 100 }, { codi: 'DC1', bucket: 'defensa', entrena: false }] };
  // Amb cos disponible: l'entrenable entrena d'MC, el cos ompli la defensa.
  const ambCos = alinea([
    { jugador_id: 1, nom: 'Entren', posicio: 'MC', categoria: 'entrenable' },
    { jugador_id: 2, nom: 'Cos', posicio: 'DC', categoria: 'farciment' },
  ], config);
  const dcA = ambCos.onze.A.find((s) => s.bucket === 'defensa').jugador;
  assert.equal(dcA?.categoria, 'farciment', 'la defensa (no entrenable) l\'ompli el cos, no l\'entrenable');
  assert.ok(['A', 'B'].every((k) => !ambCos.onze[k].some((s) => s.bucket === 'defensa' && s.jugador?.categoria === 'entrenable')), 'cap entrenable en lloc no entrenable havent-hi cos');
  // SENSE cos: la defensa queda BUIDA (jugar amb 10), l'entrenable NO baixa a cobrir-la.
  const senseCos = alinea([{ jugador_id: 1, nom: 'Entren', posicio: 'MC', categoria: 'entrenable' }], config);
  assert.equal(senseCos.onze.A.find((s) => s.bucket === 'defensa').jugador, null, 'sense cos, la plaça no entrenable queda buida (jugar amb 10)');
  assert.ok(senseCos.avisos.some((v) => v.tipus === 'incomplet'), 'Paco declara la plaça buida, mai silenci');
  assert.ok(['A', 'B'].every((k) => senseCos.onze[k].filter((s) => s.jugador?.jugador_id === 1 && s.bucket === 'defensa').length === 0), 'l\'entrenable no acaba fora del seu entrenament');
}

console.log('OK — alineació: rols A/B, MC 3/3, extrems dobles, experiència fora de la taula, un-sol-partit, Junta, cobertura, lesionat exclòs, cos compatible i contracte LEAN');
