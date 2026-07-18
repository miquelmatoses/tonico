// Tonico — motor de classificació (F1-B). node test/classificador.mjs
// Prova: avaluació declarativa, embut sobre dades reals (fixtures) i la
// PROVA DE FOC — una segona estratègia classifica amb zero codi nou.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelSenior } from '../lib/adaptador.js';
import { carregaConfigPla } from '../lib/config_pla.js';
import { classifica, avaluaPuntuacio, compleixRequisits, resolField, bucketDe } from '../lib/classificador.js';

// Aplana el model a jugadors del classificador
const files = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
const jugadors = modelSenior(files('../data/fixtures/players.csv'), '2026-07-18').jugadors
  .map((j) => ({ id_hattrick: j.identitat.id_hattrick, nom: j.identitat.nom,
    especialitat: j.identitat.especialitat, posicio: j.instantania.posicio_ultim_partit,
    ...j.instantania }));

// ── Unitats de l'avaluador declaratiu ──
const params = { valor_especialitats: ['Potent'], buckets_posicio: { mc: ['MC'], extrem: ['ED', 'EE'] } };
const jx = { creativitat: 7, edat_anys: 17, especialitat: 'Potent', posicio: 'MC', porteria: 1, defensa: 4, extrem: 6, passades: 3, anotacio: 5, pilota_aturada: 5 };
assert.equal(avaluaPuntuacio({ termes: [{ camp: 'creativitat', pes: 1 }, { camp: 'edat_anys', pes: 0.5, desde: 20 }] }, jx, params), 7 + 1.5);
assert.equal(resolField('habilitat_max', jx, params), 7);
assert.equal(resolField('especialitat_valuosa', jx, params), 1);
assert.equal(bucketDe(jx, params.buckets_posicio), 'mc');
assert.equal(compleixRequisits([{ camp: 'creativitat', op: '>=', valor: 2 }, { camp: 'edat_anys', op: '<=', valor: 23 }], jx, params), true);
assert.equal(compleixRequisits([{ camp: 'edat_anys', op: '<=', valor: 16 }], jx, params), false);

// ── L'embut sobre dades reals, amb la config de `fabrica` llegida de BD ──
const { db } = nova(import.meta.url);
const config = await carregaConfigPla(db, 'fabrica');
const res = classifica(jugadors, config);

const per = (cat) => res.filter((r) => r.categoria === cat);
const idPos = new Map(jugadors.map((j) => [j.id_hattrick, j.posicio]));
const entren = per('entrenable');
const mc = entren.filter((r) => config.params.buckets_posicio.mc.includes(idPos.get(r.id_hattrick)));
const extr = entren.filter((r) => config.params.buckets_posicio.extrem.includes(idPos.get(r.id_hattrick)));

assert.equal(res.every((r) => !!r.categoria), true, 'tot jugador té veredicte');
assert.equal(entren.length, 8, 'aforament entrenable = 8');
assert.equal(mc.length, 6, '6 entrenables MC');
assert.equal(extr.length, 2, '2 entrenables extrem');
assert.equal(per('futur_entrenador').length, 1, 'aforament futur_entrenador = 1');
// El futur_entrenador ha de ser el de més experiència
const maxExp = Math.max(...jugadors.map((j) => j.experiencia));
const fe = jugadors.find((j) => j.id_hattrick === per('futur_entrenador')[0].id_hattrick);
assert.equal(fe.experiencia, maxExp, 'futur_entrenador = màxima experiència');

// ── PROVA DE FOC: estratègia nova = només dades, zero codi ──
// «cycle_training»: no vol extrems, aforament 4 MC, i ven a partir de TSI.
const cycle = {
  params: { buckets_posicio: { mc: ['MC'] }, categoria_terminal: 'venda' },
  categories: [
    { categoria: 'entrenable', ordre: 1, aforament: null, es_funcio: true,
      parametres: { places: { mc: 4 }, requisits: [{ camp: 'edat_anys', op: '<=', valor: 25 }],
        puntuacio: { termes: [{ camp: 'tsi', pes: 1 }] } } },
    { categoria: 'venda', ordre: 2, aforament: null, es_funcio: false, parametres: {} },
  ],
};
const resC = classifica(jugadors, cycle);
assert.equal(resC.filter((r) => r.categoria === 'entrenable').length, 4, 'cycle: 4 entrenables MC');
assert.equal(resC.every((r) => !!r.categoria), true);
// I trien-se pels de més TSI (política distinta), no pels més creatius:
const topTsiMc = [...jugadors].filter((j) => j.posicio === 'MC').sort((a, b) => b.tsi - a.tsi).slice(0, 4).map((j) => j.id_hattrick);
assert.deepEqual(resC.filter((r) => r.categoria === 'entrenable').map((r) => r.id_hattrick).sort(), topTsiMc.sort());

// ── Cobertura mínima dura: mai liquidar l'últim ocupant d'una quota ──
// Un únic porter amb porteria per davall de l'adequació: es reté igual (farciment),
// no cau a venda encara que tinga valor (cas Soldevilla).
const squad = [
  { id_hattrick: 1, nom: 'Porter feble', posicio: 'PO', porteria: 3, especialitat: 'Potent', edat_anys: 19, sou: 500, defensa: 1, creativitat: 1, extrem: 1, passades: 1, anotacio: 1, pilota_aturada: 1 },
  { id_hattrick: 2, nom: 'Central', posicio: 'DC', porteria: 1, especialitat: null, edat_anys: 26, sou: 300, defensa: 6, creativitat: 2, extrem: 1, passades: 2, anotacio: 1, pilota_aturada: 3 },
];
const cfgCob = {
  params: {},
  categories: [
    { categoria: 'farciment', ordre: 1, aforament: null, es_funcio: true, parametres: {
      buckets: { porter: ['PO'], DC: ['DC'] },
      places: { porter: { n: 1, requisit: { camp: 'porteria', op: '>=', valor: 6 } }, DC: { n: 2 } },
      cobertura_minima: true,
      puntuacio: { termes: [{ camp: 'sou', pes: -1 }] } } },
    { categoria: 'venda', ordre: 2, aforament: null, es_funcio: false, parametres: {} },
  ],
};
const resCob = classifica(squad, cfgCob);
assert.equal(resCob.find((r) => r.id_hattrick === 1).categoria, 'farciment', 'l\'únic porter es reté per cobertura mínima');

console.log('OK — classificador: embut fàbrica + estratègia nova + cobertura mínima');
