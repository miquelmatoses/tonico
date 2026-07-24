// Tonico — ONZE JUVENIL per MAXIMITZACIÓ DEL VALOR ENTRENABLE (doctrina v3 bloc 2 · 3).
// Substituïx l'alineador anterior. Orde per NIVELL descendent; cadascú rep la millor
// plaça DISPONIBLE segons el valor ENTRENABLE que hi rebria (el capat en A no trau
// profit del component A → la fórmula el porta sol a plaça B, cap regla especial). Les
// places sense valor són estructura (nivells més baixos); la banqueta és el mínim de la
// llista (sempre ≥1 recanvi, el que menys perd). Cap posició ni entrenament al codi.
import { valorPlaces, rangValor } from './valor_placa.js';
import { valorEsperatDesconegut } from './ranquing_juvenil.js';

const num = (v) => { if (v == null || v === 'desconegut') return null; const n = Number(v); return Number.isNaN(n) ? null : n; };
const esDesc = (y, skill) => { const v = y[`${skill}_actual`]; return v == null || v === 'desconegut'; };
const EPS = 1e-9;

export function alineaJuvenil(juvenils, opts = {}) {
  const { formacio = {}, maxims = {}, minim = 9, entrenamentA, entrenamentB, taulaEntrenament = {},
    marge_esperat = 3, f_marge = 0.5, pes_a = 1, pes_b = 0.66,
    potencial_esperat = 6, valor_esperat_desconegut_defecte = 5 } = opts;
  const buckets = Object.keys(formacio);
  const valPlaça = valorPlaces(entrenamentA, entrenamentB, taulaEntrenament, buckets);   // bucket → ab/a/b/cap
  const cap = (b) => Math.min(formacio[b] || 0, maxims[b] ?? Infinity);

  // Actual esperat d'un DESCONEGUT per habilitat (autocalibra amb la pròpia acadèmia).
  const veA = valorEsperatDesconegut(juvenils, entrenamentA, valor_esperat_desconegut_defecte);
  const veB = valorEsperatDesconegut(juvenils, entrenamentB, valor_esperat_desconegut_defecte);
  const valorEsperat = (skill) => (skill === entrenamentB ? veB : veA);

  // GUANY MARGINAL d'entrenar una habilitat, CONDICIONAL sobre el coneixement:
  //  (a) actual conegut, potencial desconegut → marge esperat PLE (potencial ≥ actual).
  //  (b) tot desconegut → potencial esperat (pom) − actual esperat (acadèmia): MENOR que (a).
  //  (c) actual desconegut, potencial conegut → potencial − min(esperat, potencial): baix si el potencial és baix.
  //  (d) tots dos coneguts → marge real (capat = 0).
  const marge = (y, skill) => {
    const descAct = esDesc(y, skill);
    const a = num(y[`${skill}_actual`]), p = num(y[`${skill}_potencial`]);
    if (!descAct && p == null) return marge_esperat * f_marge;                                    // (a)
    if (descAct && p == null) return Math.max(0, potencial_esperat - valorEsperat(skill)) * f_marge;  // (b)
    if (descAct && p != null) { const ae = Math.min(valorEsperat(skill), p); return Math.max(0, p - ae) * f_marge; }  // (c)
    return Math.max(0, p - a) * f_marge;                                                          // (d)
  };
  // 1a: Σ sobre els components d'entrenament de la plaça de pes_component × marge.
  const valorEntrenable = (y, bucket) => {
    const v = valPlaça[bucket];
    return ((v === 'ab' || v === 'a') ? pes_a * marge(y, entrenamentA) : 0) + ((v === 'ab' || v === 'b') ? pes_b * marge(y, entrenamentB) : 0);
  };

  const slots = [];
  for (const b of buckets) for (let i = 0; i < cap(b); i++) slots.push({ bucket: b, jugador: null, valor: 0 });
  const ordenats = [...juvenils].sort((x, z) => (z.nivell ?? 0) - (x.nivell ?? 0));   // nivell desc (desempat)
  const usat = new Set();

  // SLOT-CENTRIC (1b): les places de MÉS valor primer; cada plaça entrenable agafa el
  // juvenil LLIURE amb MÉS guany marginal per a ella (>0). Així una plaça amb component A
  // va a qui més hi guanya, mai a un guany menor; i els de guany ~0 NO ocupen entrenable.
  const perValor = [...slots].sort((a, b) => rangValor(valPlaça[b.bucket]) - rangValor(valPlaça[a.bucket]));
  const dies = (y) => y.dies_restants_promocio ?? Infinity;
  for (const slot of perValor) {
    if (valPlaça[slot.bucket] === 'cap') continue;                    // estructura al pas 2
    let best = null, bestV = EPS;
    for (const y of ordenats) {
      if (usat.has(y.jugador_id)) continue;
      const v = valorEntrenable(y, slot.bucket);
      // Guany major mana; a IGUALTAT (p.ex. desconeguts d'una plaça amb component A), la
      // DATA DE PROMOCIÓ més pròxima (urgència de decisió), mai l'orde d'iteració (punt 2).
      if (v > bestV + EPS || (best && Math.abs(v - bestV) <= EPS && dies(y) < dies(best))) { bestV = v; best = y; }
    }
    if (best) { slot.jugador = best; slot.valor = bestV; usat.add(best.jugador_id); }
  }
  // Pas 2: estructura ('cap') i places entrenables buides (cap guany positiu lliure) →
  // els restants per NIVELL desc. Guany 0 ⟹ estructura, per alt que siga el NIVELL (1b).
  const restants = ordenats.filter((y) => !usat.has(y.jugador_id));
  for (const slot of perValor) {
    if (slot.jugador || !restants.length) continue;
    const y = restants.shift(); slot.jugador = y; slot.valor = valorEntrenable(y, slot.bucket); usat.add(y.jugador_id);
  }
  let banqueta = ordenats.filter((y) => !usat.has(y.jugador_id)).map((y) => ({ jugador_id: y.jugador_id, nom: y.nom, motiu: 'recanvi' }));

  // Fre de suplents: sempre ≥1 recanvi. Si la formació té tants llocs com jugadors (cap
  // sobrant) i hi ha marge sobre el mínim, es lleva UNA plaça SENSE valor (mai entrenable):
  // el jugador de menys nivell d'una plaça 'cap' passa a recanvi.
  let sense_marge = false;
  const enCamp = slots.filter((s) => s.jugador);
  if (banqueta.length === 0) {
    if (enCamp.length > minim) {
      let idx = -1, menorNiv = Infinity;
      slots.forEach((s, i) => { if (s.jugador && valPlaça[s.bucket] === 'cap' && (s.jugador.nivell ?? 0) < menorNiv) { menorNiv = s.jugador.nivell ?? 0; idx = i; } });
      if (idx >= 0) { const y = slots[idx].jugador; slots[idx].jugador = null; banqueta = [{ jugador_id: y.jugador_id, nom: y.nom, motiu: 'recanvi' }]; }
      else sense_marge = true;   // totes les places del camp són entrenables: no forcem recanvi
    } else sense_marge = true;
  }

  // Motius derivats de l'estat REAL: el motiu anomena la/les habilitats que la PLAÇA
  // entrena de veritat (components reals de valPlaça), no el principal per defecte. Guany
  // ~0 → estructura (MAI «descartat»); habilitat desconeguda → descobriment; si no, entrena.
  const componentsDe = (v) => [...(v === 'ab' || v === 'a' ? [entrenamentA] : []), ...(v === 'ab' || v === 'b' ? [entrenamentB] : [])];
  const ordreBucket = { porter: 0, defensa: 1, mc: 2, extrem: 3, davanter: 4 };
  const onze = slots.filter((s) => s.jugador).map((s) => {
    const y = s.jugador, v = valPlaça[s.bucket], comps = componentsDe(v);
    let motiu, habilitat = null, habilitat_entrena = null, habilitat_descobrix = null;
    if (v === 'cap' || s.valor <= EPS) motiu = 'estructura';
    else {
      // ETIQUETA MIXTA: una plaça pot ENTRENAR una habilitat ja coneguda I DESCOBRIR-NE una
      // altra alhora. Aleshores el motiu porta les DUES coses i compta a les dues columnes.
      const desconeguts = comps.filter((sk) => esDesc(y, sk));
      const coneguts = comps.filter((sk) => !esDesc(y, sk));
      habilitat_entrena = coneguts.length ? coneguts.join(' i ') : null;
      habilitat_descobrix = desconeguts.length ? desconeguts.join(' i ') : null;
      if (coneguts.length && desconeguts.length) { motiu = 'mixt'; habilitat = habilitat_entrena; }
      else if (desconeguts.length) { motiu = 'descobriment'; habilitat = habilitat_descobrix; }
      else { motiu = 'entrena'; habilitat = habilitat_entrena; }
    }
    return { jugador_id: y.jugador_id, nom: y.nom, bucket: s.bucket, valor_placa: v, motiu, habilitat,
      habilitat_entrena, habilitat_descobrix, guany: Math.round(s.valor * 100) / 100,
      entrenable: motiu !== 'estructura', nivell: y.nivell ?? null, dies_restants_promocio: y.dies_restants_promocio ?? null };
  }).sort((a, b) => (ordreBucket[a.bucket] ?? 9) - (ordreBucket[b.bucket] ?? 9));

  const en_camp = onze.length;
  const teporter = onze.some((s) => s.bucket === 'porter');
  return {
    onze, banqueta, sense_marge,
    en_camp, minim, porter: teporter,
    no_viable: en_camp < minim || !teporter,
    // Repartiment REAL (per a la capçalera derivada, res de textos fixos): 3e. Els MIXTOS
    // compten a les DUES columnes: entrenen una coneguda i en descobrixen una altra.
    descobriments: onze.filter((s) => s.motiu === 'descobriment' || s.motiu === 'mixt').length,
    entrenen: onze.filter((s) => s.motiu === 'entrena' || s.motiu === 'mixt').length,
    estructura: onze.filter((s) => s.motiu === 'estructura').length,
  };
}
