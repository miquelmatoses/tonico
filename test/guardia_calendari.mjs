// Tonico — G5 · EL RELLOTGE ÉS EL CALENDARI, NO LA PUJADA.
//
// Dos forats de la mateixa arrel:
//
//  (a) L'àncora era 2026-07-25, que és DISSABTE. Tota la graella de setmanes penja d'ella
//      —`calcularSetmana` compta dies des de l'àncora i els partix per set—, o siga que amb
//      l'àncora en dissabte TOTES les vores de setmana quedaven sis dies desplaçades. No hi
//      havia res que ho vigilara: que caiguera en el dia bo era una coincidència.
//
//  (b) «En quina setmana estem» eixia de la INSTANTÀNIA: de la data del fitxer que Miquel
//      havia pujat. Dos setmanes sense pujar res i el fitxer seguia dient el mateix mentre el
//      món no. El pla, la capçalera i la finestra de mercat es quedaven parats amb ell.
//
// node test/guardia_calendari.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { setmanaDeHui, carregaAncora, calcularSetmana } from '../lib/calendari.js';
import { modelSenior } from '../lib/adaptador.js';
import { desar } from '../functions/api/pujar.js';
import { estatPla } from '../lib/pla.js';
import * as finances from '../functions/api/finances.js';

const { sqlite, db } = nova(import.meta.url);
const cj = (k) => sqlite.prepare('SELECT valor FROM constants_joc WHERE clau=?').get(k)?.valor;

// ── (a) L'ÀNCORA CAU EN EL DIA DECLARAT ──────────────────────────────────────────────────
const ancora = await carregaAncora(db);
const primerDia = Number(cj('setmana_primer_dia'));
const DIES = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
const diaAncora = new Date(`${ancora.data}T00:00:00Z`).getUTCDay();
assert.equal(diaAncora, primerDia,
  `l'àncora (${ancora.data}) cau en ${DIES[diaAncora]} i la setmana comença en ${DIES[primerDia]}:`
  + ' totes les vores de setmana queden desplaçades');
// I les vores que en ixen també: cada canvi de setmana ha de caure en eixe dia.
for (const salt of [0, 7, 70, 112, 119]) {
  const d = new Date(Date.parse(ancora.data) + salt * 86400000);
  assert.equal(d.getUTCDay(), primerDia, `la vora a +${salt} dies ha de ser ${DIES[primerDia]}`);
  assert.equal(calcularSetmana(d.toISOString().slice(0, 10), ancora).setmana,
    Math.floor((salt % ancora.anyDies) / 7) + 1, `i ${salt} dies després de l'àncora és eixa setmana`);
}

// ── (b) EL FITXER NO MOU EL CALENDARI ────────────────────────────────────────────────────
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','academia',2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'S','senior');
`);
const files = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
// La instantània es queda TRES SETMANES ENRERE respecte de «hui».
const HUI = '2026-08-09';
const DATA_FITXER = '2026-07-19';
await desar(db, 1, 'senior', modelSenior(files, DATA_FITXER), ancora);

const inst = sqlite.prepare('SELECT temporada, setmana_temporada FROM instantanies ORDER BY id DESC LIMIT 1').get();
assert.equal(inst.setmana_temporada, calcularSetmana(DATA_FITXER, ancora).setmana,
  'la instantània es queda amb la setmana del seu fitxer: això SÍ que és del fitxer');

const ara = await setmanaDeHui(db, HUI);
assert.equal(ara.setmana, calcularSetmana(HUI, ancora).setmana, 'i «on som» ix de HUI');
assert.notEqual(ara.setmana, inst.setmana_temporada,
  'el fixture ha de separar les dues setmanes: si coincidixen, açò no prova res');

const pla = await estatPla(db, 1, HUI);
assert.equal(pla.setmanaActual, ara.setmana,
  `el pla diu la setmana ${pla.setmanaActual} i el calendari la ${ara.setmana}: està llegint el fitxer`);
assert.equal(pla.temporadaActual, ara.temporada, 'i la temporada, igual');

// ── (c) UNA SETMANA ECONÒMICA NO ES POT DESDOBLAR ────────────────────────────────────────
// La identitat d'una setmana és (temporada, setmana) DERIVADA de la seua data. En moure
// l'àncora, la mateixa data real cau en una setmana distinta: les files ja escrites es queden
// amb la numeració vella i redeclarar-les n'escriu una de NOVA. Tres files per a dues setmanes,
// amb els mateixos diners comptats dos voltes — i d'eixa mitjana penja `sou_sostenible`, i d'ell
// TOTS els nivells objectiu.
{
  const declara = (setmanes) => finances.onRequestPost({
    request: new Request('http://x', { method: 'POST', body: JSON.stringify({ setmanes }) }),
    env: { DB: db }, data: { usuari: { id: 1 } } });
  // DATES DE MIG DE SETMANA, que és com es declara de veres: l'informe es mira el dia que es
  // mira. La vora la posa el calendari, no el dia que t'assegues a declarar.
  const SETMANES = [{ data: '2026-07-22', taquilla: 90000, patrocini: 40000 },
    { data: '2026-07-29', taquilla: 0, patrocini: 40000 }];
  await declara(SETMANES);
  // I la mateixa setmana declarada un altre dia NO pot obrir una fila nova.
  await declara([{ data: '2026-07-24', taquilla: 90000, patrocini: 40000 },
    { data: '2026-07-31', taquilla: 0, patrocini: 40000 }]);
  const files = sqlite.prepare('SELECT temporada, setmana, data, taquilla FROM setmanes_economiques ORDER BY temporada, setmana').all();
  assert.equal(files.length, SETMANES.length,
    `${SETMANES.length} setmanes reals declarades i ${files.length} files: s'han desdoblat`);
  // I cap fila pot portar una data que contradiga la seua clau.
  for (const f of files) {
    const c = calcularSetmana(f.data, ancora);
    assert.equal(f.setmana, c.setmana, `la fila T${f.temporada} s${f.setmana} porta la data ${f.data}, que és la setmana ${c.setmana}`);
    assert.equal(new Date(`${f.data}T00:00:00Z`).getUTCDay(), primerDia,
      `i la data d'una setmana és la seua VORA: ${f.data} no és ${DIES[primerDia]}`);
  }
}

console.log(`OK — G5: l'àncora cau en ${DIES[primerDia]}, i el rellotge el mou el calendari`
  + ` (hui ${HUI} → T${ara.temporada} s${ara.setmana}) i no el fitxer (s${inst.setmana_temporada})`);
