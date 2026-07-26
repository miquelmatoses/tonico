// Tonico — PREU (contracte v3, PAS 7). ÚNICA fórmula de preu del sistema: Vendes,
// l'Economia i el bucle d'estoc (PAS 8) consumixen esta i cap altra.
//
//   calibrat        = COMPTA(vendes_reals ∪ comparables) ≥ `min_mostres`
//   preu_esperat(j) = SI(calibrat; estimació_comparables(j);
//                        BUSCA(`base_preu_divisio`; divisio) × factor_habilitat(j))
//   valor_net(j)    = preu_esperat − `cost_llistat` − sou × setmanes_venda(j)
//   setmanes_venda  = SI(llistat; dies_tancament/7; 1)
//   urgent(j)       = dies_aniversari(j) ≤ `dies_urgencia`
//
// Abans hi havia DOS preus: Vendes escalava una taula per divisió i l'Economia usava un
// pom de 150.000 €. El mateix jugador valia ~2.000 € en una pantalla i 150.000 € en l'altra.

// Mediana dels comparables de la mateixa posició; si no n'hi ha, de tots.
export function estimacioComparables(comparables, jugador) {
  const ambPreu = (comparables || []).filter((c) => c.preu != null);
  const mateixaPos = ambPreu.filter((c) => c.posicio && c.posicio === jugador.posicio);
  const pool = (mateixaPos.length ? mateixaPos : ambPreu).map((c) => c.preu);
  if (!pool.length) return null;
  const s = [...pool].sort((a, b) => a - b);
  const m = s.length >> 1;
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

// Calibrat = tenim prou mostres per a dir un preu amb cara i ulls.
export function calibrat(comparables, vendesReals, minMostres) {
  const n = (comparables || []).filter((c) => c.preu != null).length + (vendesReals || 0);
  return n >= (minMostres ?? 1);
}

// factor_habilitat(j): com de bo és el jugador respecte del que la seua divisió sol pagar.
// Es mesura amb la seua MILLOR habilitat (el full no en qualifica cap: «factor_habilitat»
// és com de bo és, i la millor habilitat és el que el mercat mira) contra el nivell mitjà
// de la mostra. Sense referència val 1: el preu base pelat, mai un número inventat.
export const HABILITATS = ['porteria', 'defensa', 'creativitat', 'passades', 'extrem', 'anotacio', 'pilota_aturada'];

export function habilitatMax(jugador) {
  return Math.max(0, ...HABILITATS.map((h) => Number(jugador?.[h] ?? 0)));
}

export function factorHabilitat(jugador, _habilitat, nivellReferencia) {
  const meua = habilitatMax(jugador);
  // Sense referència O sense cap habilitat coneguda → factor 1: el preu base pelat.
  // «No ho sabem» no és «no val res»: un 0 diria que el jugador no val gens.
  if (!nivellReferencia || !meua) return 1;
  return Math.round((meua / nivellReferencia) * 100) / 100;
}

// LA fórmula de preu. `opts` porta la divisió (format intern), la taula de preus base i la
// referència d'habilitat. Torna { preu, calibrat, base } — `base` diu d'on ix el número,
// perquè la vista puga avisar que és una estimació grossa sense inventar-se res.
export function preuEsperat(jugador, { comparables = [], vendes_reals = 0, min_mostres = 1,
  divisio, base_preu_divisio = {}, habilitat, nivell_referencia } = {}) {
  const cal = calibrat(comparables, vendes_reals, min_mostres);
  if (cal) {
    const p = estimacioComparables(comparables, jugador);
    if (p != null) return { preu: p, calibrat: true, base: 'comparables' };
  }
  const base = divisio ? base_preu_divisio[divisio] : null;
  if (base == null) return { preu: null, calibrat: false, base: null };
  const preu = Math.max(0, Math.round(base * factorHabilitat(jugador, habilitat, nivell_referencia)));
  return { preu, calibrat: false, base: 'divisio' };
}

// setmanes_venda: si ja està llistat, el que queda fins al tancament; si no, una setmana.
export function setmanesVenda(jugador, diesFinsTancament) {
  if (!jugador?.llistat) return 1;
  if (diesFinsTancament == null) return 1;
  return Math.max(0, diesFinsTancament) / 7;
}

export function valorNet(preu, jugador, { cost_llistat = 0, setmanes_venda = 1 } = {}) {
  if (preu == null) return null;
  return Math.round(preu - cost_llistat - Number(jugador?.sou ?? 0) * setmanes_venda);
}

// urgent(j): el v3 ho reduïx a l'aniversari. La clàusula de porter valuós era del model
// fàbrica (la governava la Junta, retirada a L0) i el full no la contempla.
export function urgent(diesAniversari, diesUrgencia) {
  if (diesAniversari == null || diesUrgencia == null) return false;
  return diesAniversari <= diesUrgencia;
}

// motiu_venda(j) (PAS 7): per què este jugador ix.
export function motiuVenda(jugador, { esRotatiu = false, temporada, horitzo_eixida, sobrecost = 0, enVenda = false } = {}) {
  if (esRotatiu && temporada != null && horitzo_eixida != null && temporada >= horitzo_eixida) return 'pic_de_valor';
  if (sobrecost > 0) return 'sou_desproporcionat';
  if (enVenda) return 'sobrant';
  return null;
}

// ordre_venda: primer qui més sou desproporcionat porta, després qui més val.
export function ordreVenda(candidats) {
  return [...candidats].sort((a, b) => (b.sobrecost ?? 0) - (a.sobrecost ?? 0)
    || (b.preu_esperat ?? 0) - (a.preu_esperat ?? 0));
}

// destí(j) (PAS 7). `depressio_profunda` va en FRACCIÓ, les mateixes unitats que el
// modificador de mercat: en enters (−20 contra −0,15) la branca no s'activava MAI.
export function desti(jugador, { lesionat = false, calibrat: cal = false, valor_net,
  llindar_despatx = 0, modificador_tancament, depressio_profunda, urgent: urg = false } = {}) {
  if (lesionat) return { accio: 'agenda_llistar_en_recuperar', motiu: 'lesionat' };
  if (cal && valor_net != null && valor_net < llindar_despatx) return { accio: 'despatxa', motiu: 'valor_net_baix' };
  if (modificador_tancament != null && depressio_profunda != null
    && modificador_tancament <= depressio_profunda && !urg) {
    return { accio: 'agenda_llistar', motiu: 'depressio_profunda' };
  }
  return { accio: 'llista_hui', motiu: urg ? 'urgent' : 'normal' };
}
