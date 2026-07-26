// Tonico — HISTÒRIC ECONÒMIC PER SETMANA (PAS 3) i el STOPPER de calibratge.
// node test/historic_setmanes.mjs
//
// PER QUÈ PER SETMANA. Cada declaració dona «la passada» i «esta»; la setmana següent, la que
// era «esta» es torna a declarar com «la passada». Les declaracions SE SOLAPEN. Guardant
// períodes, cada setmana comptaria dues vegades i la mitjana eixiria trucada. Este test fixa
// que el solapament és una ACTUALITZACIÓ i no una duplicació.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as fin from '../functions/api/finances.js';
import { economia, mitjanaSetmanal, calibrat } from '../lib/economia.js';
import { motiuVenda } from '../lib/vendes.js';

// ── Les fórmules pures ──
const setm = (n) => Array.from({ length: n }, () => ({ taquilla: 10000, patrocini: 40000 }));
assert.equal(mitjanaSetmanal(setm(4), 8), 50000, 'mitjana de taquilla + patrocini');
assert.equal(mitjanaSetmanal([], 8), null, 'sense cap setmana no s\'inventa un zero');
assert.equal(mitjanaSetmanal([{ taquilla: 0, patrocini: 40000 }, { taquilla: 20000, patrocini: 40000 }], 8),
  50000, 'una setmana sense taquilla NO es descarta: compta com a 0 i baixa la mitjana');
// Només es miren les N més recents, i venen ordenades del més recent al més antic.
assert.equal(mitjanaSetmanal([...setm(2), { taquilla: 999999, patrocini: 0 }], 2), 50000,
  'una setmana vella fora de la finestra no hi entra');
assert.equal(calibrat(setm(7), 8), false);
assert.equal(calibrat(setm(8), 8), true);

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',1,2);
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-26',83,2);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'X');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,5000);
`);
const post = (cos) => fin.onRequestPost({ request: new Request('http://t', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify(cos) }),
  env: { DB: db }, data: { usuari: { id: 1 } } });
const files = () => sqlite.prepare('SELECT COUNT(*) n FROM setmanes_economiques').get().n;

// ── 1. Declarar dues setmanes crea dues files, amb la identitat derivada del CALENDARI ──
await post({ caixa: 173004, despesa_estadi: 7100, setmanes: [
  { data: '2026-07-19', taquilla: 21127, patrocini: 40500 },
  { data: '2026-07-26', taquilla: 0, patrocini: 40500 }] });
assert.equal(files(), 2, 'una fila per setmana');
assert.ok(sqlite.prepare('SELECT COUNT(*) n FROM setmanes_economiques WHERE temporada IS NULL').get().n === 0,
  'cap setmana sense identitat: la data la resol el calendari, no es demana');

// ── 2. EL SOLAPAMENT. La setmana següent, «esta» es torna a declarar com «la passada» ──
await post({ setmanes: [
  { data: '2026-07-26', taquilla: 19000, patrocini: 40500 },   // la mateixa, amb el valor bo
  { data: '2026-08-02', taquilla: 22000, patrocini: 40500 }] });
assert.equal(files(), 3, 'la repetida s\'ACTUALITZA i només se n\'afig una de nova');
const repetida = sqlite.prepare("SELECT taquilla FROM setmanes_economiques WHERE data='2026-07-26'").get();
assert.equal(repetida.taquilla, 19000, 'i es queda amb el valor de l\'última declaració');

// ── 3. La mitjana surt de l'històric, i mentre no hi haja prou setmanes NO es calibra ──
let e = await economia(db, 1, '2026-08-02');
assert.equal(e.setmanes_declarades, 3);
assert.equal(e.calibrat, false, '3 de 8: encara no');
assert.equal(e.ingressos_recurrents, Math.round(e.mitjana_setmanal * e.setmanes_periode));

// ── 4. EL STOPPER: sense calibrar, ningú se'n va pel sou ──
assert.equal(motiuVenda({}, { sobrecost: 99999, calibrat: e.calibrat }), null,
  'amb el flux sense calibrar, el sou no desfà de ningú');
assert.equal(motiuVenda({}, { enVenda: true, calibrat: e.calibrat }), 'sobrant',
  'però el sobrant, que va per estructura, seguix eixint');

// ── 5. Amb 8 setmanes, calibra i el stopper s'aixeca ──
for (let i = 3; i < 8; i++) {
  const d = new Date(Date.parse('2026-08-02') + (i - 2) * 7 * 86400000).toISOString().slice(0, 10);
  await post({ setmanes: [{ data: d, taquilla: 20000, patrocini: 40500 }] });
}
e = await economia(db, 1, '2026-09-20');
assert.equal(e.setmanes_declarades, 8);
assert.equal(e.calibrat, true, 'amb 8 setmanes ja es fia');
assert.equal(motiuVenda({}, { sobrecost: 99999, calibrat: e.calibrat }), 'sou_desproporcionat',
  'i llavors sí que pot proposar traure el sobrepagat');

console.log('OK — històric per setmana: el solapament actualitza, i el stopper s\'aixeca als 8');
