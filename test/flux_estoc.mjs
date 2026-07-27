// Tonico — FLUX i ESTOC (contracte v3.1, PAS 3). El flux decidix quin SOU pots sostindre;
// l'estoc, què pots comprar HUI. La caixa és la DECLARADA: mai un projectat, mai una
// derivada disfressada de saldo real.
//
// EL PERÍODE ÉS BI-SETMANAL i es declaren les DOS setmanes literals: els ingressos són la seua
// suma, i les despeses (constants setmanals) es multipliquen per `setmanes_periode`.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { economia, souSostenible, perPeriode, reservaFlux,
  despesaPlanter, dadesVelles } from '../lib/economia.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A'),(2,1,101,'B');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,3000),(1,2,2000);
  INSERT INTO config_usuari (usuari_id, estrategia, divisio, sistema_juvenil, n_cercapromeses)
    VALUES (1,'competitiva','VII','cap',1);
`);

// ── Les fórmules pures, aïllades ──
assert.equal(perPeriode(7100, 2), 14200, 'tot import setmanal es normalitza al període');
assert.equal(perPeriode(null, 2), null);

// reserva_flux = pct × ingressos (v3.1: FRACCIÓ, no import absolut)
assert.equal(reservaFlux(100000, 0.05), 5000);
assert.equal(reservaFlux(null, 0.05), null, 'sense ingressos no hi ha reserva calculable');

// sou_sostenible = MAX(0; ingressos − reserva − (despeses_fixes − nòmina))
assert.equal(souSostenible(100000, 80000, 30000, 5000), 45000,
  '95.000 disponibles − 50.000 d\'altres despeses = 45.000 per a sous');
assert.equal(souSostenible(100000, 200000, 30000, 5000), 0, 'mai negatiu');
assert.equal(souSostenible(null, 80000, 30000, 5000), null, 'sense ingressos no hi ha sostre (no és 0)');

// PROPIETAT: més ingressos, mai menys sostre (monotonia).
let previ = -1;
for (const ing of [50000, 80000, 120000, 200000]) {
  const s = souSostenible(ing, 60000, 20000, reservaFlux(ing, 0.05));
  assert.ok(s >= previ, 'monotonia: més ingressos no pot donar menys sostre');
  previ = s;
}

// despesa_planter: es DERIVA. Les instal·lacions només amb acadèmia; els cercapromeses en
// QUALSEVOL mode (1..3), perquè el mode diu si es criden, no quants n'hi ha.
const COSTOS = { cost_instalacions: 5000, cost_cercapromeses: 5000 };
assert.equal(despesaPlanter('academia', 3, COSTOS), 20000, 'el fixture real de Sènior FC');
assert.equal(despesaPlanter('cercapromeses', 3, COSTOS), 15000, 'sense acadèmia, no es paguen instal·lacions');
assert.equal(despesaPlanter('cap', 1, COSTOS), 5000,
  '«cap» NO vol dir cost zero: el cercapromeses hi és i es paga igual');

// La caixa NO té derivada: el PAS 8 compara contra la declarada (fora `caixa_disponible`).

// dades_velles: vella ≠ absent ≠ zero (invariant 18). El llindar va en DIES: 7.
assert.equal(dadesVelles('2026-07-18', '2026-07-26', 7), true, '8 dies: vella');
assert.equal(dadesVelles('2026-07-19', '2026-07-26', 7), false, '7 dies justos: encara no');
assert.equal(dadesVelles(null, '2026-07-26', 7), false, 'sense declarar no és «vell»: falta');

// ── 1. Sense res declarat: ni flux ni estoc, i es nota (no es fabrica un zero) ──
let e = await economia(db, 1, '2026-07-26');
assert.equal(e.caixa, null, 'caixa no declarada → null: no se n\'inventa cap');
assert.equal(e.caixa, null);
assert.equal(e.flux, null, 'sense ingressos declarats no hi ha flux');
assert.equal(e.sou_sostenible, null);
assert.equal(e.sou_sostenible_setmanal, null);
assert.equal(e.nomina, 5000, 'la nòmina sí que es deriva dels sous (setmanal)');
assert.equal(e.setmanes_periode, 2, 'el període ve del pom');
assert.equal(e.planter_derivat, 5000, 'mode «cap» amb 1 cercapromeses: 5.000 €/setmana');

// No hi ha cap segona font d'on la caixa puga eixir: la taula de moviments ja no existix (095).
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='transaccions'").get().n, 0);

// ── 2. Ingressos BI-SETMANALS declarats del període tancat ──

// Les DOS setmanes, literals, com a l'informe: setmana passada (taquilla 21.127 + patrocini
// 40.500) i esta setmana (taquilla 0 perquè el partit era fora + patrocini 40.500).
sqlite.exec(`INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi)
             VALUES (1,173004,'2026-07-26',7100);
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,21127,40500,'2026-07-19','2026-07-26'),(1,83,2,0,40500,'2026-07-26','2026-07-26');`);
e = await economia(db, 1, '2026-07-26');
assert.equal(e.caixa, 173004, 'la caixa són els «Diners disponibles»');
assert.equal(e.ingressos_recurrents, Math.round((21127 + 40500 + 0 + 40500) / 2 * 2),
  'mitjana de les setmanes declarades × període');
assert.equal(e.despeses.nomina, 5000 * 2, 'la nòmina és setmanal → × 2');
assert.equal(e.despeses.manteniment_estadi, 7100 * 2, 'el manteniment és constant setmanal → × 2');
assert.equal(e.despeses.planter, 5000 * 2);
assert.equal(e.flux, e.ingressos_recurrents - e.despeses_fixes);

// El sostre setmanal és el del període dividit pel període: l'ÚNIC canvi d'unitat.
assert.equal(e.sou_sostenible_setmanal, e.sou_sostenible / 2,
  'la conversió a setmanal la fa l\'economia, no cada consumidor');

// ── 3. La reserva del 5% mossega el sostre, i no la caixa ──
sqlite.exec("UPDATE plantilles_parametres SET valor='0.05' WHERE plantilla='competitiva' AND clau='reserva_flux_pct';");
e = await economia(db, 1, '2026-07-26');
assert.equal(e.reserva_flux, Math.round(e.ingressos_recurrents * 0.05),
  'la reserva és un 5% dels ingressos, no un import fix');
assert.equal(e.sou_sostenible,
  Math.max(0, e.ingressos_recurrents - e.reserva_flux - (e.despeses_fixes - e.despeses.nomina)));

// ── 4. Res que no siga taquilla o patrocini pot moure el sostre de sou ──
const abans = e.ingressos_recurrents;
// Una setmana amb una xifra que NO és ni taquilla ni patrocini no pot moure el sostre: només
// entren eixos dos camps a l'històric.
sqlite.exec("UPDATE finances SET caixa=caixa+99999 WHERE usuari_id=1;");
e = await economia(db, 1, '2026-07-26');
assert.equal(e.ingressos_recurrents, abans,
  'res de fora de l\'històric mou el sostre de sou');

// ── 5. El personal consumix flux (PAS 11 el llig d'ací), també normalitzat ──
sqlite.exec("INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou) VALUES (1,'especialista','metge',2,2040);");
e = await economia(db, 1, '2026-07-26');
assert.equal(e.despeses.personal, 2040 * 2, 'el personal és setmanal → × 2');

// ── 6. El planter es deriva del mode i del nombre de cercapromeses ──
sqlite.exec("UPDATE config_usuari SET sistema_juvenil='academia', n_cercapromeses=3 WHERE usuari_id=1;");
e = await economia(db, 1, '2026-07-26');
assert.equal(e.planter_derivat, 20000, 'acadèmia + 3 cercapromeses = el fixture real');
assert.equal(e.despeses.planter, 40000, 'i entra al període doblat');

// ── 7. Dades velles: es diu, no es calla (la frescor la data `caixa_data`) ──
sqlite.exec("UPDATE finances SET caixa_data='2026-07-18' WHERE usuari_id=1;");
assert.equal((await economia(db, 1, '2026-07-26')).dades_velles, true, '8 dies sense declarar');
assert.equal((await economia(db, 1, '2026-07-25')).dades_velles, false, 'a 7 dies encara calla');

// ── 8. La divisió ix normalitzada (cap taula pot fallar en silenci) ──
sqlite.exec("UPDATE config_usuari SET divisio='7' WHERE usuari_id=1;");
assert.equal((await economia(db, 1, '2026-07-26')).divisio, 'VII', 'àrab declarat → romà intern');

console.log('OK — flux i estoc v3.1: període bi-setmanal, reserva del 5% i planter derivat');
