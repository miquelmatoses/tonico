// Tonico — proves d'auth (WebCrypto natiu). node test/auth.mjs
import assert from 'node:assert/strict';
import { hashContrasenya, verificaContrasenya, signaSessio, verificaSessio } from '../lib/auth.js';

// ── Hash de contrasenya ──
const h = await hashContrasenya('secreta-de-Paco');
assert.match(h, /^pbkdf2\$100000\$/);                  // format autodescriptiu
assert.equal(await verificaContrasenya('secreta-de-Paco', h), true);
assert.equal(await verificaContrasenya('dolenta', h), false);
assert.notEqual(h, await hashContrasenya('secreta-de-Paco'));  // salt aleatori → hash distint

// ── Sessió signada ──
const secret = 'clau-de-prova';
const ara = 1_800_000_000;
const token = await signaSessio(7, secret, ara + 3600);
assert.equal(await verificaSessio(token, secret, ara), 7);            // vàlida
assert.equal(await verificaSessio(token, secret, ara + 7200), null);  // caducada
assert.equal(await verificaSessio(token, 'clau-erronia', ara), null); // signatura dolenta
assert.equal(await verificaSessio(token.slice(0, -2) + 'xx', secret, ara), null); // manipulada

console.log('OK — auth: hash i sessió correctes');
