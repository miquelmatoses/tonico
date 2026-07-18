// Tonico — regla d'or (F1-B). node test/reconciliacio.mjs
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
const ideal = (players, cfg = config) => classifica(players, cfg);
const actuals = (obj) => new Map(Object.entries(obj).map(([id, v]) =>
  [Number(id), typeof v === 'string' ? { categoria: v, origen: 'auto' } : v]));
const opts = { llindar: 0.5 };
const cat = (autos, id) => autos.find((a) => a.id_hattrick === id)?.categoria;

// S1 — primera pujada: tot auto, cap intercanvi
{
  const js = [p(1, 10), p(2, 8), p(3, 6), p(4, 4)];
  const r = reconcilia(js, new Map(), ideal(js), config, opts);
  assert.equal(r.intercanvis.length, 0);
  assert.equal(cat(r.autos, 1), 'titular'); assert.equal(cat(r.autos, 2), 'titular');
  assert.equal(cat(r.autos, 3), 'fora'); assert.equal(cat(r.autos, 4), 'fora');
}

// S2 — estable: cap canvi
{
  const js = [p(1, 10), p(2, 8), p(3, 6), p(4, 4)];
  const r = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, opts);
  assert.equal(r.autos.length, 0);
  assert.equal(r.intercanvis.length, 0);
}

// S3 — vacant (un titular se n'ha anat): s'omple auto, sense intercanvi
{
  const js = [p(1, 10), p(3, 6), p(4, 4)];                    // el 2 ja no hi és
  const r = reconcilia(js, actuals({ 1: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, opts);
  assert.equal(r.intercanvis.length, 0);
  assert.equal(cat(r.autos, 3), 'titular');                  // ocupa la vacant
}

// S4 — desplaçament: intercanvi pendent, res s'aplica sol
{
  const js = [p(1, 10), p(2, 8), p(3, 9), p(4, 4)];          // el 3 ha crescut per damunt del 2
  const r = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, opts);
  assert.equal(r.autos.length, 0, 'res auto quan hi ha desplaçament');
  assert.equal(r.intercanvis.length, 1);
  assert.deepEqual([r.intercanvis[0].entrant_id, r.intercanvis[0].eixent_id, r.intercanvis[0].diferencia], [3, 2, 1]);
}

// S5 — fre anti-soroll: rebutjat i no crescut → silenciat; si creix → torna
{
  const js = [p(1, 10), p(2, 8), p(3, 9), p(4, 4)];
  const rebutjats = [{ categoria: 'titular', entrant_id: 3, eixent_id: 2, diferencia_al_rebutjar: 1 }];
  const r1 = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js), config, { ...opts, rebutjats });
  assert.equal(r1.intercanvis.length, 0, 'silenciat mentre no creix');
  const js2 = [p(1, 10), p(2, 8), p(3, 12), p(4, 4)];        // el 3 creix substancialment
  const r2 = reconcilia(js2, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js2), config, { ...opts, rebutjats });
  assert.equal(r2.intercanvis.length, 1, 'torna quan la diferència creix');
}

// S6 — manual: no s'auto-promou ni genera intercanvi sol
{
  const js = [p(1, 10), p(2, 8), p(3, 9), p(4, 4)];
  const act = actuals({ 1: 'titular', 2: 'titular', 4: 'fora' });
  act.set(3, { categoria: 'fora', origen: 'manual' });        // el 3 fixat fora a mà
  const idealPin = classifica(js, config, { 3: 'fora' });     // l'ideal respecta el pin
  const r = reconcilia(js, act, idealPin, config, opts);
  assert.equal(r.intercanvis.length, 0, 'un manual no dispara res sol');
  assert.equal(r.autos.find((a) => a.id_hattrick === 3), undefined, 'el manual no es toca');
}

// S7 — desclassificació en solitari (titular que ja no qualifica, sense rival)
{
  const cfgReq = {
    params: {},
    categories: [
      { categoria: 'titular', ordre: 1, aforament: 2, es_funcio: true, parametres: { requisits: [{ camp: 'valor', op: '>=', valor: 5 }], puntuacio: { termes: [{ camp: 'valor', pes: 1 }] } } },
      { categoria: 'fora', ordre: 2, aforament: null, es_funcio: false, parametres: {} },
    ],
  };
  const js = [p(1, 10), p(2, 3), p(3, 3), p(4, 2)];          // el 2 (titular) ha caigut per davall del mínim
  const r = reconcilia(js, actuals({ 1: 'titular', 2: 'titular', 3: 'fora', 4: 'fora' }), ideal(js, cfgReq), cfgReq, opts);
  assert.equal(r.intercanvis.length, 1);
  assert.deepEqual([r.intercanvis[0].entrant_id, r.intercanvis[0].eixent_id], [null, 2]);
}

console.log('OK — regla d\'or: auto, vacant, desplaçament, anti-soroll, manual i desclassificació solitària');
