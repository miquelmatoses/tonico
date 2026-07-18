// Tonico — motor de classificació. UNIVERSAL: no coneix cap estratègia.
// Tota política (categories, aforaments, requisits, fórmules, llindars) arriba
// com a CONFIG (files de plantilles_categories/plantilles_parametres). Afegir
// una estratègia nova = passar una config nova; zero canvis ací.
//
// Un jugador és un objecte pla amb els camps de la instantània accessibles per
// nom (creativitat, edat_anys, experiencia, ...) + `posicio` + `especialitat`.

// ── Camps derivats (mecanisme genèric, política per paràmetres) ──
const HABILITATS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];

export function resolField(camp, jugador, params) {
  if (camp === 'habilitat_max') return Math.max(...HABILITATS.map((h) => num(jugador[h])));
  if (camp === 'especialitat_valuosa') return (params.valor_especialitats || []).includes(jugador.especialitat) ? 1 : 0;
  return num(jugador[camp]);
}

const num = (v) => (typeof v === 'number' ? v : (v == null || v === '' ? 0 : Number(v))) || 0;

// Bucket de posició (p.ex. 'mc'/'extrem', o 'porter'/'DC'/'lateral') segons un
// mapa {bucket: [posicions]}. Cada categoria amb places porta el seu propi mapa.
export function bucketDe(jugador, mapa = {}) {
  for (const [bucket, posicions] of Object.entries(mapa)) {
    if (posicions.includes(jugador.posicio)) return bucket;
  }
  return null;
}

// ── Avaluació declarativa ──
export function avaluaPuntuacio(spec, jugador, params) {
  if (!spec || !spec.termes) return 0;
  let s = spec.constant || 0;
  for (const t of spec.termes) {
    let v = resolField(t.camp, jugador, params);
    if (t.desde != null) v = t.desde - v;     // marge (p.ex. 20 − edat)
    s += t.pes * v;
  }
  return s;
}

export function compleixRequisits(reqs, jugador, params) {
  if (!reqs) return true;
  return reqs.every((r) => compara(resolField(r.camp, jugador, params), r.op, r.valor));
}

export function compara(a, op, b) {
  switch (op) {
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '<': return a < b;
    case '==': return a === b;
    default: return false;
  }
}

// ── L'embut ──
// config = { categories:[{categoria, es_funcio, aforament, ordre, parametres:{requisits,puntuacio,llindar_minim,places}}],
//            params:{valor_especialitats, buckets_posicio, categoria_terminal} }
// Torna, per a cada jugador: {id_hattrick, nom, categoria, puntuacio, justificacio}.
// `fixats` (id → categoria) pre-assigna els manuals: ocupen (o alliberen) plaça
// abans de l'embut, de manera que el mèrit es reparteix al voltant d'ells.
export function classifica(jugadors, config, fixats = {}) {
  const params = config.params || {};
  const assignat = new Map();                 // id_hattrick → {categoria, puntuacio}
  const cats = [...config.categories].sort((a, b) => a.ordre - b.ordre);

  const posa = (j, categoria, puntuacio) =>
    assignat.set(j.id_hattrick, { categoria, puntuacio });
  const lliure = (j) => !assignat.has(j.id_hattrick);
  const punt = (spec, j) => avaluaPuntuacio(spec, j, params);

  for (const j of jugadors) if (fixats[j.id_hattrick]) posa(j, fixats[j.id_hattrick], null);

  for (const cat of cats) {
    const p = cat.parametres || {};
    const lliures = jugadors.filter((j) => lliure(j) && compleixRequisits(p.requisits, j, params));
    const ambP = lliures.map((j) => ({ j, p: punt(p.puntuacio, j) }));
    const elegibles = p.llindar_minim != null ? ambP.filter((x) => x.p >= p.llindar_minim) : ambP;

    if (p.places) {                           // capacitat per bucket de posició
      const mapa = p.buckets || params.buckets_posicio || {};
      const jById = (id) => jugadors.find((j) => j.id_hattrick === id);
      const enPos = (id, bucket) => (mapa[bucket] || []).includes(jById(id)?.posicio);
      // Ocupació de la posició per ALTRES categories (cobertura complementària).
      const ocupadaAltres = (bucket) => [...assignat].filter(([id, a]) => a.categoria !== cat.categoria && enPos(id, bucket)).length;
      // Places d'esta mateixa categoria ja preses (pins manuals).
      const jaEnCat = (bucket) => [...assignat].filter(([id, a]) => a.categoria === cat.categoria && (!p.places || enPos(id, bucket))).length;
      // Ocupació total de la posició (per a la cobertura mínima).
      const ocupada = (bucket) => [...assignat.keys()].filter((id) => enPos(id, bucket)).length;

      for (const [bucket, spec] of Object.entries(p.places)) {
        const nBase = typeof spec === 'number' ? spec : spec.n;             // spec: n o {n, requisit}
        const reqBucket = typeof spec === 'object' ? spec.requisit : null;  // adequació per posició
        const n = nBase - jaEnCat(bucket) - (p.resta_ocupacio ? ocupadaAltres(bucket) : 0);
        if (n < 1) continue;
        elegibles
          .filter((x) => bucketDe(x.j, mapa) === bucket
            && (!reqBucket || compara(resolField(reqBucket.camp, x.j, params), reqBucket.op, reqBucket.valor)))
          .sort((a, b) => b.p - a.p).slice(0, n)
          .forEach((x) => posa(x.j, cat.categoria, x.p));
      }
      // Cobertura mínima dura: si una quota (n≥1) queda sense cap ocupant possible
      // (ni per esta categoria ni per cap altra) però existix algun jugador d'eixa
      // posició, se'n reté un encara que no complisca l'adequació (cas Soldevilla).
      if (p.cobertura_minima) {
        for (const [bucket, spec] of Object.entries(p.places)) {
          const nBase = typeof spec === 'number' ? spec : spec.n;
          if (nBase < 1 || ocupada(bucket) > 0) continue;
          const millor = jugadors.filter((j) => lliure(j) && bucketDe(j, mapa) === bucket)
            .map((j) => ({ j, p: punt(p.puntuacio, j) })).sort((a, b) => b.p - a.p)[0];
          if (millor) posa(millor.j, cat.categoria, millor.p);
        }
      }
    } else if (cat.aforament != null) {       // capacitat plana (resta els pins ja posats)
      const jaEnCat = [...assignat].filter(([, a]) => a.categoria === cat.categoria).length;
      elegibles.sort((a, b) => b.p - a.p).slice(0, Math.max(0, cat.aforament - jaEnCat))
        .forEach((x) => posa(x.j, cat.categoria, x.p));
    } else {                                  // sense límit
      elegibles.forEach((x) => posa(x.j, cat.categoria, x.p));
    }
  }

  // Terminal: qui no ha agafat cap categoria cau a la categoria terminal (liquidació final).
  const terminal = params.categoria_terminal;
  return jugadors.map((j) => {
    const a = assignat.get(j.id_hattrick) || { categoria: terminal, puntuacio: null };
    return { id_hattrick: j.id_hattrick, nom: j.nom, categoria: a.categoria, puntuacio: a.puntuacio };
  });
}
