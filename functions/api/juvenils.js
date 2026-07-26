// Tonico — Juvenils (Fase 7). GET la vista dels juvenils (habilitats 3 estats,
// projecció d'aterratge, avaluació de crida) + decisions; POST fixa una decisió.
import { carregaAncora } from './pujar.js';
import { vistaJuvenil } from '../../lib/juvenils_vista.js';
import { entrenamentPrescrit } from '../../lib/entrenament_places.js';
import { recomanaJoc } from '../../lib/juvenil.js';
import { alineaJuvenil } from '../../lib/alineacio_juvenil.js';
import { ranquingJuvenil, lecturaPromocio } from '../../lib/ranquing_juvenil.js';
import { estatCrida } from '../../lib/crida.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const llindars = pla ? JSON.parse((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='crida_llindars'").bind(pla.plantilla).first())?.valor || 'null') : null;
  // Pipeline de la fase (habilitat principal/secundària que entrena la fàbrica).
  const pres = pla ? await entrenamentPrescrit(env.DB, pla.plantilla) : null;
  // El pipeline juvenil llig la PRESCRIPCIÓ del contracte (PAS 1), no una fase.
  const pipeline = pres && { principal: pres.skill, secundari: pres.skill_b };

  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(data.usuari.id).first();
  if (!equip) return json({ juvenils: [], llindars, pipeline });
  const inst = await env.DB.prepare('SELECT id, data FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return json({ juvenils: [], llindars, pipeline });

  const ancora = await carregaAncora(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT ij.*, j.nom, j.especialitat, j.id AS jugador_id, je.estat, je.nota
       FROM instantanies_juvenils ij JOIN jugadors j ON j.id = ij.jugador_id
       LEFT JOIN juvenils_estat je ON je.jugador_id = j.id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  const juvenils = results.map((f) => { const v = vistaJuvenil(f, inst.data, ancora, llindars, pipeline); return { ...v, joc: recomanaJoc(v), nota: f.nota || null }; });
  // RÀNQUING ÚNIC v3 per NIVELL numèric. Entrenaments A/B, pesos i marges = config
  // (generalitat). Els juvenils porten els camps d'habilitat.
  const pom = async (clau, def) => parseFloat((pla && (await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor) || def);
  const entA = (pla && (await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='entrenament_a'").bind(pla.plantilla).first())?.valor) || pipeline?.principal;
  const entB = (pla && (await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='entrenament_b'").bind(pla.plantilla).first())?.valor) || pipeline?.secundari;
  const nivellOpts = { entrenamentA: entA, entrenamentB: entB,
    pes_a: await pom('nivell_pes_a', '1'), pes_b: await pom('nivell_pes_b', '0.66'),
    f_marge: await pom('nivell_f_marge', '0.5'), marge_esperat: await pom('nivell_marge_esperat', '3'),
    valor_esperat_desconegut_defecte: await pom('nivell_valor_desconegut_defecte', '5') };
  const rang = ranquingJuvenil(results, nivellOpts);
  const rangPerId = new Map(rang.map((x) => [x.jugador_id, x]));
  for (const jv of juvenils) { const r = rangPerId.get(jv.jugador_id); jv.nivell = r?.nivell ?? null; jv.posicio_rang = r?.posicio_rang ?? 999; }
  juvenils.sort((a, b) => a.posicio_rang - b.posicio_rang);
  // Onze juvenil: maximitza el valor entrenable (formació + taula d'entrenament config).
  const formacio = pla ? JSON.parse((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='formacio_juvenil'").bind(pla.plantilla).first())?.valor || 'null') : null;
  const revelacioMinuts = parseInt((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='revelacio_minuts'").first())?.valor || '44', 10);
  const minim = parseInt((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='minim_jugadors'").first())?.valor || '9', 10);
  const maxims = JSON.parse((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='maxims_posicio'").first())?.valor || '{}');
  const taulaEntrenament = JSON.parse((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='taula_entrenament'").first())?.valor || '{}');
  const potencialEsperat = await pom('nivell_potencial_esperat', '6');
  const juvNivell = results.map((f) => ({ ...f, nivell: rangPerId.get(f.jugador_id)?.nivell ?? 0 }));
  const onze_juvenil = formacio ? { ...alineaJuvenil(juvNivell, { formacio, maxims, minim, entrenamentA: entA, entrenamentB: entB, taulaEntrenament,
    marge_esperat: nivellOpts.marge_esperat, f_marge: nivellOpts.f_marge, pes_a: nivellOpts.pes_a, pes_b: nivellOpts.pes_b,
    potencial_esperat: potencialEsperat, valor_esperat_desconegut_defecte: nivellOpts.valor_esperat_desconegut_defecte }), revelacio_minuts: revelacioMinuts } : null;
  const crida = await estatCrida(env.DB, data.usuari.id, inst.data);   // rellotge de crida (derivat)
  // 4a: proposta de promoció setmanal (millor NIVELL elegible: 17a + 112d). 4b: la cua del
  // rànquing (nivell més baix) són els candidats a eixida/despatx.
  const edatMin = parseInt((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='promocio_edat_min_anys'").first())?.valor || '17', 10);
  const diesMin = parseInt((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='promocio_dies_min_academia'").first())?.valor || '112', 10);
  const promocio = lecturaPromocio(rang, results, { edat_min: edatMin, dies_academia_min: diesMin });
  return json({ juvenils, llindars, pipeline, onze_juvenil, crida, promocio, ranquing: rang });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.jugador_id || !['seguiment', 'elegit', 'cua_eixida'].includes(c.estat)) return json({ error: 'dades_invalides' }, 400);
  const j = await env.DB.prepare('SELECT j.id FROM jugadors j JOIN equips e ON e.id=j.equip_id WHERE j.id=? AND e.usuari_id=?').bind(c.jugador_id, data.usuari.id).first();
  if (!j) return json({ error: 'no_trobat' }, 404);
  await env.DB.prepare(
    `INSERT INTO juvenils_estat (jugador_id, estat, nota) VALUES (?, ?, ?)
     ON CONFLICT(jugador_id) DO UPDATE SET estat=excluded.estat, nota=excluded.nota`
  ).bind(c.jugador_id, c.estat, c.nota || null).run();
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
