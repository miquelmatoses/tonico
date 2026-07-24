// Tonico — polit: rellotge de crida amb reinici setmanal GLOBAL, disponibilitat
// derivada del calendari (cap config per usuari). node test/crida.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { finestraCrida } from '../lib/calendari.js';
import { estatCrida } from '../lib/crida.js';
import { REGLES } from '../lib/regles.js';

// Finestra: inici = últim reinici (DISSABTE, dia 6 — economia+1h) en o abans de la data; fi = +7.
const f = finestraCrida('2026-07-22', 6);
assert.ok(f.inici <= '2026-07-22' && '2026-07-22' < f.fi, 'la data cau dins de la finestra');
assert.equal(new Date(`${f.inici}T00:00:00Z`).getUTCDay(), 6, 'l\'inici és el dia de reinici (dissabte)');
assert.equal(Math.round((Date.parse(f.fi) - Date.parse(f.inici)) / 86400000), 7, 'la finestra dura 7 dies');

// Disponibilitat derivada (DB): sense crida → disponible; declarada esta finestra → no.
const { sqlite, db } = nova(import.meta.url);
sqlite.exec("INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');");
let c = await estatCrida(db, 1, '2026-07-22');
assert.equal(c.disponible, true, 'sense crida declarada → disponible');
assert.equal(c.caducitat, f.fi, 'caduca al pròxim reinici');

// Una crida de la finestra ANTERIOR (abans de l'inici) NO gasta la d'esta setmana.
const abans = new Date(Date.parse(f.inici) - 86400000).toISOString().slice(0, 10);
sqlite.prepare("INSERT INTO crides (usuari_id, data, resultat) VALUES (1, ?, 'acceptat')").run(abans);
assert.equal((await estatCrida(db, 1, '2026-07-22')).disponible, true, 'crida de la setmana passada no compta');

// Una crida DINS de la finestra vigent la gasta.
sqlite.prepare("INSERT INTO crides (usuari_id, data, resultat) VALUES (1, ?, 'acceptat')").run(f.inici);
assert.equal((await estatCrida(db, 1, '2026-07-22')).disponible, false, 'crida declarada esta finestra → gastada');

// ALR_CRIDA_DISPONIBLE: només amb crida disponible, i diu quan caduca.
assert.equal(REGLES.ALR_CRIDA_DISPONIBLE({ crida: { disponible: true, caducitat: '2026-07-24' } }, { urgencia: 60 })[0].parametres.caduca, '2026-07-24');
assert.equal(REGLES.ALR_CRIDA_DISPONIBLE({ crida: { disponible: false, proxima: '2026-07-24' } }, { urgencia: 60 }).length, 0, 'gastada → res al parte');
assert.equal(REGLES.ALR_CRIDA_DISPONIBLE({}, { urgencia: 60 }).length, 0, 'sense acadèmia → res');

console.log('OK — crida: finestra setmanal global derivada, gastada vs disponible, alerta amb caducitat');
