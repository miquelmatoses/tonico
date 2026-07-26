// Tonico — CONFIG (contracte v3, V i PAS 0): l'única entrada d'usuari inicial.
// USER-AGNOSTIC: cap valor per defecte inventat; el que no es declara es DEMANA.
// node test/config.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { llegixConfig, desaConfig, falten, llocsPartit, ESTRATEGIES } from '../lib/config.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec("INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'u@t','x');");

// 1. Un usuari nou no té config: TOT el PAS 0 es demana, res se suposa.
assert.equal(await llegixConfig(db, 1), null, 'usuari nou → sense config');
assert.deepEqual(falten(null), ['estrategia', 'pais', 'divisio', 'partits_setmana']);

// 2. L'estratègia és la del v3; «fàbrica» ja no és legal (invariant 14).
assert.deepEqual(ESTRATEGIES, ['competitiva', 'cycle']);
await assert.rejects(() => desaConfig(db, 1, { estrategia: 'fabrica' }), /estrategia no vàlida/);

// 3. Onboarding parcial: el que falta seguix demanant-se, el declarat es conserva.
await desaConfig(db, 1, { estrategia: 'competitiva', divisio: 'VII', sistema_juvenil: 'academia' });
let c = await llegixConfig(db, 1);
assert.equal(c.estrategia, 'competitiva');
assert.equal(c.divisio, 'VII');
assert.equal(c.sistema_juvenil, 'academia');
assert.deepEqual(falten(c), ['pais', 'partits_setmana'], 'el que no s\'ha declarat, es demana');

// 4. llocs_partit = llocs de la formació × partits_setmana. Sense partits_setmana no es
//    deriva: torna null (i el sistema el demana) en lloc de suposar-lo.
assert.equal(llocsPartit(c, 11), null, 'sense partits_setmana no hi ha llocs_partit');
await desaConfig(db, 1, { pais: 'ES', partits_setmana: 2 });
c = await llegixConfig(db, 1);
assert.deepEqual(falten(c), [], 'config completa');
assert.equal(llocsPartit(c, 11), 22, '11 × 2 partits');
assert.equal(llocsPartit({ ...c, partits_setmana: 1 }, 11), 11, 'una setmana d\'un sol partit');

// 5. Desar no esborra el que no arriba (només toca el que es declara).
await desaConfig(db, 1, { divisio: 'VI' });
c = await llegixConfig(db, 1);
assert.equal(c.divisio, 'VI');
assert.equal(c.pais, 'ES', 'el país no s\'ha perdut');
assert.equal(c.partits_setmana, 2);

// 6. Valors fora de contracte, rebutjats.
await assert.rejects(() => desaConfig(db, 1, { partits_setmana: 3 }), /partits_setmana no vàlid/);
await assert.rejects(() => desaConfig(db, 1, { sistema_juvenil: 'planter' }), /sistema_juvenil no vàlid/);

console.log('OK — config v3: PAS 0 complet, res suposat, llocs_partit derivat');
