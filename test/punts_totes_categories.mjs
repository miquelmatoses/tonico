// Tonico — REGRESSIÓ (3a aparició del bug de punts buits): CAP jugador pot quedar-se
// sense puntuació, siga quina siga la seua categoria, i molt especialment després d'una
// RECATEGORITZACIÓ (desplaçats a venda/alliberament amb el valor desat ranci o null).
// La vara: tota categoria de la config ha de portar spec de `puntuacio`.
// node test/punts_totes_categories.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { carregaConfigPla } from '../lib/config_pla.js';
import { avaluaPuntuacio } from '../lib/classificador.js';

const { sqlite, db } = nova(import.meta.url);
const config = await carregaConfigPla(db, 'fabrica');

// 1) INVARIANT DE CONFIG: cap categoria sense vara de mesurar. Este és l'arrel del bug:
//    sense spec, el derivador torna null i la fila cau al valor desat (null) → cel·la buida.
const sensePuntuacio = config.categories.filter((c) => !c.parametres?.puntuacio).map((c) => c.categoria);
assert.deepEqual(sensePuntuacio, [], `categories sense spec de puntuació (cel·la buida garantida): ${sensePuntuacio}`);

// 2) DERIVACIÓ REAL: un jugador sintètic puntua a TOTES les categories, també a les
//    terminals. Cap `null`, cap `undefined`, cap NaN.
const jugador = {
  id_hattrick: 1, nom: 'Sintetic', posicio: 'DC',
  porteria: 3, defensa: 6, creativitat: 4, extrem: 2, passades: 5, anotacio: 3, pilota_aturada: 2,
  edat_anys: 24, sou: 4000, lleialtat: 12, qualificacio_ultim_partit: 4.5, experiencia: 7, lideratge: 5,
};
for (const c of config.categories) {
  const p = avaluaPuntuacio(c.parametres.puntuacio, jugador, config.params);
  assert.ok(p != null && Number.isFinite(p), `la categoria ${c.categoria} no deriva puntuació: ${p}`);
}

// 3) RECATEGORITZACIÓ: el valor DESAT és null (cas ranci real dels auto-assignats) però
//    la fila ha de mostrar la puntuació DERIVADA de la instantània, no la cel·la buida.
//    Es prova per a TOTA categoria, no només per a les del nucli.
const specCat = new Map(config.categories.map((c) => [c.categoria, c.parametres?.puntuacio]));
for (const c of config.categories) {
  const desat = null;                                            // el que hi ha a categories_jugador
  const spec = specCat.get(c.categoria);
  const derivada = spec ? avaluaPuntuacio(spec, jugador, config.params) : null;
  const mostrada = derivada != null ? derivada : desat;          // mateixa regla que l'API
  assert.ok(mostrada != null, `recategoritzat a ${c.categoria} amb valor desat null → cel·la buida`);
}

console.log(`OK — punts a TOTES les categories (${config.categories.length}), també les terminals i els recategoritzats`);
