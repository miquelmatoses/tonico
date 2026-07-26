// Tonico — PERSONAL via API (contracte v3.1, PAS 11). node test/personal.mjs
//
// El que hi havia abans —`comparaPersonal`, `checklistCanviFase` i els «desquadres» contra el
// personal esperat per FASE— era del model fàbrica: `fases_config` tenia les fases
// `fabrica`/`inflexio`/`competitiu`, la fase real no lligava amb cap, i els checklists encara
// servien el paquet d'inflexió («FuturCoach → entrenador, 430.000 €»). Qui diu ara què falta
// és el pla de flux, amb la quota del joc i el pressupost.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { REGLES } from '../lib/regles.js';
import * as personal from '../functions/api/personal.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
    VALUES (1,'competitiva','ES','VII','academia',3,2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-26',83,2);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'X');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,11800);
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi) VALUES (1,173004,'2026-07-26',7100);
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,0,21127,40500,'2026-07-19','2026-07-26'),(1,83,1,0,40500,'2026-07-26','2026-07-26');
`);
const ctx = (body) => ({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });
const get = () => personal.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } }).then((r) => r.json());

// ── 1. Sense res declarat: el pla proposa CONTRACTAR les 4 places de la quota ──
let d = await get();
assert.equal(d.pla_flux.places, 4, 'la quota del joc: 4 especialistes');
assert.deepEqual(d.pla_flux.pla.map((x) => x.tipus), ['assistent', 'assistent', 'metge', 'psicoleg'],
  'per l\'orde de prioritat, i el psicòleg entra (la regla de divisió no era de la guia)');
assert.ok(d.pla_flux.pla.every((x) => x.accio === 'contracta'), 'totes lliures → contractar');
const nivells = new Set(d.pla_flux.pla.map((x) => x.nivell));
assert.equal(nivells.size, 1, 'i totes al mateix nivell: amplada abans que profunditat');

// ── 2. L'entrenador NO gasta plaça (guia: no és especialista) ──
await personal.onRequestPost(ctx({ rol: 'entrenador', tipus: 'entrenador', sou: 5000 }));
d = await get();
assert.equal(d.pla_flux.places, 4, 'l\'entrenador no consumix cap de les 4 places');
assert.ok(!d.pla_flux.pla.some((x) => x.tipus === 'entrenador'), 'ni apareix al pla de personal');
// NI COM A «FORA DEL PLA». Els declarats que no casen amb cap plaça es pinten igual, i
// l'entrenador hi queia: una píndola amb el nivell buit, sense contracte i sense acció, perquè
// no cobra per esta escala ni té contracte de 16 setmanes. No és personal: va a Entrenament.
assert.ok(!(d.pla_flux.membres_fora || []).some((x) => x.tipus === 'entrenador'),
  'l\'entrenador no és personal, ni tan sols com a sobrant del pla');

// ── 3. Declarant-ne tres, la quarta segueix eixint com a «contracta» ──
for (const t of ['assistent', 'assistent', 'metge']) {
  await personal.onRequestPost(ctx({ rol: 'especialista', tipus: t, nivell: 2, sou: 2040, data_fi_contracte: '2026-11-04' }));
}
d = await get();
const psic = d.pla_flux.pla.find((x) => x.tipus === 'psicoleg');
assert.equal(psic.accio, 'contracta', 'la plaça lliure és la que es proposa omplir');
assert.ok(d.pla_flux.pla.filter((x) => x.tipus !== 'psicoleg').every((x) => x.accio !== 'contracta'),
  'i les ocupades no es tornen a proposar');

// ── 4. Fora del venciment NO hi ha acció. Pujar a mitjan contracte és acomiadar, i acomiadar
// costa 2× l'estalvi: una plaça ocupada i lluny del venciment no té cap acció possible, i
// dir-ne una era proposar-li a Miquel una cosa que eixe dia no podia fer.
assert.ok(d.pla_flux.pla.filter((x) => x.membre_id != null && !x.venciment).every((x) => x.accio === 'res'),
  'ocupada i lluny del venciment → cap acció');

// ── 5. L'alerta de contracte va per la data, derivada, i en DIES: el pom sempre ha sigut de
// dies i es comparava contra setmanes, així que la frontera no volia dir res.
assert.equal(REGLES.ALR_CONTRACTE_PERSONAL({ personal: { membres: [
  { tipus: 'metge', dies_contracte: 9 }, { tipus: 'assistent', dies_contracte: 40 },
] } }, { dies_avis: 15, urgencia: 58 }).length, 1, 'només el que venç dins del llindar');
assert.equal(REGLES.ALR_CONTRACTE_PERSONAL({ personal: { membres: [
  { tipus: 'metge', dies_contracte: -3 },
] } }, { dies_avis: 15, urgencia: 58 }).length, 0, 'ja caducat no és un avís de venciment');

// ── 6. EL PRESSUPOST ES POT SEGUIR AMB ELS DITS. La pantalla deia «6 564 € (0% del flux
// repartible) · en queden 2 484 €»: el 0% era `percent()` arrodonint 0,40 a zero, i «en
// queden» no deia de què. Ara la quota va en base 100 i la resta quadra amb el repartible.
{
  const p = d.pla_flux;
  assert.equal(p.quota_pct, 40, 'la quota es dona en base 100: la vista no pot multiplicar');
  assert.ok(p.flux_repartible_setmanal > 0, 'el repartible es diu, que és d\'on ix el pressupost');
  assert.equal(Math.round(p.pressupost),
    Math.min(Math.round(p.flux_repartible_setmanal * p.quota), p.sostre),
    'el pressupost és la quota del repartible, acotada pel sostre');
  assert.equal(Math.round(p.gastat + p.flux_restant), Math.round(p.pressupost),
    'el que es gasta més el que sobra és el pressupost: la frase quadra');
}

// ── 7. EL NIVELL QUE ES MOSTRA ÉS EL DECLARAT. Es llegia «tens personal de nivell 1» quan el
// declarat és 2 i l'1 era el que el flux sosté: dues coses distintes amb el mateix nom.
{
  const met = d.pla_flux.pla.find((x) => x.tipus === 'metge');
  assert.equal(met.nivell_declarat, 2, 'el declarat es diu tal qual');
  assert.equal(met.sou_declarat, 2040, 'i el sou que cobra de veres, no el del pla');
  assert.ok(met.dies_contracte > 0, 'i els dies que li queden, derivats de la data');
}

console.log('OK — personal: quota de 4, ordre de prioritat, nivell uniforme i timing de contracte');
