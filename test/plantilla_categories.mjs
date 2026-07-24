// Tonico — polit #7.1: la derivació al vol aplica LA FÓRMULA DE LA CATEGORIA de
// cada jugador, no una de fixa. Test per a CADA categoria. node test/plantilla_categories.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as plantilla from '../functions/api/plantilla.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'fabrica','fabrica');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
`);
// Un jugador per categoria, amb habilitats/experiència/edat conegudes i puntuació DESADA null.
const jug = (id, nom, cat, f) => {
  sqlite.prepare('INSERT INTO jugadors (id,equip_id,id_hattrick,nom,especialitat) VALUES (?,?,?,?,?)').run(id, 1, 100 + id, nom, f.especialitat || null);
  sqlite.prepare(`INSERT INTO instantanies_jugadors (instantania_id,jugador_id,edat_anys,creativitat,defensa,passades,pilota_aturada,extrem,anotacio,porteria,experiencia,lideratge,lleialtat,qualificacio_ultim_partit,sou)
    VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, f.edat, f.cre || 0, f.def || 0, f.pas || 0, f.pp || 0, f.ext || 0, f.ano || 0, f.por || 0, f.exp || 0, f.lid || 0, f.lle || 0, f.qual || 0, f.sou || 0);
  sqlite.prepare("INSERT INTO categories_jugador (jugador_id,categoria,origen,puntuacio) VALUES (?,?,'auto',NULL)").run(id, cat);
};
// FuturCoach real (futur_entrenador): exp 12 + lid 4 = 16 (NO venda, que amb edat 29 seria negatiu-baix).
jug(1, 'FuturCoach', 'futur_entrenador', { edat: 29, exp: 12, lid: 4, cre: 2, def: 3, pas: 4, pp: 3 });
jug(2, 'Entren', 'entrenable', { edat: 20, cre: 7, exp: 2 });               // creativitat·1 + (20−20)·0.5 = 7
jug(3, 'Balag', 'venda', { edat: 21, cre: 6, def: 5, pas: 5, pp: 5, ext: 4, ano: 2, por: 1, lle: 20, qual: 3.5 }); // 17.7
jug(4, 'Farci', 'farciment', { edat: 26, def: 6, por: 4, sou: 1000 });       // inversa (negatiu)

const r = await (await plantilla.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
const punt = (nom) => Math.round(r.jugadors.find((j) => j.nom === nom).puntuacio * 100) / 100;

// CADA categoria amb la SEUA fórmula:
assert.equal(punt('FuturCoach'), 16, 'futur_entrenador = experiència + lideratge (12+4), NO venda');
assert.equal(punt('Entren'), 7, 'entrenable = creativitat + marge d\'edat');
assert.equal(punt('Balag'), 17.7, 'venda = fórmula completa (17.7)');
assert.ok(punt('Farci') < 0, `farciment = puntuació INVERSA (negativa): ${punt('Farci')}`);

// Prova de no-regressió: el valor de futur_entrenador NO coincidix amb el que donaria venda.
const vendaSalva = 4 * 2 + 0 + (25 - 29) * 1;   // habilitat_max(4)·2 + edat = 4 (ben lluny de 16)
assert.notEqual(punt('FuturCoach'), vendaSalva, 'futur_entrenador no usa la fórmula de venda');

console.log('OK — plantilla: cada categoria deriva amb LA SEUA fórmula (futur_entrenador 16 = exp+lideratge)');
