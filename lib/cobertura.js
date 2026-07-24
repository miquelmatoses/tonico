// Tonico — COBERTURA MÍNIMA v2: la plantilla mínima es DERIVA de l'entrenament
// configurat, no d'un número escrit a mà. Pur: només aritmètica sobre la config
// (formació + rols) i poms. Canviar l'entrenament o la formació canvia els mínims.
//
// ENTRENABLES OBJECTIU = capacitat d'entrenament de la setmana:
//   per partit, cada plaça `entrena` val pct/100 d'un jugador entrenat al 100%
//   (MC al 100% → 1 jugador cadascuna; extrem al 50% → cal doblar-la als dos
//   partits, així que dues places de 50% només donen 1 jugador per partit).
//   × nombre de rols (rotació de 2 blocs) = jugadors que poden rebre 100%.
//   Cas actual: (3×100% + 2×50%) = 4 per partit × 2 rols = 8.
//
// PLANTILLA MÍNIMA = entrenables + futur entrenador + porters + cos de camp:
//   · porters_minims: pom (defecte 2).
//   · camp_minim: els llocs que NO entrenen ni són de porteria, descomptant el
//     futur entrenador (que ja els ocupa als dos partits), + marge d'absències
//     simultànies (pom, defecte 2). Amb el doblatge repartit, un cos cobrix la
//     mateixa plaça als dos onzes, per això la base és per partit i no per onze.
//   Així cap entrenable ha de baixar a cobrir una posició que no entrena.

// LA LIQUIDACIÓ RESPECTA LA COBERTURA (2c): si vendre tots els candidats deixaria el
// cos de camp per davall del mínim, se'n retenen els justos. La retenció MINIMITZA EL
// VALOR RENUNCIAT, no el sou: es retenen els de MENOR valor de venda (puntuació o
// estimació); el sou només DESEMPATA. Un cos de la categoria d'alliberament/despatx
// (que ja no és un actiu) és coixí PREFERENT abans de retindre res amb valor.
// Torna un Set d'ids que NO s'han de llistar.
const COIXI = new Set(['alliberament', 'despatx', 'despatxat']);

export function retingutsPerCobertura(candidats, { camp_minim = 0, cos_camp = 0, posicio_porter = 'PO' } = {}) {
  if (!(camp_minim > 0)) return new Set();          // sense cobertura calculada no es reté ningú
  const camp = (candidats || []).filter((j) => j.posicio !== posicio_porter);
  const restaSiEsVenenTots = Math.max(0, cos_camp - camp.length);
  const calen = Math.max(0, camp_minim - restaSiEsVenenTots);
  if (calen <= 0) return new Set();
  // Valor de venda: l'estimació si n'hi ha, si no la puntuació de la categoria.
  const val = (j) => j.valor ?? j.preu_proposat ?? j.puntuacio ?? 0;
  const ordre = camp.slice().sort((a, b) =>
    (COIXI.has(a.categoria) ? 0 : 1) - (COIXI.has(b.categoria) ? 0 : 1)   // el coixí primer
    || val(a) - val(b)                                                     // després, menys valor de venda
    || (a.sou ?? 0) - (b.sou ?? 0));                                       // i el sou només desempata
  return new Set(ordre.slice(0, calen).map((j) => j.jugador_id));
}

// Capacitat d'entrenament: jugadors que poden acabar la setmana al 100%.
export function entrenablesObjectiu(slots = [], nRols = 1) {
  const perPartit = slots.filter((s) => s.entrena)
    .reduce((n, s) => n + (s.pct ?? 100) / 100, 0);
  return Math.round(perPartit * nRols);
}

// Mínims derivats. `config` = {slots, rols}; `opts` = poms + si el pla té futur entrenador.
export function cobertura(config = {}, opts = {}) {
  const slots = config.slots || [];
  const nRols = (config.rols || []).length || 1;
  const { porters_minims = 2, marge_absencies = 2, futur_entrenador = 0, bucket_porter = 'porter' } = opts;

  const entrenables_objectiu = entrenablesObjectiu(slots, nRols);
  const nEntrena = slots.filter((s) => s.entrena).length;
  const nPorter = slots.filter((s) => s.bucket === bucket_porter).length;
  // Llocs de camp que no entrenen (per partit): els cobrixen el futur entrenador i el cos.
  const restants = Math.max(0, slots.length - nEntrena - nPorter);
  const camp_minim = Math.max(0, restants - futur_entrenador) + marge_absencies;
  const total = entrenables_objectiu + futur_entrenador + porters_minims + camp_minim;

  return {
    entrenables_objectiu, futur_entrenador, porters_minims, camp_minim, total,
    detall: { places_entrena: nEntrena, places_porter: nPorter, llocs_restants: restants, rols: nRols, marge_absencies },
  };
}
