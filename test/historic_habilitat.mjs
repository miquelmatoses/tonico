// Tonico — L'HISTÒRIC D'UNA HABILITAT: la meitat mesurada del «10(6)».
// node test/historic_habilitat.mjs
//
// El «(6)» no és una estimació: és el que el jugador VA TARDAR de veres, llegit de les
// instantànies. I per això només hi és si la pujada va passar mentre es pujava CSV: si el
// primer dia que el veiem ja estava on està, no hi ha res que comptar i no s'inventa.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { historicHabilitat } from '../lib/historic_habilitat.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,101,'Puja'),(2,1,102,'Quiet');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES
    (1,1,'2026-05-01',83,1),(2,1,'2026-05-15',83,3),(3,1,'2026-06-12',83,7),(4,1,'2026-06-26',83,9);
  -- El 1 puja de 6 a 7 entre el 15-05 i el 12-06: quatre setmanes.
  -- El 1: el veiem entrar al 6 (15-05) i al 7 (12-06) → quatre setmanes, mesurades.
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, creativitat) VALUES
    (1,1,5),(2,1,6),(3,1,7),(4,1,7),
    (1,2,8),(2,2,8),(3,2,8),(4,2,8);
`);
const h = await historicHabilitat(db, 1, 'creativitat');

// ── El que va pujar: es mesura ──
const puja = h.get(1);
assert.equal(puja.nivell, 7, 'el nivell d\'ara');
assert.equal(puja.des_de, '2026-06-12', 'i el dia que hi va arribar');
assert.equal(puja.setmanes_anterior, 4, 'quatre setmanes de 6 a 7: mesurat, no estimat');
// I si NOMÉS hem vist l'última pujada, no es mesura: podia portar mesos al nivell anterior
// abans que començàrem a mirar.
{
  sqlite.exec(`INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (4,1,104,'Mig');
    INSERT INTO instantanies_jugadors (instantania_id, jugador_id, creativitat) VALUES
      (1,4,6),(2,4,6),(3,4,7),(4,4,7);`);
  const m = (await historicHabilitat(db, 1, 'creativitat')).get(4);
  assert.equal(m.setmanes_anterior, null, 'un sol canvi vist no mesura un nivell sencer');
  assert.equal(m.des_de, '2026-06-12', 'però sí que sabem quan va arribar on està');
}
assert.equal(puja.setmanes_al_nivell, 2, 'i dues setmanes que el veiem al 7');

// ── El que no ha pujat mai davant nostre: NO s'inventa ──
const quiet = h.get(2);
assert.equal(quiet.nivell, 8);
assert.equal(quiet.setmanes_anterior, null,
  'si el primer dia ja estava on està, no hi ha res que comptar');
assert.equal(quiet.setmanes_al_nivell, 8, 'però sí quant fa que el veiem ahí: vuit setmanes');

// ── I una pujada de DOS nivells de colp no es pot mesurar: no sabem quan va passar la primera.
sqlite.exec(`
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (3,1,103,'Salt');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, creativitat) VALUES
    (1,3,5),(2,3,5),(3,3,7),(4,3,7);
`);
assert.equal((await historicHabilitat(db, 1, 'creativitat')).get(3).setmanes_anterior, null,
  'de 5 a 7 de colp: el nivell 6 no s\'ha vist, o siga que no es pot dir què va costar');

// I amb DOS canvis vistos però el darrer de dos nivells de colp, tampoc: entre les dues
// pujades hi ha un nivell que ningú ha vist, i el temps no es pot repartir.
sqlite.exec(`
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (5,1,105,'Doble');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, creativitat) VALUES
    (1,5,5),(2,5,6),(3,5,8),(4,5,8);
`);
assert.equal((await historicHabilitat(db, 1, 'creativitat')).get(5).setmanes_anterior, null,
  'dos canvis vistos però l\'últim salta dos nivells: no es mesura');

console.log('OK — històric d\'habilitat: el «(6)» es mesura de les instantànies, o no hi és');
