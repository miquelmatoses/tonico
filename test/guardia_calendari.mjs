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

console.log(`OK — G5: l'àncora cau en ${DIES[primerDia]}, i el rellotge el mou el calendari`
  + ` (hui ${HUI} → T${ara.temporada} s${ara.setmana}) i no el fitxer (s${inst.setmana_temporada})`);
