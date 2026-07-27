// Tonico — VELOCITAT D'ENTRENAMENT (fórmula de Schum). node test/entrenament_velocitat.mjs
//
// L'ORACLE NO ÉS EL NOSTRE CODI. Els valors de referència ixen de DUES implementacions
// obertes i independents que Miquel i jo hem contrastat:
//   · Hattrick Organizer (ho-dev/HattrickOrganizer, WeeklyTrainingType.java) — documenta la
//     fórmula sencera i la cita a Schum amb els enllaços al fòrum.
//   · HT-Tools (ventouris/hattricktools, static/js/training.js) — una altra implementació.
// Les dues coincidixen dins de mig setmana en tot el rang, i és eixa coincidència la que fa
// que ens en fiem: una sola implementació seria una opinió.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { velocitat, setmanesFinsAlSegüent, carregaCoeficients } from '../lib/entrenament_velocitat.js';

const { db } = nova(import.meta.url);
const co = await carregaCoeficients(db);
assert.ok(co, 'els coeficients viuen a `constants_joc`, no al codi');

const set = (o) => setmanesFinsAlSegüent(co, { habilitat: 'creativitat', entrenador: 7,
  assistents: 10, intensitat: 100, resistencia: 15, ...o });

// ── 1. Contra la taula d'HT-Tools, cas per cas (17 anys, entrenador sòlid, 2 assistents top).
// Els valors d'HT-Tools per als nivells 5..12: 3,1 · 3,6 · 3,9 · 4,3 · 5,0 · 6,0 · 7,0 · 8,0.
for (const [nivell, altre] of [[5, 3.1], [6, 3.6], [7, 3.9], [8, 4.3], [9, 5.0], [10, 6.0], [11, 7.0], [12, 8.0]]) {
  const nostre = set({ nivell, edat: 17 });
  assert.ok(Math.abs(nostre - altre) <= 0.7,
    `nivell ${nivell}: ${nostre} contra ${altre} de l'altra implementació`);
}

// ── 2. LES DUES CORBES que Miquel volia vore, i cap és un esglaó ──
{
  const perNivell = [5, 8, 11, 14].map((n) => set({ nivell: n, edat: 17 }));
  for (let i = 1; i < perNivell.length; i++) {
    assert.ok(perNivell[i] > perNivell[i - 1], 'cada nivell costa més que l\'anterior');
  }
  const perEdat = [17, 20, 25, 30].map((e) => set({ nivell: 8, edat: e }));
  for (let i = 1; i < perEdat.length; i++) {
    assert.ok(perEdat[i] > perEdat[i - 1], 'i cada any també');
  }
  // I es MULTIPLIQUEN: un de 30 anys al nivell 14 contra un de 17 al 5.
  assert.ok(set({ nivell: 14, edat: 30 }) > 4 * set({ nivell: 5, edat: 17 }),
    'les dues corbes juntes són molt més que cada una');
}

// ── 3. El PERSONAL entra a la fórmula, i pesa el que pesa ──
{
  const solid = set({ nivell: 8, edat: 17, entrenador: 7 });
  const passable = set({ nivell: 8, edat: 17, entrenador: 6 });
  assert.ok(passable > solid, 'un entrenador pitjor va més lent');
  // L'entrenador mou un 8,7% (1/0,92); els assistents, de 0 a 10 nivells, un 35%.
  const senseAss = set({ nivell: 8, edat: 17, assistents: 0 });
  const ambAss = set({ nivell: 8, edat: 17, assistents: 10 });
  assert.ok((senseAss / ambAss) > (passable / solid),
    'els assistents pesen més que l\'entrenador: 1+10×0,035 contra l\'escala d\'entrenadors');
}

// ── 3b. EL SOSTRE D'ASSISTENTS. El joc en deixa dos de nivell 5: deu nivells i para. Sense
// sostre, declarar-ne més donaria una velocitat que el joc no pot donar.
{
  assert.equal(set({ nivell: 8, edat: 17, assistents: 10 }), set({ nivell: 8, edat: 17, assistents: 20 }),
    'per damunt de deu nivells d\'assistent, la velocitat no puja més');
  assert.ok(set({ nivell: 8, edat: 17, assistents: 4 }) > set({ nivell: 8, edat: 17, assistents: 10 }),
    'però per davall sí que compta');
}

// ── 4. RES SENSE FONT. Si falta una entrada, no s'inventa un número ──
assert.equal(velocitat(co, { nivell: 8, edat: 17, habilitat: 'inventada', entrenador: 7 }), null,
  'una habilitat que no és a la taula no té velocitat');
assert.equal(velocitat(co, { nivell: 8, edat: 17, habilitat: 'creativitat', entrenador: null }), null,
  'sense entrenador declarat, tampoc');

// ── 5. El SUB-NIVELL ja acumulat descompta del que queda ──
{
  const sencer = setmanesFinsAlSegüent(co, { nivell: 8, edat: 17, habilitat: 'creativitat',
    entrenador: 7, assistents: 10, intensitat: 100, resistencia: 15 }, 0);
  const mig = setmanesFinsAlSegüent(co, { nivell: 8, edat: 17, habilitat: 'creativitat',
    entrenador: 7, assistents: 10, intensitat: 100, resistencia: 15 }, 0.5);
  assert.ok(Math.abs(mig - sencer / 2) < 0.2, 'a mitjan nivell, li queda la meitat');
}

console.log('OK — velocitat d\'entrenament: la fórmula de Schum, contrastada amb dues implementacions');
