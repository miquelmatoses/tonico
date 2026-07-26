// Tonico — FLUX i ESTOC (contracte v3, PAS 3). El flux decidix quin SOU pots sostindre;
// l'estoc, què pots comprar HUI. La caixa és la DECLARADA: mai un projectat, mai una
// derivada disfressada de saldo real. node test/flux_estoc.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { economia, souSostenible, caixaDisponible } from '../lib/economia.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A'),(2,1,101,'B');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,3000),(1,2,2000);
  INSERT INTO config_usuari (usuari_id, estrategia, divisio, sistema_juvenil) VALUES (1,'competitiva','VII','cap');
`);

// ── Les fórmules pures, aïllades ──
// sou_sostenible = MAX(0; flux + nòmina − reserva_flux)
assert.equal(souSostenible(2000, 5000, 0), 7000, 'el flux ja porta la nòmina restada: se li torna a sumar');
assert.equal(souSostenible(-6000, 5000, 0), 0, 'mai negatiu');
assert.equal(souSostenible(2000, 5000, 1000), 6000, 'la reserva de flux es lleva del sostre');
assert.equal(souSostenible(null, 5000), null, 'sense flux no hi ha sostre (no és 0)');
// caixa_disponible = MAX(0; caixa − reserva_caixa)
assert.equal(caixaDisponible(100000, 20000), 80000);
assert.equal(caixaDisponible(10000, 20000), 0, 'mai negativa');
assert.equal(caixaDisponible(null, 20000), null, 'sense caixa declarada no hi ha estoc');

// ── 1. Sense res declarat: ni flux ni estoc, i es nota (no es fabrica un zero) ──
let e = await economia(db, 1);
assert.equal(e.caixa, null, 'caixa no declarada → null, MAI SUM(transaccions)');
assert.equal(e.caixa_disponible, null);
assert.equal(e.flux, null, 'sense ingressos declarats no hi ha flux');
assert.equal(e.sou_sostenible, null);
assert.equal(e.nomina, 5000, 'la nòmina sí que es deriva dels sous');

// La caixa NO pot vindre dels moviments: encara que n'hi haja, segueix sense declarar.
sqlite.exec("INSERT INTO transaccions (usuari_id, tipus, import, data) VALUES (1,'venda',200000,'2026-07-20');");
e = await economia(db, 1);
assert.equal(e.caixa, null, 'amb moviments però sense declaració: seguix null');

// ── 2. Amb els ingressos com a total heretat: hi ha flux, però es demana el desglossament ──
sqlite.exec("INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_planter, despesa_estadi, ingres_setmanal) VALUES (1,100000,'2026-07-25',2000,3000,20000);");
e = await economia(db, 1);
assert.equal(e.caixa, 100000, 'caixa declarada');
assert.equal(e.caixa_disponible, 100000, 'sense reserva declarada, tota disponible');
assert.equal(e.ingressos_recurrents, 20000);
assert.equal(e.ingressos_desglossats, false, 'total heretat → cal demanar el desglossament');
assert.equal(e.despeses_fixes, 5000 + 2000 + 3000 + 0, 'nòmina + planter + manteniment + personal');
assert.equal(e.flux, 20000 - 10000, 'flux = ingressos − despeses fixes');
assert.equal(e.sou_sostenible, 10000 + 5000, 'flux + nòmina');

// ── 3. Desglossat (taquilla + patrocini + premis) mana sobre el total heretat ──
sqlite.exec("UPDATE finances SET taquilla=12000, patrocini=9000, premis=1000 WHERE usuari_id=1;");
e = await economia(db, 1);
assert.equal(e.ingressos_recurrents, 22000, 'suma dels tres');
assert.equal(e.ingressos_desglossats, true);
assert.equal(e.flux, 12000);

// ── 4. Les reserves són política declarada, no mecànica ──
sqlite.exec("UPDATE plantilles_parametres SET valor='4000' WHERE plantilla='competitiva' AND clau='reserva_flux';");
sqlite.exec("UPDATE plantilles_parametres SET valor='30000' WHERE plantilla='competitiva' AND clau='reserva_caixa';");
e = await economia(db, 1);
assert.equal(e.caixa_disponible, 70000, 'caixa − reserva_caixa');
assert.equal(e.sou_sostenible, 12000 + 5000 - 4000, 'flux + nòmina − reserva_flux');

// ── 5. El personal consumix flux (PAS 11 el llig d'ací) ──
sqlite.exec("INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou) VALUES (1,'especialista','metge',2,2040);");
e = await economia(db, 1);
assert.equal(e.despeses.personal, 2040);
assert.equal(e.flux, 22000 - (5000 + 2000 + 3000 + 2040), 'el personal entra a les despeses fixes');

// ── 6. La divisió ix normalitzada (cap taula pot fallar en silenci) ──
sqlite.exec("UPDATE config_usuari SET divisio='7' WHERE usuari_id=1;");
assert.equal((await economia(db, 1)).divisio, 'VII', 'àrab declarat → romà intern');

console.log('OK — flux i estoc: caixa declarada, flux, sou sostenible i caixa disponible');
