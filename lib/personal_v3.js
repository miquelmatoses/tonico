// Tonico — PERSONAL (contracte v3.1, PAS 11). BUCLE DE FLUX: el personal consumix sou
// setmanal, no caixa. El cost depén del NIVELL i de la BASE DEL TIPUS. Per això no es
// compara eficiència entre tipus — se seguix una PRIORITAT fixa i cada tipus s'emporta el
// nivell més alt que el flux restant sostinga.
//
//   cost_flux(tipus, nivell) = base(tipus) × 2^(nivell−1)
//   base(tipus)              = `prioritat_personal`[tipus].base, o `staff_cost_base`
//   flux_lliure              = MAX(0; flux + per_periode(personal) − reserva_flux)
//   nivell(tipus)            = MAX(n : cost acumulat ≤ flux_lliure), seguint la prioritat
//
// DUES BASES, no una (v3.1): 1.020 els especialistes, 1.250 l'entrenador. L'informe real de
// HT ho prova — 3 especialistes de nivell 2 (3 × 2.040) + entrenador de nivell 3 (5.000) =
// 11.120 €. Amb una sola base de 1.020 els 5.000 € serien IMPOSSIBLES: tota suma de nivells
// és múltiple de 1.020, i 5.000 no ho és.
//
// L'única decisió reversible és RENOVAR al venciment: acomiadar NO existix. Contractar és
// comprometre's, i això es diu abans de fer-ho.

export function costFlux(nivell, base) {
  if (nivell == null || nivell < 1 || base == null) return null;
  return base * Math.pow(2, nivell - 1);
}

// base(tipus): la que declara el tipus a `prioritat_personal`, si no la de defecte. Cap
// número ací (invariant 8): les dues bases són dades.
export function baseTipus(tipus, prioritat, baseDefecte = null) {
  const e = (prioritat || []).find((p) => p.tipus === tipus);
  return e?.base ?? baseDefecte;
}

// El nivell més alt que un pressupost paga (per a un sol membre).
export function nivellPagable(pressupost, base, nivellMax = 5) {
  if (pressupost == null || base == null) return 0;
  let millor = 0;
  for (let n = 1; n <= nivellMax; n++) if (costFlux(n, base) <= pressupost) millor = n;
  return millor;
}

// ── L'ENTRENADOR ─────────────────────────────────────────────────────────────────────────
// La mateixa forma que el personal, amb UNA plaça: una quota declarada dels ingressos, i el
// nivell com a conseqüència. Res més, perquè res més fa falta — `nivellPagable` ja existix.
//
// EL SEU NIVELL NO ES DEMANA, ES DERIVA DEL SEU SOU. L'escala és base × 2^(n−1) i el sou està
// declarat a la seua fitxa: preguntar-li el nivell seria demanar una dada que ja tenim, i
// obrir la porta a que les dues es contradiguen.
//
// I ÉS UNA VARA, NO UN REPARTIMENT. No lleva diner a ningú ni canvia cap altre pressupost:
// només diu quin nivell sostenen els ingressos, com `nivell_objectiu` fa amb els jugadors. El
// dia que el sostingut passe el que tens, és quan hi ha una acció.
export function nivellDelSou(sou, base) {
  if (sou == null || !base) return null;
  const n = Math.log2(sou / base) + 1;
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function entrenadorSostingut({ ingressosSetmanals, quota, base, nivellMax = 5, souActual = null }) {
  if (ingressosSetmanals == null || quota == null || base == null) return null;
  const pressupost = ingressosSetmanals * quota;
  const nivell = nivellPagable(pressupost, base, nivellMax);
  const actual = nivellDelSou(souActual, base);
  return {
    pressupost,
    nivell_sostingut: nivell,
    cost_sostingut: costFlux(nivell, base),
    nivell_actual: actual,
    // Millorable només quan se sap on estàs: sense sou declarat no hi ha comparació, i
    // inventar-la seria dir «puja'l» sense saber de què.
    millorable: actual != null && nivell > actual,
    seguent_cost: actual != null && actual < nivellMax ? costFlux(actual + 1, base) : null,
  };
}

// PAS 11: EL PLA DE PERSONAL.
//
// AMPLADA ABANS QUE PROFUNDITAT, i no és criteri nostre: l'efecte és LINEAL i el cost
// EXPONENCIAL (guia «Staff»). Amb el mateix diner, 4 places a nivell 1 donen 4,0 punts
// d'efecte i una plaça a nivell 3 en dona 0,6 — sis vegades menys. Per tant MAI es deixa una
// plaça buida per a pujar-ne una altra: totes al mateix nivell, pujant mentre el pressupost
// aguante.
//
// Això substituïx el repartiment VORAÇ (el primer tipus s'enduia el màxim i els últims es
// quedaven a zero), que deixava Miquel amb un assistent boníssim i sense metge.
//
//   places   = les que la QUOTA del joc permet (4 en total, 2 assistents, 1 de cada altre)
//   nivell   = MAX(n : SUMA(places × cost(n)) ≤ pressupost)
export function placesAdmeses(prioritat, quotes, admet = () => true) {
  const places = [];
  const perTipus = {};
  for (const { tipus, quants = 1 } of prioritat || []) {
    if (!admet(tipus)) continue;
    const maxTipus = quotes?.per_tipus?.[tipus] ?? quants;
    for (let i = 0; i < Math.min(quants, maxTipus); i++) {
      if (quotes?.total != null && places.length >= quotes.total) return places;   // quota global
      perTipus[tipus] = (perTipus[tipus] ?? 0) + 1;
      places.push({ tipus, index: perTipus[tipus] });
    }
  }
  return places;
}

// El nivell UNIFORME més alt que el pressupost paga per a totes les places alhora.
export function nivellUniforme(places, pressupost, base, nivellMax = 5) {
  if (pressupost == null || base == null || !places.length) return 0;
  let millor = 0;
  for (let n = 1; n <= nivellMax; n++) {
    const cost = places.reduce((a, p) => a + costFlux(n, p.base ?? base), 0);
    if (cost <= pressupost) millor = n;
  }
  return millor;
}

// El sostre absorbible: més enllà d'això el personal no pot gastar, i el sobrant ha d'anar
// als jugadors en compte de quedar-se reservat sense poder-se gastar.
export function sostrePersonal(places, base, nivellMax = 5) {
  return places.reduce((a, p) => a + (costFlux(nivellMax, p.base ?? base) ?? 0), 0);
}

export function planPersonal(pressupost, base, prioritat, opts = {}) {
  const { nivell_max = 5, admet = () => true, quotes = null } = opts;
  const places = placesAdmeses(prioritat, quotes, admet);
  const nivell = nivellUniforme(places, pressupost, base, nivell_max);
  const pla = places.map((p) => ({ tipus: p.tipus, nivell, cost: nivell ? costFlux(nivell, base) : 0, base }));
  const gastat = pla.reduce((a, x) => a + x.cost, 0);
  return { pla, flux_restant: (pressupost ?? 0) - gastat, nivell, places: places.length };
}

// dies_restants: es DERIVA de la data de fi i del dia de veres. Abans era un COMPTE declarat
// que ningú decrementava, així que es quedava congelat i el venciment no arribava mai.
// Sense data no es suposa res: null, i qui ho consumix ho ha de dir.
//
// EN DIES, no en setmanes: el full comparava «setmanes_restants ≤ `dies_avis_caducitat`», és a
// dir setmanes contra un pom de dies. Amb la unitat mal posada la frontera no volia dir res.
export function diesRestants(dataFi, hui) {
  if (!dataFi || !hui) return null;
  const dies = (new Date(dataFi) - new Date(hui)) / 86400000;
  return Number.isFinite(dies) ? Math.ceil(dies) : null;
}

// RENOVAR (l'única decisió reversible). Al venciment: si el flux encara paga el nivell
// actual, es renova; si no, es baixa al nivell més alt que sí que pague; si no n'hi ha cap,
// no es renova.
export function decisioRenovacio(nivellActual, fluxLliure, base, nivellMax = 5) {
  if (nivellActual == null) return { accio: 'no_renoves', nivell: null };
  if (costFlux(nivellActual, base) <= (fluxLliure ?? 0)) return { accio: 'renova', nivell: nivellActual };
  const n = nivellPagable(fluxLliure, base, Math.min(nivellMax, nivellActual - 1));
  return n > 0 ? { accio: 'renova_al_nivell', nivell: n } : { accio: 'no_renoves', nivell: null };
}
