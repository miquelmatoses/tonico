// Tonico — ECONOMIA d'extrem a extrem: CSV real → classificació → nòmina derivada → les
// QUATRE xifres declarades → flux. El que es prova ací i no a flux_estoc.mjs és el CAMÍ
// complet amb un fixture de veres, no inserts sintètics. node test/economia.mjs
//
// El que hi havia abans (signe de moviments, API de transaccions, alerta de transacció
// pendent) ha caigut sencer: amb la caixa DECLARADA i el flux eixint de taquilla+patrocini,
// apuntar moviment a moviment no alimentava cap decisió.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { economia } from '../lib/economia.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
               VALUES (1,'competitiva','ES','VII','academia',3,2);
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Sènior FC','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);

// ── 1. Sense declarar res: la nòmina ja es DERIVA, però no hi ha flux ni caixa ──
let e = await economia(db, 1, '2026-07-26');
assert.ok(e.nomina > 0, 'la nòmina ix dels sous del CSV, mai declarada');
assert.equal(e.caixa, null, 'la caixa no es deriva de res: es declara o no hi és');
assert.equal(e.flux, null, 'sense ingressos declarats no hi ha flux (i no es fabrica un 0)');
assert.equal(e.planter_derivat, 20000, 'acadèmia + 3 cercapromeses, derivat del PAS 0');

// ── 2. Les QUATRE coses que Miquel declara, i cap més ──
sqlite.exec(`INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi)
             VALUES (1, 173004, '2026-07-26', 7100);
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,21127,40500,'2026-07-19','2026-07-26'),(1,83,2,0,40500,'2026-07-26','2026-07-26');`);
e = await economia(db, 1, '2026-07-26');
assert.equal(e.caixa, 173004, 'mana el saldo real declarat');
assert.equal(e.setmanes_declarades, 2, 'l\'històric guarda una fila per SETMANA');
assert.equal(e.calibrat, false, 'amb 2 de 8 setmanes, encara no es fia');
assert.equal(e.ingressos_recurrents, Math.round((21127 + 40500 + 0 + 40500) / 2 * 2),
  'ingressos = mitjana setmanal × setmanes_periode');
assert.equal(e.despeses_fixes, (e.nomina + 20000 + 7100 + 0 + 0) * e.setmanes_periode,
  'despeses = per_periode(nòmina + planter + manteniment + personal + entrenador)');
assert.equal(e.flux, e.ingressos_recurrents - e.despeses_fixes);
assert.ok(e.sou_sostenible != null && e.sou_sostenible_setmanal === e.sou_sostenible / 2,
  'i d\'ací ix el sostre de sou, amb l\'ÚNIC canvi d\'unitat del sistema');

// ── 2b. EL SOU DE L'ENTRENADOR ÉS UN SOU. Faltava a `despeses_fixes` i, com que
// `sou_sostenible` es calcula restant `despeses_fixes − nòmina`, el sostre de sou eixia inflat
// per tot el seu import: amb 5.000 €/setmana deia 15.291 quan eren 10.291. I d'eixe sostre
// pengen els `nivell_objectiu` de TOTS els llocs — l'onze ideal es dissenyava amb un 49% de
// sou que no existia. `flux_repartible` sí que el restava: dues xifres del mateix pas amb
// criteris distints, i eixe desacord és el que el feia invisible.
{
  const abans = await economia(db, 1, '2026-07-26');
  sqlite.exec("INSERT INTO personal_membres (usuari_id, rol, tipus, sou) VALUES (1,'entrenador','entrenador',5000);");
  const ara = await economia(db, 1, '2026-07-26');
  const perPeriode = 5000 * ara.setmanes_periode;
  assert.equal(ara.despeses_fixes, abans.despeses_fixes + perPeriode, 'entra als fixos');
  assert.equal(ara.flux, abans.flux - perPeriode, 'i per tant baixa el flux');
  assert.equal(ara.sou_sostenible, abans.sou_sostenible - perPeriode,
    'i el sostre de sou: cada euro de l\'entrenador és un euro que no pots pagar en jugadors');
  assert.equal(ara.sou_sostenible_setmanal, abans.sou_sostenible_setmanal - 5000,
    'també en setmanal, que és el que consumix el PAS 4');
  // I NO es descompta dues vegades: `flux_repartible` ja el restava pel seu compte.
  assert.equal(ara.flux_repartible_setmanal, abans.flux_repartible_setmanal - 5000,
    'el repartible baixa el mateix, una sola vegada');
  assert.equal(ara.despeses_setmanals.personal, abans.despeses_setmanals.personal,
    'i no es cola dins del personal: l\'entrenador no és especialista');
  sqlite.exec("DELETE FROM personal_membres WHERE rol='entrenador';");
}

// ── 3. La caixa NO pot vindre dels moviments, encara que la taula en tinga ──
// La taula `transaccions` es queda (té apunts vells de Miquel) però ja no la llig ningú.
sqlite.exec("INSERT INTO transaccions (usuari_id, tipus, import, data) VALUES (1,'venda',500000,'2026-07-20');");
sqlite.exec('UPDATE finances SET caixa=NULL WHERE usuari_id=1;');
assert.equal((await economia(db, 1, '2026-07-26')).caixa, null,
  'mig milió apuntat als moviments i la caixa segueix null: la caixa és la declarada');

console.log('OK — economia e2e: CSV → nòmina derivada → quatre xifres declarades → flux');
