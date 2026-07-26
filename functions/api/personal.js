// Tonico — personal i entrenament (Fase 8 + Àrea B). Model RIC: membres amb rol
// (entrenador/especialista), tipus, nivell, sou i setmanes de contracte. GET
// l'esperat per la fase + els membres + desquadres + checklist; POST afig/edita un
// membre; DELETE l'esborra. El desquadre compara el COMPTE d'especialistes per
// tipus amb l'esperat de la fase.
import { comparaPersonal, checklistCanviFase } from '../../lib/personal.js';
import { entrenamentFase } from '../../lib/entrenament.js';

const ROLS = ['entrenador', 'especialista'];
const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));

// Compte d'especialistes per tipus (per comparar amb l'esperat de la fase).
function compteEspecialistes(membres) {
  const c = {};
  for (const m of membres) if (m.rol === 'especialista' && m.tipus) c[m.tipus] = (c[m.tipus] || 0) + 1;
  return c;
}

import { planPersonal, decisioRenovacio, baseTipus } from '../../lib/personal_v3.js';
import { economia } from '../../lib/economia.js';
import { llegixConfig } from '../../lib/config.js';
import { normalitzaDivisio, divisioArab } from '../../lib/divisio.js';

// PAS 11: el pla de personal que el FLUX sosté, per prioritat. Ací no hi ha política: els
// números són poms i l'orde és el del contracte.
async function plaFlux(db, usuariId) {
  const conf = await llegixConfig(db, usuariId);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const eco = await economia(db, usuariId);
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const base = Number(await pom('staff_cost_base')) || null;
  const prioritat = JSON.parse((await pom('prioritat_personal')) || '[]');
  const divisioPsic = normalitzaDivisio(await pom('divisio_psicoleg'));
  const fluxLliure = eco.flux_lliure;
  if (fluxLliure == null || !base || !prioritat.length) {
    return { flux_lliure: fluxLliure, pla: [], falten: eco.flux == null ? ['flux'] : [] };
  }
  // El psicòleg només de `divisio_psicoleg` cap amunt (número de divisió més baix = més alta).
  const admet = (tipus) => {
    if (tipus !== 'psicoleg') return true;
    const meua = divisioArab(conf?.divisio); const llindar = divisioArab(divisioPsic);
    return meua != null && llindar != null && meua <= llindar;
  };
  const { pla, flux_restant } = planPersonal(fluxLliure, base, prioritat, { admet });
  // L'ACCIÓ ÉS LA DIFERÈNCIA entre el pla i el DECLARAT: no es proposa contractar el que ja
  // existix ni renovar el que no toca. La identitat d'un membre és el seu `tipus`; l'agrupació
  // porta el COMPTE, perquè de tipus com l'assistent n'hi pot haver més d'un.
  const { results: membres } = await db.prepare(
    "SELECT COALESCE(NULLIF(tipus,''), rol) AS tipus, nivell, setmanes_contracte FROM personal_membres WHERE usuari_id=?"
  ).bind(usuariId).all();
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
    const renovacio = venç ? decisioRenovacio(d.nivell, fluxLliure, baseTipus(x.tipus, prioritat, base)) : null;
    let accio = 'res';
    if (x.exclos) accio = 'exclos';
    else if (d == null) accio = x.nivell > 0 ? 'contracta' : 'res';
    else if (venç) accio = renovacio?.accio ?? 'res';
    else if (x.nivell > d.nivell) accio = 'puja';
    return { ...x, nivell_declarat: d?.nivell ?? null, venciment: !!venç,
      accio, renovacio: renovacio?.accio ?? null, renovacio_nivell: renovacio?.nivell ?? null,
      setmanes_contracte: d?.setmanes_contracte ?? null };
  });
  return { flux_lliure: fluxLliure, flux_restant, staff_cost_base: base, pla: amb, falten: [] };
}

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  if (!pla) return json({ error: 'sense_pla' }, 404);
  const params = pla.parametres ? JSON.parse(pla.parametres) : {};
  const prescrit = await entrenamentFase(env.DB, pla.plantilla, pla.fase_actual);
  // Entrenament SÈNIOR triable: l'usuari pot canviar-lo i tot el sistema (places, %,
  // cobertura, anells) es deriva. Opcions = habilitats de la taula d'entrenament.
  const taula = JSON.parse((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='taula_entrenament'").first())?.valor || '{}');
  const entrenament = {
    prescrit,
    confirmat: params.entrenament_confirmat ?? null,
    senior: params.entrenament_senior || prescrit?.principal || prescrit?.tipus || null,
    opcions: Object.keys(taula),
  };

  const { results: membres } = await env.DB.prepare(
    'SELECT id, rol, tipus, nivell, sou, setmanes_contracte FROM personal_membres WHERE usuari_id=? ORDER BY rol, tipus, id'
  ).bind(data.usuari.id).all();
  const compte = compteEspecialistes(membres);

  const { results: fases } = await env.DB.prepare('SELECT fase, config FROM fases_config WHERE plantilla=? ORDER BY fase').bind(pla.plantilla).all();
  const actual = fases.find((f) => f.fase === pla.fase_actual);
  const esperat = actual ? JSON.parse(actual.config) : { personal: {} };
  const desquadres = comparaPersonal(esperat.personal, compte);
  const checklists = fases.filter((f) => f.fase !== pla.fase_actual)
    .map((f) => ({ fase: f.fase, ...checklistCanviFase(JSON.parse(f.config), compte) }));

  const pla_flux = await plaFlux(env.DB, data.usuari.id);
  return json({ fase_actual: pla.fase_actual, esperat, membres, desquadres, checklists, entrenament , pla_flux });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!ROLS.includes(c.rol)) return json({ error: 'rol_invalid' }, 400);
  const camps = [c.rol, c.tipus || null, enter(c.nivell), enter(c.sou), enter(c.setmanes_contracte)];
  if (c.id) {                                        // edició d'un membre propi
    const own = await env.DB.prepare('SELECT id FROM personal_membres WHERE id=? AND usuari_id=?').bind(c.id, data.usuari.id).first();
    if (!own) return json({ error: 'no_trobat' }, 404);
    await env.DB.prepare('UPDATE personal_membres SET rol=?, tipus=?, nivell=?, sou=?, setmanes_contracte=? WHERE id=?').bind(...camps, c.id).run();
    return json({ ok: true });
  }
  await env.DB.prepare('INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou, setmanes_contracte) VALUES (?, ?, ?, ?, ?, ?)').bind(data.usuari.id, ...camps).run();
  return json({ ok: true }, 201);
}

export async function onRequestDelete({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.id) return json({ error: 'falta_id' }, 400);
  await env.DB.prepare('DELETE FROM personal_membres WHERE id=? AND usuari_id=?').bind(c.id, data.usuari.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
