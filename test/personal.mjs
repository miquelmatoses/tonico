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

// ── 3. Declarant-ne tres, la quarta segueix eixint com a «contracta» ──
for (const t of ['assistent', 'assistent', 'metge']) {
  await personal.onRequestPost(ctx({ rol: 'especialista', tipus: t, nivell: 2, sou: 2040, data_fi_contracte: '2026-11-04' }));
}
d = await get();
const psic = d.pla_flux.pla.find((x) => x.tipus === 'psicoleg');
assert.equal(psic.accio, 'contracta', 'la plaça lliure és la que es proposa omplir');
assert.ok(d.pla_flux.pla.filter((x) => x.tipus !== 'psicoleg').every((x) => x.accio !== 'contracta'),
  'i les ocupades no es tornen a proposar');

// ── 4. Pujar de nivell NOMÉS al venciment: a mitjan contracte, acomiadar costa 2× l'estalvi ──
assert.ok(!d.pla_flux.pla.some((x) => x.accio === 'puja'),
  'cap «puja» a seques: si toca, és «puja_al_venciment»');

// ── 5. L'alerta de contracte va per la data, derivada ──
assert.equal(REGLES.ALR_CONTRACTE_PERSONAL({ personal: { membres: [
  { tipus: 'metge', setmanes_contracte: 1 }, { tipus: 'assistent', setmanes_contracte: 9 },
] } }, { setmanes_avis: 2, urgencia: 58 }).length, 1, 'només el que venç dins del llindar');

console.log('OK — personal: quota de 4, ordre de prioritat, nivell uniforme i timing de contracte');
