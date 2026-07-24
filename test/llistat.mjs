// Tonico — derivació de l'estat LLISTAT de la columna Transferible: tres transicions
// (apareix, persistix, desapareix). node test/llistat.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { derivaLlistat } from '../lib/llistat.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id,correu,contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id,usuari_id,nom,tipus) VALUES (1,1,'B','senior');
             INSERT INTO jugadors (id,equip_id,id_hattrick,nom) VALUES (1,1,900,'A');`);
const snap = (id, data, transf) => {
  sqlite.prepare('INSERT INTO instantanies (id,equip_id,data) VALUES (?,1,?)').run(id, data);
  sqlite.prepare('INSERT INTO instantanies_jugadors (instantania_id,jugador_id,transferible) VALUES (?,1,?)').run(id, transf);
};
const vendes = () => sqlite.prepare('SELECT * FROM vendes WHERE jugador_id=1').get();

// 1) APAREIX transferible=1 → LLISTAT, data estimada = instantània on apareix.
snap(1, '2026-07-18', 1);
await derivaLlistat(db, 1, '2026-07-18', 1);
assert.equal(vendes().estat, 'llistat', 'apareix transferible → llistat');
assert.equal(vendes().data_llistada, '2026-07-18', 'data de llistada estimada = instantània on apareix el 1');

// 2) PERSISTIX transferible=1 → es queda llistat; la data NO canvia (la primera mana).
snap(2, '2026-07-25', 1);
await derivaLlistat(db, 1, '2026-07-25', 2);
assert.equal(vendes().estat, 'llistat', 'persistix llistat');
assert.equal(vendes().data_llistada, '2026-07-18', 'la data de llistada persistix (no la reescriu cada setmana)');
assert.equal(vendes().resultat_pendent, 0, 'sense pregunta mentres és transferible');

// 3) DESAPAREIX transferible buit, sense venda apuntada → pregunta el resultat.
snap(3, '2026-08-01', null);
await derivaLlistat(db, 1, '2026-08-01', 3);
assert.equal(vendes().resultat_pendent, 1, 'desapareix transferible sense venda → pregunta «deserta o venut?»');
assert.equal(vendes().estat, 'llistat', 'segueix llistat fins que l\'usuari apunte el resultat');

// Editabilitat: si el jugador ja té una fitxa amb data manual, no la reescriu en marcar llistat.
sqlite.exec("INSERT INTO jugadors (id,equip_id,id_hattrick,nom) VALUES (2,1,901,'B')");
sqlite.exec("INSERT INTO vendes (jugador_id,usuari_id,estat,data_llistada) VALUES (2,1,'pendent','2026-06-01')");
sqlite.prepare('INSERT INTO instantanies_jugadors (instantania_id,jugador_id,transferible) VALUES (3,2,1)').run();
await derivaLlistat(db, 1, '2026-08-01', 3);
const v2 = sqlite.prepare('SELECT * FROM vendes WHERE jugador_id=2').get();
assert.equal(v2.estat, 'llistat');
assert.equal(v2.data_llistada, '2026-06-01', 'respecta la data de llistada ja apuntada (editable per l\'usuari)');

console.log('OK — llistat derivat: apareix / persistix / desapareix + data editable');
