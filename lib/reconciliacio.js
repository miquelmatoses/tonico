// Tonico — regla d'or. Concilia la classificació IDEAL (mèrit pur) amb l'estat
// ACTUAL de les categories. Universal: no coneix cap estratègia.
//
//   · Guanyar categoria sense desplaçar ningú (jugador nou, o plaça vacant) → AUTO.
//   · Desplaçar un titular de plaça → mai automàtic: es proposa com a INTERCANVI.
//   · Fre anti-soroll: només es proposa si la diferència supera el llindar, i un
//     rebuig el silencia fins que la diferència creix per damunt del que es va rebutjar.
//   · Categoria manual (origen='manual') no es toca sola, però pot ser desafiada.
import { bucketDe, avaluaPuntuacio } from './classificador.js';

export function reconcilia(jugadors, actuals, ideal, config, opts = {}) {
  const llindar = opts.llindar ?? 0;
  const rebutjats = opts.rebutjats ?? [];       // [{categoria, entrant_id, eixent_id, diferencia_al_rebutjar}]
  const params = config.params || {};
  const jById = new Map(jugadors.map((j) => [j.id_hattrick, j]));
  const idealById = new Map(ideal.map((r) => [r.id_hattrick, r]));

  const autos = [];
  const intercanvis = [];
  const decidit = new Set();
  const mkAuto = (id, categoria) => ({ id_hattrick: id, categoria, puntuacio: idealById.get(id)?.puntuacio ?? null });
  const puntEn = (cat, id) => avaluaPuntuacio(cat.parametres?.puntuacio, jById.get(id), params);
  const esManual = (id) => actuals.get(id)?.origen === 'manual';

  // 1) Places limitades: resol vacants (auto) i desplaçaments (intercanvi).
  for (const c of config.categories) {
    const p = c.parametres || {};
    const teLimit = c.aforament != null || p.places;
    if (!teLimit) continue;
    const mapa = p.buckets || params.buckets_posicio || {};
    const buckets = p.places ? Object.keys(p.places) : ['_pla'];

    for (const bucket of buckets) {
      const capacitat = p.places
        ? (typeof p.places[bucket] === 'number' ? p.places[bucket] : p.places[bucket].n)
        : c.aforament;
      const enBucket = (id) => (p.places ? bucketDe(jById.get(id), mapa) === bucket : true);
      const idealSet = ideal.filter((r) => r.categoria === c.categoria && enBucket(r.id_hattrick)).map((r) => r.id_hattrick);
      const actualSet = [...actuals].filter(([id, a]) => a.categoria === c.categoria && enBucket(id)).map(([id]) => id);

      const entrants = idealSet.filter((id) => !actualSet.includes(id) && !esManual(id))  // manual no s'auto-promou
        .sort((a, b) => (idealById.get(b)?.puntuacio ?? 0) - (idealById.get(a)?.puntuacio ?? 0));
      const eixents = actualSet.filter((id) => !idealSet.includes(id))
        .sort((a, b) => puntEn(c, a) - puntEn(c, b));          // el més fluix ix primer

      const vacants = Math.max(0, capacitat - actualSet.length);
      entrants.slice(0, vacants).forEach((id) => { autos.push(mkAuto(id, c.categoria)); decidit.add(id); });

      let e = 0;
      for (const entId of entrants.slice(vacants)) {           // cada entrant de més desplaça un titular
        const eixId = eixents[e++];
        if (eixId == null) break;
        const pe = idealById.get(entId)?.puntuacio ?? 0;
        const px = puntEn(c, eixId);
        const dif = pe - px;
        decidit.add(entId); decidit.add(eixId);
        if (dif <= llindar) continue;                          // sota llindar: no molestar
        if (silenciat(c.categoria, entId, eixId, dif, rebutjats, llindar)) continue;
        intercanvis.push({ categoria: c.categoria, entrant_id: entId, eixent_id: eixId,
          punt_entrant: pe, punt_eixent: px, diferencia: dif, desti_eixent: idealById.get(eixId)?.categoria });
      }
      for (; e < eixents.length; e++) {                        // titulars sense rival: desclassificació en solitari
        const eixId = eixents[e];
        decidit.add(eixId);
        if (esManual(eixId)) continue;                         // manual fixat: no es desclassifica sol
        intercanvis.push({ categoria: c.categoria, entrant_id: null, eixent_id: eixId,
          punt_entrant: null, punt_eixent: puntEn(c, eixId), diferencia: null, desti_eixent: idealById.get(eixId)?.categoria });
      }
    }
  }

  // 2) La resta: aplica l'ideal si canvia, sense tocar el manual.
  for (const r of ideal) {
    const id = r.id_hattrick;
    if (decidit.has(id)) continue;
    const a = actuals.get(id);
    if (a && a.origen === 'manual') continue;
    if (!a || a.categoria !== r.categoria) autos.push(mkAuto(id, r.categoria));
  }
  return { autos, intercanvis };
}

// Un intercanvi rebutjat es silencia fins que la diferència creix per damunt
// del que es va rebutjar més un llindar (creixement substancial).
function silenciat(categoria, entrant_id, eixent_id, dif, rebutjats, llindar) {
  const r = rebutjats.find((x) => x.categoria === categoria
    && x.entrant_id === entrant_id && x.eixent_id === eixent_id);
  return r != null && dif <= (r.diferencia_al_rebutjar ?? 0) + llindar;
}
