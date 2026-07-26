// Tonico — Àrea A: caixa real declarada, balanç operatiu setmanal i projecció de
// trajectòria fins a la data d'inflexió. node test/economia_trajectoria.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { economia } from '../lib/economia.js';
import { REGLES } from '../lib/regles.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual, parametres) VALUES (1,'fabrica','fabrica','{"temporada_inflexio":88,"capital_objectiu":50000}');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,5000);
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_planter, despesa_estadi, ingres_setmanal) VALUES (1,100000,'2026-07-25',2000,3000,10000);
  INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou, setmanes_contracte) VALUES (1,'especialista','metge',5,1000,2);
`);

const eco = await economia(db, 1);
assert.equal(eco.caixa, 100000, 'la caixa real declarada mana');
assert.equal(eco.caixaReal, true);
assert.equal(eco.despeses.nomina, 5000, 'nòmina des de la instantània');
assert.equal(eco.despeses.personal, 1000, 'cost setmanal del personal');
assert.equal(eco.balanc_setmanal, 10000 - (5000 + 2000 + 3000 + 1000), 'balanç = ingressos − despeses');   // -1000
// Inflexió T88: 5 temporades × 112 dies = 560 dies = 80 setmanes des de l'àncora T83 (2026-07-25).
assert.equal(eco.projeccio.setmanes_fins_inflexio, 80);
assert.equal(eco.projeccio.caixa_projectada, 100000 + (-1000) * 80, 'caixa projectada');   // 20000
assert.equal(eco.projeccio.arriba, false, 'no arriba a l\'objectiu (20000 < 50000)');

// Punt 1c: sense comparables ni vendes reals ni fitxes → to INFORMATIU, no alarmista.
assert.equal(eco.projeccio.sense_dades_venda, true, 'sense negoci apuntat: informatiu');
assert.equal(REGLES.ALR_TRAJECTORIA_INFLEXIO({ economia: eco }, { urgencia: 70 })[0].missatge_clau, 'alerta.trajectoria_informativa');
// Si arriba, no dispara.
assert.equal(REGLES.ALR_TRAJECTORIA_INFLEXIO({ economia: { projeccio: { ...eco.projeccio, arriba: true } } }, { urgencia: 70 }).length, 0);

// v3: el negoci que entra a la projecció són les VENDES actives (les fornades han caigut).
sqlite.exec("INSERT INTO vendes (jugador_id, usuari_id, preu_eixida, estat) VALUES (1,1,200000,'llistat');");
const eco3 = await economia(db, 1);
assert.equal(eco3.projeccio.vendes_previstes, 200000, 'venda activa amb preu d\'eixida');
assert.equal(eco3.projeccio.ingres_estimat, 200000);
assert.equal(eco3.projeccio.caixa_projectada, 100000 + (-1000) * 80 + 200000, 'el negoci entra a la caixa projectada');

assert.equal(eco3.projeccio.sense_dades_venda, false, 'hi ha fitxa de venda → no informatiu');
// L'alerta alarmista declara la seua base (ingressos estimats).
const a3 = REGLES.ALR_TRAJECTORIA_INFLEXIO({ economia: { projeccio: { ...eco3.projeccio, arriba: false } } }, { urgencia: 70 });
assert.equal(a3[0].missatge_clau, 'alerta.trajectoria_inflexio');
assert.equal(a3[0].parametres.ingres, 200000, 'la base declarada = ingressos estimats');

// Caixa derivada quan no hi ha declaració real (fallback a SUM de moviments).
sqlite.exec("DELETE FROM finances; INSERT INTO transaccions (usuari_id, tipus, import, data) VALUES (1,'venda',7000,'2026-07-25');");
const eco2 = await economia(db, 1);
assert.equal(eco2.caixaReal, false);
assert.equal(eco2.caixa, 7000, 'sense declaració: caixa = SUM(transaccions)');

console.log('OK — economia: caixa real, balanç operatiu setmanal i trajectòria fins a la inflexió');
