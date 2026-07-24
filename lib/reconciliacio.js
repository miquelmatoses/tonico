// Tonico — regla d'or, doctrina «ACTUA, INFORMA, DESFÉS» (polit #3, autoritzat
// per Miquel — revisió de contracte protegit). Universal: no coneix cap estratègia.
//
//   · Guanyar categoria sense desplaçar ningú (nou o plaça vacant) → AUTO, silenci.
//   · Un desplaçament per damunt del llindar S'EXECUTA (entrant a la plaça,
//     desplaçat re-classificat per l'embut) i s'INFORMA amb Desfés → `moviments`.
//   · Per davall del llindar → res, ni pregunta (silenci).
//   · EXCEPCIÓ: si el desplaçat és MANUAL, no s'executa → `preguntes` (pregunta prèvia).
//   · Fre anti-soroll: un DESFÉS es recorda; no es re-executa fins que la diferència
//     cresca substancialment per damunt del que es va desfer.
import { bucketDe, avaluaPuntuacio, compleixRequisits } from './classificador.js';

export function reconcilia(jugadors, actuals, ideal, config, opts = {}) {
  const llindar = opts.llindar ?? 0;
  const desfets = opts.desfets ?? [];        // [{categoria, entrant_id, eixent_id, diferencia_al_rebutjar}]
  const params = config.params || {};
  const jById = new Map(jugadors.map((j) => [j.id_hattrick, j]));
  const idealById = new Map(ideal.map((r) => [r.id_hattrick, r]));

  const autos = [];        // canvis de categoria a aplicar (guanys lliures, eixides, i els dos costats d'un moviment executat)
  const moviments = [];    // desplaçaments EXECUTATS (informar + desfer)
  const preguntes = [];    // desplaçaments bloquejats per un manual (pregunta prèvia)
  const decidit = new Set();
  const mkAuto = (id, categoria) => ({ id_hattrick: id, categoria, puntuacio: idealById.get(id)?.puntuacio ?? null });
  const puntEn = (cat, id) => avaluaPuntuacio(cat.parametres?.puntuacio, jById.get(id), params);
  const esManual = (id) => actuals.get(id)?.origen === 'manual';
  const previa = (id) => actuals.get(id)?.categoria ?? null;

  for (const c of config.categories) {
    const p = c.parametres || {};
    if (!(c.aforament != null || p.places)) continue;
    const mapa = p.buckets || params.buckets_posicio || {};
    const buckets = p.places ? Object.keys(p.places) : ['_pla'];

    for (const bucket of buckets) {
      const capacitat = p.places ? (typeof p.places[bucket] === 'number' ? p.places[bucket] : p.places[bucket].n) : c.aforament;
      const enBucket = (id) => (p.places ? bucketDe(jById.get(id), mapa) === bucket : true);
      const idealSet = ideal.filter((r) => r.categoria === c.categoria && enBucket(r.id_hattrick)).map((r) => r.id_hattrick);
      const actualSet = [...actuals].filter(([id, a]) => a.categoria === c.categoria && enBucket(id)).map(([id]) => id);

      const entrants = idealSet.filter((id) => !actualSet.includes(id) && !esManual(id))
        .sort((a, b) => (idealById.get(b)?.puntuacio ?? 0) - (idealById.get(a)?.puntuacio ?? 0));
      const eixents = actualSet.filter((id) => !idealSet.includes(id)).sort((a, b) => puntEn(c, a) - puntEn(c, b));

      const vacants = Math.max(0, capacitat - actualSet.length);
      entrants.slice(0, vacants).forEach((id) => { autos.push(mkAuto(id, c.categoria)); decidit.add(id); });

      let e = 0;
      for (const entId of entrants.slice(vacants)) {
        const eixId = eixents[e++];
        if (eixId == null) break;
        const pe = idealById.get(entId)?.puntuacio ?? 0;
        const px = puntEn(c, eixId);
        const dif = pe - px;
        const desti = idealById.get(eixId)?.categoria;
        decidit.add(entId); decidit.add(eixId);
        if (esManual(eixId)) {                        // manual: no s'executa, pregunta prèvia
          if (dif > llindar) preguntes.push(reg(c.categoria, entId, eixId, pe, px, dif, desti, previa(entId)));
          continue;
        }
        if (dif <= llindar) continue;                 // sota llindar: silenci
        if (silenciat(c.categoria, entId, eixId, dif, desfets, llindar)) continue;
        autos.push(mkAuto(entId, c.categoria));        // EXECUTA: entrant a la plaça
        autos.push(mkAuto(eixId, desti));              // desplaçat a l'embut, amb la seua puntuació allà
        moviments.push(reg(c.categoria, entId, eixId, pe, px, dif, desti, previa(entId)));
      }
      for (; e < eixents.length; e++) {               // titular sense rival: desclassificació executada
        const eixId = eixents[e];
        decidit.add(eixId);
        if (esManual(eixId)) continue;
        const desti = idealById.get(eixId)?.categoria;
        autos.push({ id_hattrick: eixId, categoria: desti, puntuacio: null });
        moviments.push(reg(c.categoria, null, eixId, null, puntEn(c, eixId), null, desti, null));
      }

      // PREGUNTA PRÈVIA (únic cas que es pregunta): un no-manual de l'embut supera
      // un ocupant MANUAL d'esta plaça. El pin manté el manual a la seua plaça, així
      // que este repte no apareix als entrants; el detectem explícitament i el
      // proposem sense executar res (mai sobreescrivim una decisió humana en silenci).
      const manualsAci = actualSet.filter((id) => esManual(id));
      if (manualsAci.length) {
        const feble = manualsAci.map((id) => ({ id, p: puntEn(c, id) })).sort((a, b) => a.p - b.p)[0];
        const repte = jugadors
          .filter((j) => !esManual(j.id_hattrick) && !decidit.has(j.id_hattrick)
            && !idealSet.includes(j.id_hattrick) && enBucket(j.id_hattrick)
            && compleixRequisits(p.requisits, j, params))
          .map((j) => ({ id: j.id_hattrick, p: puntEn(c, j.id_hattrick) }))
          .sort((a, b) => b.p - a.p)[0];
        const dif = repte ? repte.p - feble.p : 0;
        if (repte && dif > llindar && !silenciat(c.categoria, repte.id, feble.id, dif, desfets, llindar)) {
          decidit.add(repte.id);
          preguntes.push(reg(c.categoria, repte.id, feble.id, repte.p, feble.p, dif,
            idealById.get(repte.id)?.categoria, previa(repte.id)));
        }
      }
    }
  }

  for (const r of ideal) {                            // la resta: guanys/eixides silencioses, sense tocar el manual
    const id = r.id_hattrick;
    if (decidit.has(id)) continue;
    const a = actuals.get(id);
    if (a && a.origen === 'manual') continue;
    if (!a || a.categoria !== r.categoria) autos.push(mkAuto(id, r.categoria));
  }
  return { autos, moviments, preguntes };
}

const reg = (categoria, entrant_id, eixent_id, punt_entrant, punt_eixent, diferencia, desti_eixent, categoria_previa_entrant) =>
  ({ categoria, entrant_id, eixent_id, punt_entrant, punt_eixent, diferencia, desti_eixent, categoria_previa_entrant });

function silenciat(categoria, entrant_id, eixent_id, dif, desfets, llindar) {
  const r = desfets.find((x) => x.categoria === categoria && x.entrant_id === entrant_id && x.eixent_id === eixent_id);
  return r != null && dif <= (r.diferencia_al_rebutjar ?? 0) + llindar;
}
