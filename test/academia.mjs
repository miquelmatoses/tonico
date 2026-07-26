// Tonico — Àrea 3: l'acadèmia (equip juvenil) és OPCIONAL. Sense acadèmia, cap
// alerta ni menció juvenil; en activar-la, torna tot el mòdul. node test/academia.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { generaAlertes } from '../lib/orquestra_alertes.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,5000);
`);
const juvAlerts = () => sqlite.prepare("SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.modul='juvenil' AND a.estat IN ('nova','vista')").get().n;

// ── Usuari SENSE acadèmia: cap alerta del mòdul juvenil ──
await generaAlertes(db, 1);
assert.equal(juvAlerts(), 0, 'sense acadèmia: cap alerta juvenil (ni crida ni mínim)');

// ── L'usuari ACTIVA l'acadèmia després (obri el juvenil a HT) ──
sqlite.exec(`
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (2,1,'Fotrem','juvenil');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (2,2,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (2,2,200,'J');
  INSERT INTO instantanies_juvenils (instantania_id, jugador_id, dies_restants_promocio) VALUES (2,2,50);
`);
await generaAlertes(db, 1);
assert.ok(juvAlerts() >= 1, 'amb acadèmia: torna el mòdul juvenil (mínim/crida)');

console.log('OK — acadèmia opcional: sense equip juvenil no hi ha res juvenil; activar-la el torna tot');
