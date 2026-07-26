// Tonico — personal i entrenament (Fase 8). node test/personal.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { comparaPersonal, checklistCanviFase } from '../lib/personal.js';
import { REGLES } from '../lib/regles.js';
import * as personal from '../functions/api/personal.js';

// Comparació: no declarat = 0; s'espera 0 → no desquadra
assert.deepEqual(comparaPersonal({ assistents: 2, metge: 1, psicoleg: 0 }, {}),
  [{ clau: 'assistents', esperat: 2, declarat: 0 }, { clau: 'metge', esperat: 1, declarat: 0 }]);
assert.deepEqual(comparaPersonal({ assistents: 2, metge: 1, psicoleg: 0 }, { assistents: 2, metge: 1 }), []);

// Checklist amb costos
const cl = checklistCanviFase({ personal: { psicoleg: 1 }, canvis: [{ nom: 'FuturCoach → entrenador', cost: 430000 }] }, {});
assert.equal(cl.cost_total, 430000);
assert.equal(cl.personal.length, 1);

// Regla
assert.equal(REGLES.ALR_PERSONAL_FASE({ personal: { desquadres: [{ clau: 'metge', esperat: 1, declarat: 0 }] } }, { urgencia: 52 }).length, 1);
assert.equal(REGLES.ALR_PERSONAL_FASE({ personal: { desquadres: [] } }, { urgencia: 52 }).length, 0);

// Integració via API
const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
             INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);
const ctx = (body) => ({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });

let d = await (await personal.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.fase_actual, 'competitiva');
assert.equal(d.desquadres.length, 2, 'sense declarar: falten assistents i metge');
assert.ok(d.checklists.find((c) => c.fase === 'inflexio').cost_total === 430000, 'checklist d\'inflexió amb el cost de FuturCoach');

// Model ric: cada especialista és un membre; el desquadre compara COMPTES per tipus.
await personal.onRequestPost(ctx({ rol: 'especialista', tipus: 'assistents', nivell: 7, sou: 2000, setmanes_contracte: 10 }));
await personal.onRequestPost(ctx({ rol: 'especialista', tipus: 'assistents', nivell: 6, sou: 1800, setmanes_contracte: 10 }));
await personal.onRequestPost(ctx({ rol: 'especialista', tipus: 'metge', nivell: 5, sou: 1000, setmanes_contracte: 2 }));
d = await (await personal.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
assert.equal(d.membres.length, 3, 'tres membres declarats');
assert.equal(d.desquadres.length, 0, 'declarat el personal → tot quadra');

// Alerta de contracte: el metge té 2 setmanes (≤ llindar) → dispara; els assistents no.
assert.equal(REGLES.ALR_CONTRACTE_PERSONAL({ personal: { membres: d.membres } }, { setmanes_avis: 2, urgencia: 58 }).length, 1);

console.log('OK — personal: comparació, checklist, model ric de membres i alerta de contracte');
