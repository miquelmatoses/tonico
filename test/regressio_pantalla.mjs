// Tonico — REGRESSIONS DE PANTALLA (regla, no cas):
//  I5 · TOTA categoria mostra la puntuació de la seua clau d'orde — no només les que
//       fallaven. Un rol nou sense puntuació peta ací.
//  I6 · Sense files, no es pinta la taula: cap capçalera òrfena.
// node test/regressio_pantalla.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construeixPlantilla, ROLS } from '../lib/plantilla.js';
import { sobrecost } from '../lib/mancanca.js';

// ── I5: cada categoria té una clau d'orde, i per tant una puntuació ──
const LLOCS = [
  { lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat' },
  { lloc: 'ext1', entrena: true, pct: 50, habilitat: 'extrem' },
  { lloc: 'por', entrena: false, habilitat: 'porteria' },
  { lloc: 'dc1', entrena: false, habilitat: 'defensa' },
];
const j = (id, o) => ({ jugador_id: id, edat_anys: 20, edat_dies: 0, sou: 1000,
  creativitat: 1, extrem: 1, porteria: 1, defensa: 1, anotacio: 1, ...o });
const squad = [
  j(1, { creativitat: 9 }), j(2, { creativitat: 8 }), j(3, { extrem: 7 }),
  j(4, { porteria: 9 }), j(5, { porteria: 6 }), j(6, { defensa: 8 }),
  j(7, { sou: 200 }), j(8, { sou: 250 }),
  j(9, { sou: 9000, defensa: 3 }), j(10, { sou: 8000, creativitat: 2 }),   // sobrants
];
const r = construeixPlantilla(squad, LLOCS, { A: 'creativitat', core_a_min: 0,
  edat_pic_venda: 25, any_dies: 112, partits_setmana: 2, llocs_partit: 8, habilitat_porter: 'porteria' });

// Tots els rols RETINGUTS porten punts: cap excepció, present o futura.
for (const rol of ROLS) {
  const seus = r.retinguts.filter((x) => r.rol[x.jugador_id] === rol);
  for (const x of seus) {
    assert.ok(r.punts[x.jugador_id] != null,
      `el rol «${rol}» ha de portar la puntuació de la seua clau d'orde (jugador ${x.jugador_id})`);
  }
}
// I la VENDA també en té una: la del PAS 7 (sobrecost DESC). És calculable.
const TS = { creativitat: { 1: 250, 2: 270, 3: 330 }, defensa: { 1: 250, 2: 270, 3: 310 } };
for (const x of r.venda) {
  const p = sobrecost(x, 'defensa', 2, TS);
  assert.ok(p != null, `un sobrant ha de tindre puntuació calculable (jugador ${x.jugador_id})`);
}
// Cap jugador es queda fora de les dues llistes: tots tenen categoria i, per tant, clau.
assert.equal(r.retinguts.length + r.venda.length, squad.length);

// ── I6: cap taula amb capçalera i sense files ──
const vista = readFileSync(new URL('../public/seccions.js', import.meta.url), 'utf8');
// Tota capçalera de graella ha d'estar darrere d'una guarda de files, o vindre de l'ajudant
// únic `graellaAmbFiles` (que ja es nega a pintar-la buida).
const linies = vista.split('\n');
const sensGuarda = [];
linies.forEach((l, i) => {
  if (!/graella-cap/.test(l)) return;
  const context = linies.slice(Math.max(0, i - 3), i + 1).join(' ');
  const protegida = /graellaAmbFiles/.test(context) || /\.length\)/.test(context) || /if \(/.test(context);
  if (!protegida) sensGuarda.push(i + 1);
});
assert.deepEqual(sensGuarda, [],
  `capçaleres de taula sense guarda de files (línies ${sensGuarda.join(', ')}): sense dades no es pinta la taula`);
assert.ok(/const graellaAmbFiles = /.test(vista), 'l\'ajudant únic de graella existix');
assert.ok(/if \(!files \|\| !files\.length\) return null;/.test(vista),
  'i es nega a pintar una taula sense files');

console.log('OK — regressions de pantalla: tota categoria amb puntuació, cap taula buida');
