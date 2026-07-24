// Tonico — regla d'or, doctrina «ACTUA, INFORMA, DESFÉS» (contracte protegit,
// revisat i autoritzat per Miquel). node test/reconciliacio.mjs
import assert from 'node:assert/strict';
import { classifica } from '../lib/classificador.js';
import { reconcilia } from '../lib/reconciliacio.js';

const config = {
  params: {},
  categories: [
    { categoria: 'titular', ordre: 1, aforament: 2, es_funcio: true, parametres: { puntuacio: { termes: [{ camp: 'valor', pes: 1 }] } } },
    { categoria: 'fora', ordre: 2, aforament: null, es_funcio: false, parametres: {} },
  ],
};
const p = (id, valor) => ({ id_hattrick: id, nom: 'p' + id, valor, posicio: 'X' });
const ideal = (players, cfg = config, fixats) => classifica(players, cfg, fixats);
const actuals = (obj) => new Map(Object.entries(obj).map(([id, v]) =>
  [Number(id), typeof v === 'string' ? { categoria: v, origen: 'auto' } : v]));
const opts = { llindar: 0.5 };
const cat = (autos, id) => autos.find((a) => a.id_hattrick === id)?.categoria;

// S1 — primera pujada: tot auto, cap moviment ni pregunta
{
  const js = [p(1, 10), p(2, 8), p(3, 6), p(4, 4)];
  const r = reconcilia(js, new Map(), ideal(js), config, opts);
  assert.equal(r.moviments.length, 0); assert.equal(r.preguntes.length, 0);
  assert.equal(cat(r.autos, 1), 'titular'); assert.equal(cat(r.autos, 3), 'fora');
}

// S2 — estable: cap canvi
{
  const js = [p(1, 10), p(2, 8), p(3, 6), p(4, 4)];
  const r = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, opts);
  assert.equal(r.autos.length, 0); assert.equal(r.moviments.length, 0); assert.equal(r.preguntes.length, 0);
}

// S3 — vacant: s'omple auto, sense moviment
{
  const js = [p(1, 10), p(3, 6), p(4, 4)];
  const r = reconcilia(js, actuals({ 1: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, opts);
  assert.equal(r.moviments.length, 0);
  assert.equal(cat(r.autos, 3), 'titular');
}

// S4 — cas reptador: supera el llindar → EXECUTA i informa (no pregunta)
{
  const js = [p(1, 10), p(2, 8), p(3, 9), p(4, 4)];    // el 3 supera el 2
  const r = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, opts);
  assert.equal(r.preguntes.length, 0, 'no pregunta: s\'executa');
  assert.equal(r.moviments.length, 1);
  const m = r.moviments[0];
  assert.deepEqual([m.entrant_id, m.eixent_id, m.diferencia], [3, 2, 1]);
  assert.equal(m.categoria_previa_entrant, 'fora', 'guarda la categoria prèvia per desfer');
  assert.equal(cat(r.autos, 3), 'titular', 'entrant a la plaça');
  assert.equal(cat(r.autos, 2), 'fora', 'desplaçat a l\'embut');
}

// S5 — un DESFÉS silencia mentre la diferència no cresca
{
  const js = [p(1, 10), p(2, 8), p(3, 9), p(4, 4)];
  const desfets = [{ categoria: 'titular', entrant_id: 3, eixent_id: 2, diferencia_al_rebutjar: 1 }];
  assert.equal(reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, { ...opts, desfets }).moviments.length, 0, 'desfet: silenciat');
  const js2 = [p(1, 10), p(2, 8), p(3, 12), p(4, 4)];
  assert.equal(reconcilia(js2, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js2), config, { ...opts, desfets }).moviments.length, 1, 'creix → torna a executar');
}

// S6 — EXCEPCIÓ: si el desplaçat és MANUAL, no s'executa → pregunta prèvia
{
  const js = [p(1, 10), p(2, 8), p(3, 9), p(4, 4)];
  const act = actuals({ 1: 'titular', 3: 'fora', 4: 'fora' });
  act.set(2, { categoria: 'titular', origen: 'manual' });      // el titular 2 és manual
  const idealPin = ideal(js, config, { 2: 'titular' });
  const r = reconcilia(js, act, idealPin, config, opts);
  assert.equal(r.moviments.length, 0, 'no s\'executa sobre un manual');
  assert.equal(r.preguntes.length, 1, 'queda com a pregunta prèvia');
  assert.deepEqual([r.preguntes[0].entrant_id, r.preguntes[0].eixent_id], [3, 2]);
}

// S7 — desclassificació executada (titular que ja no qualifica, sense rival)
{
  const cfgReq = {
    params: {},
    categories: [
      { categoria: 'titular', ordre: 1, aforament: 2, es_funcio: true, parametres: { requisits: [{ camp: 'valor', op: '>=', valor: 5 }], puntuacio: { termes: [{ camp: 'valor', pes: 1 }] } } },
      { categoria: 'fora', ordre: 2, aforament: null, es_funcio: false, parametres: {} },
    ],
  };
  const js = [p(1, 10), p(2, 3), p(3, 3), p(4, 2)];
  const r = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js, cfgReq), cfgReq, opts);
  assert.equal(r.moviments.length, 1);
  assert.deepEqual([r.moviments[0].entrant_id, r.moviments[0].eixent_id], [null, 2]);
  assert.equal(cat(r.autos, 2), 'fora', 'desclassificat a l\'embut');
}

console.log('OK — regla d\'or: ACTUA (executa+informa), silenci sota llindar, DESFÉS anti-soroll, pregunta només per manual');
