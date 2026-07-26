// Tonico — EL PLA DE PERSONAL (contracte v3.1, PAS 11).
//
// Viu a `lib/` i no dins de l'API perquè és una DECISIÓ, i la consumixen dos: la pantalla de
// Personal i el motor d'alertes (una plaça lliure ha d'eixir a l'informe, no només dins de la
// seua secció).
import { planPersonal, decisioRenovacio, diesRestants, placesAdmeses, sostrePersonal } from './personal_v3.js';
import { economia } from './economia.js';
import { llegixConfig } from './config.js';

// PAS 11: el pla de personal que el FLUX sosté, per prioritat. Ací no hi ha política: els
// números són poms i l'orde és el del contracte.
export async function plaPersonal(db, usuariId, ecoPrev = null) {
  const conf = await llegixConfig(db, usuariId);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const eco = ecoPrev ?? await economia(db, usuariId);
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const base = Number(await pom('staff_cost_base')) || null;
  const prioritat = JSON.parse((await pom('prioritat_personal')) || '[]');
  const quotes = JSON.parse((await db.prepare("SELECT valor FROM constants_joc WHERE clau='quotes_personal'").first())?.valor || 'null');
  const nivellMax = Number((await db.prepare("SELECT valor FROM constants_joc WHERE clau='nivell_max_personal'").first())?.valor) || 5;
  // El pressupost del personal és una QUOTA del repartible, acotada pel que pot absorbir.
  // SETMANAL: l'escala va en €/setmana (el repartible ve en unitats del període).
  const places = placesAdmeses(prioritat, quotes);
  const sostre = sostrePersonal(places, base, nivellMax);
  const pressupost = eco.flux_repartible_setmanal == null ? null
    : Math.min(eco.flux_repartible_setmanal * eco.quota_personal, sostre);
  if (pressupost == null || !base || !prioritat.length) {
    return { pressupost: null, pla: [], falten: eco.flux == null ? ['flux'] : [] };
  }
  const { pla, flux_restant, nivell } = planPersonal(pressupost, base, prioritat, { quotes, nivell_max: nivellMax });
  // L'ACCIÓ ÉS LA DIFERÈNCIA entre el pla i el DECLARAT: no es proposa contractar el que ja
  // existix ni renovar el que no toca. La identitat d'un membre és el seu `tipus`; l'agrupació
  // porta el COMPTE, perquè de tipus com l'assistent n'hi pot haver més d'un.
  const { results: membres } = await db.prepare(
    "SELECT id, COALESCE(NULLIF(tipus,''), rol) AS tipus, nivell, sou, data_fi_contracte FROM personal_membres WHERE usuari_id=?"
  ).bind(usuariId).all();
  // Els dies que queden es DERIVEN de la data: un compte declarat es congela i el venciment
  // no arriba mai (era el cas — els quatre membres deien «16» indefinidament).
  const avui = new Date().toISOString().slice(0, 10);
  for (const m of membres) m.dies_contracte = diesRestants(m.data_fi_contracte, avui);
  const perTipus = new Map();
  for (const m of membres) {
    if (!perTipus.has(m.tipus)) perTipus.set(m.tipus, []);
    perTipus.get(m.tipus).push(m);
  }
  // Dins d'un tipus, els declarats s'aparellen amb les places del pla de més nivell a menys.
  for (const llista of perTipus.values()) llista.sort((a, b) => (b.nivell ?? 0) - (a.nivell ?? 0));
  // DIES als dos costats. El pom `dies_avis_caducitat` que es llegia ací no existia ni a la
  // base: el codi queia sempre al defecte 2, comparat contra setmanes.
  const avis = Number(await pom('dies_avis_contracte'));
  const consumits = new Map();
  const amb = pla.map((x) => {
    const i = consumits.get(x.tipus) ?? 0;
    consumits.set(x.tipus, i + 1);
    const d = (perTipus.get(x.tipus) || [])[i] ?? null;      // la i-èsima plaça d'este tipus
    // RENOVAR només toca al VENCIMENT (0 ≤ dies_restants ≤ `dies_avis_contracte`). Fora
    // d'eixa finestra NO hi ha acció: dir «renova» amb 40 dies per davant és soroll, perquè
    // eixe dia no es pot fer res — i pujar de nivell a mitjan contracte és acomiadar.
    const venç = !!(d && avis && d.dies_contracte != null && d.dies_contracte >= 0 && d.dies_contracte <= avis);
    // La renovació es valora amb la base DEL SEU TIPUS: l'entrenador no cobra com la resta.
    const renovacio = venç ? decisioRenovacio(d.nivell, pressupost / places.length, base) : null;
    // QUAN es proposa (guia «Coach»/«Staff»): contractar només si la PLAÇA ESTÀ LLIURE, i
    // canviar de nivell NOMÉS AL VENCIMENT. Pujar a mitjan contracte vol dir acomiadar, i
    // acomiadar costa 2× l'estalvi — al nivell 4, 57.600 € per trencar a la setmana 10.
    // Per això una plaça ocupada i LLUNY del venciment no té acció: no n'hi ha cap possible.
    let accio = 'res', nivellAccio = null;
    if (d == null) {
      if (x.nivell > 0) { accio = 'contracta'; nivellAccio = x.nivell; }
    } else if (venç) {
      // Al venciment el nivell es pot moure als DOS sentits, i el que el flux sosté és el
      // nivell uniforme del pla. Cap amunt ho diu el pla; cap avall, `decisioRenovacio`.
      if (x.nivell > (d.nivell ?? 0)) { accio = 'renova_al_nivell'; nivellAccio = x.nivell; }
      else { accio = renovacio?.accio ?? 'res'; nivellAccio = renovacio?.nivell ?? null; }
    }
    return { ...x, nivell_declarat: d?.nivell ?? null, venciment: venç,
      accio, accio_nivell: nivellAccio,
      dies_contracte: d?.dies_contracte ?? null, membre_id: d?.id ?? null,
      sou_declarat: d?.sou ?? null,
      data_fi_contracte: d?.data_fi_contracte ?? null };
  });
  // Els membres declarats que NO s'aparellen amb cap plaça del pla (un tipus fora de la
  // prioritat, o un de més dels que la quota admet). Han d'eixir igual: existixen i cobren.
  const aparellats = new Set(amb.map((x) => x.membre_id).filter((x) => x != null));
  const fora = membres.filter((m) => !aparellats.has(m.id))
    .map((m) => ({ tipus: m.tipus, membre_id: m.id, nivell_declarat: m.nivell ?? null,
      sou_declarat: m.sou ?? null, dies_contracte: m.dies_contracte,
      data_fi_contracte: m.data_fi_contracte ?? null }));
  // `quota_pct` en base 100: la vista no pot multiplicar per 100 (invariant 12) i `percent()`
  // arrodonia 0,40 a 0 — d'ací el «(0% del flux repartible)» que no volia dir res.
  return { pressupost, sostre, quota: eco.quota_personal, quota_pct: eco.quota_personal * 100,
    flux_repartible_setmanal: eco.flux_repartible_setmanal, nivell, flux_restant,
    gastat: pressupost - flux_restant, dies_avis: avis || null,
    staff_cost_base: base, places: places.length, pla: amb, membres_fora: fora, falten: [] };
}

