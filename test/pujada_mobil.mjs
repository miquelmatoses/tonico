// Tonico — LA PUJADA NO JUTJA EL FITXER PEL NOM NI PEL TIPUS MIME, sinó pel contingut.
// Al mòbil, un CSV legítim arriba sovint com application/octet-stream, com text/plain o
// sense extensió: si el filtràrem per tipus, quedaria fora sense motiu.
// node test/pujada_mobil.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import * as pujar from '../functions/api/pujar.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','cap',2);
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
`);
const csv = readFileSync(new URL('../data/fixtures/players.csv', import.meta.url), 'utf8');

const puja = async (fitxer, data = '2026-07-25') => {
  const fd = new FormData();
  fd.set('data', data);
  if (fitxer) fd.set('senior', fitxer);
  fd.set('reemplaça', 'true');
  const r = await pujar.onRequestPost({
    request: new Request('http://t/api/pujar', { method: 'POST', body: fd }),
    env: { DB: db }, data: { usuari: { id: 1 } },
  });
  return { status: r.status, cos: await r.json() };
};

// ── Com arriba el fitxer des d'un mòbil: tipus i noms que NO són «text/csv» ──
const casos = [
  ['text/csv', 'players.csv', 'el cas net (escriptori)'],
  ['application/octet-stream', 'players.csv', 'Android: molts proveïdors declaren octet-stream'],
  ['text/plain', 'players.csv', 'iOS: de vegades el marca com a text pla'],
  ['', 'players.csv', 'sense tipus declarat'],
  ['application/octet-stream', 'export', 'sense extensió (baixat des del navegador)'],
  ['application/vnd.ms-excel', 'players.csv', 'quan el mòbil l\'associa a un full de càlcul'],
];
for (const [tipus, nom, què] of casos) {
  const r = await puja(new File([csv], nom, { type: tipus }));
  assert.equal(r.status, 200, `${què}: hauria d'entrar (status ${r.status}, ${JSON.stringify(r.cos).slice(0, 90)})`);
  assert.ok(r.cos.ok, `${què}: pujada correcta`);
}

// ── I el que NO és l'export, es rebutja amb un motiu que es pot llegir ──
const buit = await puja(new File([''], 'buit.csv', { type: 'text/csv' }));
assert.equal(buit.status, 400);
assert.equal(buit.cos.error, 'fitxer_buit', 'un fitxer buit es diu, no peta parsejant');

const altre = await puja(new File(['hola\nmón\n'], 'notes.csv', { type: 'text/csv' }));
assert.equal(altre.status, 400);
assert.equal(altre.cos.error, 'no_es_csv', 'un fitxer que no és l\'export es diu clarament');
assert.equal(altre.cos.nom, 'notes.csv', 'i diu de quin fitxer parla');

// ── El filtre del selector no pot ser estret: és el que bloquejava el mòbil ──
const vista = readFileSync(new URL('../public/seccions.js', import.meta.url), 'utf8');
const m = vista.match(/const ACCEPTA_CSV = '([^']+)'/);
assert.ok(m, 'el filtre del selector viu en un sol lloc');
const accepta = m[1].split(',');
for (const cal of ['.csv', 'text/csv', 'text/plain', 'application/octet-stream']) {
  assert.ok(accepta.includes(cal), `el filtre ha d'admetre ${cal} (si no, el mòbil el bloqueja)`);
}
assert.equal((vista.match(/accept: '\.csv'/g) || []).length, 0,
  'cap input amb el filtre estret que trencava el mòbil');

console.log('OK — pujada: el fitxer es jutja pel contingut, no pel tipus MIME ni pel nom');
