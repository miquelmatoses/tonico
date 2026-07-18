// Tonico — flux complet Fase 0 + peça mínima de Fase 9:
// registre → onboarding → pujada → llista, amb Request/Response reals,
// middleware d'autorització i shim D1. node test/flux.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import * as registre from '../functions/api/registre.js';
import * as entrar from '../functions/api/entrar.js';
import * as equips from '../functions/api/equips.js';
import * as instantanies from '../functions/api/instantanies.js';
import * as pujar from '../functions/api/pujar.js';
import * as mw from '../functions/_middleware.js';

const { db } = nova(import.meta.url);
const env = { DB: db, SESSIO_SECRET: 'secret-de-prova' };
const fixtura = (n) => readFileSync(new URL(`../data/fixtures/${n}`, import.meta.url), 'utf8');

// Passa una petició per middleware + handler (com el router de Pages).
async function crida(handler, { method = 'GET', url, body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (typeof body === 'string') headers['content-type'] = 'application/json';
  const request = new Request('http://t' + url, { method, headers, body });
  const context = { request, env, data: {}, next: () => handler(context) };
  return mw.onRequest(context);
}
const cookieDe = (resp) => (resp.headers.get('Set-Cookie') || '').split(';')[0];

// ── Registre: validacions ──
let r = await crida(registre.onRequestPost, { method: 'POST', url: '/api/registre', body: JSON.stringify({ correu: 'jo@exemple.cat' }) });
assert.equal(r.status, 400, 'contrasenya buida → 400');
r = await crida(registre.onRequestPost, { method: 'POST', url: '/api/registre', body: JSON.stringify({ correu: 'nofafalta', contrasenya: 'x' }) });
assert.equal(r.status, 400, 'correu invàlid → 400');

// ── Registre vàlid → sessió ──
r = await crida(registre.onRequestPost, { method: 'POST', url: '/api/registre', body: JSON.stringify({ correu: 'jo@exemple.cat', contrasenya: 'clau-forta' }) });
assert.equal(r.status, 201);
const cookie = cookieDe(r);
assert.match(cookie, /^sessio=/);

// ── Registre duplicat ──
r = await crida(registre.onRequestPost, { method: 'POST', url: '/api/registre', body: JSON.stringify({ correu: 'jo@exemple.cat', contrasenya: 'una-altra' }) });
assert.equal(r.status, 409);
assert.equal((await r.json()).error, 'correu_ja_registrat');

// ── Gate: /api/equips sense sessió → 401 ──
r = await crida(equips.onRequestGet, { url: '/api/equips' });
assert.equal(r.status, 401);

// ── Encara sense equips ──
r = await crida(equips.onRequestGet, { url: '/api/equips', cookie });
assert.deepEqual((await r.json()).equips, []);

// ── Pujar sense equips → 409 sense_equips ──
r = await crida(pujar.onRequestPost, { method: 'POST', url: '/api/pujar', cookie, body: fd({ senior: 'players.csv' }) });
assert.equal(r.status, 409);
assert.equal((await r.json()).error, 'sense_equips');

// ── Onboarding: crea els dos equips ──
r = await crida(equips.onRequestPost, { method: 'POST', url: '/api/equips', cookie,
  body: JSON.stringify({ senior: { nom: 'Benifotrem', id_hattrick: '12345' }, juvenil: { nom: 'Fotrem' } }) });
assert.equal(r.status, 201);
r = await crida(equips.onRequestGet, { url: '/api/equips', cookie });
assert.equal((await r.json()).equips.length, 2);

// ── Pujada dels dos CSV ──
r = await crida(pujar.onRequestPost, { method: 'POST', url: '/api/pujar', cookie,
  body: fd({ senior: 'players.csv', juvenil: 'youthplayers.csv' }) });
assert.equal(r.status, 200);
const res = (await r.json()).resultats;
assert.equal(res.find((x) => x.tipus === 'senior').total, 25);
assert.equal(res.find((x) => x.tipus === 'juvenil').total, 10);

// ── Llista ──
r = await crida(instantanies.onRequestGet, { url: '/api/instantanies', cookie });
assert.equal((await r.json()).instantanies.length, 2);

// ── Login de l'usuari registrat ──
r = await crida(entrar.onRequestPost, { method: 'POST', url: '/api/entrar', body: JSON.stringify({ correu: 'jo@exemple.cat', contrasenya: 'clau-forta' }) });
assert.equal(r.status, 200);
r = await crida(entrar.onRequestPost, { method: 'POST', url: '/api/entrar', body: JSON.stringify({ correu: 'jo@exemple.cat', contrasenya: 'malament' }) });
assert.equal(r.status, 401);

console.log('OK — flux: registre → onboarding → pujada → llista (+ gates i login)');

// FormData amb fitxers CSV com a Blob (data fixa).
function fd({ senior, juvenil }) {
  const f = new FormData();
  f.append('data', '2026-07-18');
  if (senior) f.append('senior', new Blob([fixtura(senior)], { type: 'text/csv' }), senior);
  if (juvenil) f.append('juvenil', new Blob([fixtura(juvenil)], { type: 'text/csv' }), juvenil);
  return f;
}
