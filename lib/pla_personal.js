// Tonico — EL PLA DE PERSONAL (contracte v3.1, PAS 11).
//
// Viu a `lib/` i no dins de l'API perquè és una DECISIÓ, i la consumixen dos: la pantalla de
// Personal i el motor d'alertes (una plaça lliure ha d'eixir a l'informe, no només dins de la
// seua secció).
import { planPersonal, decisioRenovacio, setmanesRestants, placesAdmeses, sostrePersonal } from './personal_v3.js';
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
    "SELECT COALESCE(NULLIF(tipus,''), rol) AS tipus, nivell, data_fi_contracte FROM personal_membres WHERE usuari_id=?"
  ).bind(usuariId).all();
  // Les setmanes que queden es DERIVEN de la data: un compte declarat es congela i el
  // venciment no arriba mai (era el cas — els quatre membres deien «16» indefinidament).
  const avui = new Date().toISOString().slice(0, 10);
  for (const m of membres) m.setmanes_contracte = setmanesRestants(m.data_fi_contracte, avui);
  const perTipus = new Map();
  for (const m of membres) {
    if (!perTipus.has(m.tipus)) perTipus.set(m.tipus, []);
    perTipus.get(m.tipus).push(m);
  }
  // Dins d'un tipus, els declarats s'aparellen amb les places del pla de més nivell a menys.
  for (const llista of perTipus.values()) llista.sort((a, b) => (b.nivell ?? 0) - (a.nivell ?? 0));
  const avis = Number(await pom('dies_avis_caducitat')) || 2;
  const consumits = new Map();
  const amb = pla.map((x) => {
    const i = consumits.get(x.tipus) ?? 0;
    consumits.set(x.tipus, i + 1);
    const d = (perTipus.get(x.tipus) || [])[i] ?? null;      // la i-èsima plaça d'este tipus
    // RENOVAR només toca al VENCIMENT (0 ≤ setmanes_restants ≤ dies_avis_caducitat).
    const venç = d && d.setmanes_contracte != null && d.setmanes_contracte >= 0 && d.setmanes_contracte <= avis;
    // La renovació es valora amb la base DEL SEU TIPUS: l'entrenador no cobra com la resta.
    const renovacio = venç ? decisioRenovacio(d.nivell, pressupost / places.length, base) : null;
    // QUAN es proposa (guia «Coach»/«Staff»): contractar només si la PLAÇA ESTÀ LLIURE, i
    // pujar de nivell NOMÉS AL VENCIMENT. Pujar a mitjan contracte vol dir acomiadar, i
    // acomiadar costa 2× l'estalvi — al nivell 4, 57.600 € per trencar a la setmana 10.
    let accio = 'res';
    if (d == null) accio = x.nivell > 0 ? 'contracta' : 'res';
    else if (venç) accio = renovacio?.accio ?? 'res';
    else if (x.nivell > d.nivell) accio = 'puja_al_venciment';
    return { ...x, nivell_declarat: d?.nivell ?? null, venciment: !!venç,
      accio, renovacio: renovacio?.accio ?? null, renovacio_nivell: renovacio?.nivell ?? null,
      setmanes_contracte: d?.setmanes_contracte ?? null,
      data_fi_contracte: d?.data_fi_contracte ?? null };
  });
  return { pressupost, sostre, quota: eco.quota_personal, nivell, flux_restant,
    staff_cost_base: base, places: places.length, pla: amb, falten: [] };
}

