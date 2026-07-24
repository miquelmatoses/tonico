// Tonico — capital d'inflexió estimat i desglossat (Polit #3.5): Paco no ho
// pregunta en fred; l'estima des de poms + dades reals. node test/capital.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { estimaCapitalInflexio } from '../lib/capital.js';
import { economia } from '../lib/economia.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
             INSERT INTO plans (usuari_id, plantilla, fase_actual, parametres) VALUES (1,'fabrica','fabrica','{"temporada_inflexio":88}');`);

// Poms de la 019: reconversió 430000, 2 fitxatges, sostre 200000 (sense comparables), 8 setmanes.
// Sense comparables ni nòmina: reconversió + 2×200000 + 0 = 830000.
const e0 = await estimaCapitalInflexio(db, 1, null);
assert.equal(e0.total, 430000 + 2 * 200000, 'estimació base des de poms');
assert.equal(e0.desglossament.find((d) => d.concepte === 'fitxatges').font, 'pom');

// Amb nòmina real (10000/setmana): +8×10000 = +80000.
const e1 = await estimaCapitalInflexio(db, 1, 10000);
assert.equal(e1.total, 830000 + 80000, 'el coixí de sou usa la nòmina real');
assert.equal(e1.desglossament.find((d) => d.concepte === 'coixi_sou').import, 80000);

// Amb comparables de mercat: el sostre passa a la mediana observada, no el pom.
sqlite.exec(`INSERT INTO preus_observats (usuari_id, posicio, edat, habilitat, preu, data) VALUES
  (1,'MC',18,7,100000,'2026-07-18'),(1,'MC',18,7,150000,'2026-07-18'),(1,'MC',18,7,120000,'2026-07-18');`);
const e2 = await estimaCapitalInflexio(db, 1, null);
assert.equal(e2.desglossament.find((d) => d.concepte === 'fitxatges').sostre, 120000, 'sostre = mediana de comparables');
assert.equal(e2.desglossament.find((d) => d.concepte === 'fitxatges').font, 'comparables');
assert.equal(e2.total, 430000 + 2 * 120000, 'total amb comparables');

// economia() usa l'estimació quan NO hi ha capital manual, marcada com a estimada.
const ec = await economia(db, 1);
assert.equal(ec.projeccio.estimat, true, 'projecció marcada com a estimada');
assert.equal(ec.projeccio.objectiu, e2.total, 'objectiu = estimació');
assert.ok(ec.projeccio.desglossament, 'porta el desglossament');

// Si l'usuari fixa el capital manualment, deixa d'estimar-se.
sqlite.prepare(`UPDATE plans SET parametres='{"temporada_inflexio":88,"capital_objectiu":500000}' WHERE usuari_id=1`).run();
const ec2 = await economia(db, 1);
assert.equal(ec2.projeccio.estimat, false, 'amb capital manual, no s\'estima');
assert.equal(ec2.projeccio.objectiu, 500000, 'usa el manual');

console.log('OK — capital d\'inflexió: estimació desglossada (poms + comparables + nòmina), no es pregunta en fred');
