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
import { classificaEquip } from '../lib/orquestra_classificacio.js';
import { economia } from '../lib/economia.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
               VALUES (1,'competitiva','ES','VII','academia',3,2);
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'Benifotrem','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ancora = await carregaAncora(db);
const senior = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

await desar(db, 1, 'senior', modelSenior(senior, '2026-07-18'), ancora);
await classificaEquip(db, 1, 1, 'competitiva');

// ── 1. Sense declarar res: la nòmina ja es DERIVA, però no hi ha flux ni caixa ──
let e = await economia(db, 1, '2026-07-26');
assert.ok(e.nomina > 0, 'la nòmina ix dels sous del CSV, mai declarada');
assert.equal(e.caixa, null, 'la caixa no es deriva de res: es declara o no hi és');
assert.equal(e.flux, null, 'sense ingressos declarats no hi ha flux (i no es fabrica un 0)');
assert.equal(e.planter_derivat, 20000, 'acadèmia + 3 cercapromeses, derivat del PAS 0');

// ── 2. Les QUATRE coses que Miquel declara, i cap més ──
sqlite.exec(`INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi,
               taquilla_s1, patrocini_s1, taquilla_s2, patrocini_s2)
             VALUES (1, 173004, '2026-07-26', 7100, 21127, 40500, 0, 40500);`);
e = await economia(db, 1, '2026-07-26');
assert.equal(e.caixa, 173004, 'mana el saldo real declarat');
assert.equal(e.ingressos_recurrents, 21127 + 40500 + 0 + 40500,
  'els ingressos són la suma de les DOS setmanes declarades');
assert.equal(e.despeses_fixes, (e.nomina + 20000 + 7100 + 0) * e.setmanes_periode,
  'despeses = per_periode(nòmina + planter derivat + manteniment + personal)');
assert.equal(e.flux, e.ingressos_recurrents - e.despeses_fixes);
assert.ok(e.sou_sostenible != null && e.sou_sostenible_setmanal === e.sou_sostenible / 2,
  'i d\'ací ix el sostre de sou, amb l\'ÚNIC canvi d\'unitat del sistema');

// ── 3. La caixa NO pot vindre dels moviments, encara que la taula en tinga ──
// La taula `transaccions` es queda (té apunts vells de Miquel) però ja no la llig ningú.
sqlite.exec("INSERT INTO transaccions (usuari_id, tipus, import, data) VALUES (1,'venda',500000,'2026-07-20');");
sqlite.exec('UPDATE finances SET caixa=NULL WHERE usuari_id=1;');
assert.equal((await economia(db, 1, '2026-07-26')).caixa, null,
  'mig milió apuntat als moviments i la caixa segueix null: la caixa és la declarada');

console.log('OK — economia e2e: CSV → nòmina derivada → quatre xifres declarades → flux');
