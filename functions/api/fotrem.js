// Tonico — Fotrem (Fase 7). GET la vista dels juvenils (habilitats 3 estats,
// projecció d'aterratge, avaluació de crida) + decisions; POST fixa una decisió.
import { carregaAncora } from './pujar.js';
import { vistaJuvenil } from '../../lib/fotrem.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const llindars = pla ? JSON.parse((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='crida_llindars'").bind(pla.plantilla).first())?.valor || 'null') : null;

  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(data.usuari.id).first();
  if (!equip) return json({ juvenils: [], llindars });
  const inst = await env.DB.prepare('SELECT id, data FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return json({ juvenils: [], llindars });

  const ancora = await carregaAncora(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT ij.*, j.nom, j.id AS jugador_id, je.estat, je.nota
       FROM instantanies_juvenils ij JOIN jugadors j ON j.id = ij.jugador_id
       LEFT JOIN juvenils_estat je ON je.jugador_id = j.id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  const juvenils = results.map((f) => ({ ...vistaJuvenil(f, inst.data, ancora, llindars), nota: f.nota || null }));
  return json({ juvenils, llindars });
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
