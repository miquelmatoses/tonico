// Tonico — polit #6.2: «em falten» mira les fonts VIVES (finances/personal_membres),
// no les velles (transaccions/personal_declarat). node test/falten_vius.mjs
import assert from 'node:assert/strict';
import { desaConfig } from '../lib/config.js';
import { nova } from './_d1shim.mjs';
import * as falten from '../functions/api/falten.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec("INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');");
const items = async () => (await (await falten.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json()).items.map((i) => i.clau);

// Sense res declarat → falten caixa i personal.
assert.deepEqual((await items()).sort(),
  ['caixa', 'config_divisio', 'config_estrategia', 'config_pais', 'config_partits_setmana', 'personal'],
  'sense config, Paco també demana el PAS 0 (mai se suposa)');

// Caixa REAL declarada (finances) + personal_membres → NO han de seguir demanant-se.
sqlite.exec(`
  INSERT INTO finances (usuari_id, caixa, caixa_data) VALUES (1, 250000, '2026-07-25');
  INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou) VALUES (1,'especialista','metge',5,1000);
`);
await desaConfig(db, 1, { estrategia: 'competitiva', pais: 'ES', divisio: 'VII', partits_setmana: 2 });
assert.deepEqual(await items(), [], 'amb finances, personal i config posats, «em falten» s\'apaga');

// Encara amb 0 moviments/personal_declarat (les fonts velles): no ha d'importar.
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM transaccions').get().n, 0);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM personal_declarat').get().n, 0);

console.log('OK — falten: fonts vives (finances + personal_membres), l\'ítem s\'apaga en posar la dada');
