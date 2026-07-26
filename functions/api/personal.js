// Tonico — PERSONAL (PAS 11). Els especialistes que el flux sosté: tipus, nivell, sou i data
// de fi de contracte. GET torna els membres i el pla de flux; POST afig/edita; DELETE esborra.
//
// Ni entrenament ni entrenador: l'entrenament es PRESCRIU i l'entrenador no és especialista
// (no gasta plaça, no cobra per esta escala, no té contracte de 16 setmanes). Tots dos van a la
// secció d'Entrenament quan la fem.

const ROLS = ['entrenador', 'especialista'];
const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));

import { plaPersonal } from '../../lib/pla_personal.js';
import { diesRestants } from '../../lib/personal_v3.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  if (!pla) return json({ error: 'sense_pla' }, 404);
  // CAP BLOC D'ENTRENAMENT ací. Es prescriu (no es tria ni es confirma) i, amb l'entrenador,
  // se'n va a la secció d'Entrenament quan la fem. Personal és personal.

  // L'ENTRENADOR no és personal: no gasta plaça, no cobra per esta escala i no té contracte
  // de 16 setmanes. Fora d'esta llista (el seu sou segueix comptant al flux).
  const { results: membres } = await env.DB.prepare(
    "SELECT id, rol, tipus, nivell, sou, data_fi_contracte FROM personal_membres WHERE usuari_id=? AND rol <> 'entrenador' ORDER BY tipus, id"
  ).bind(data.usuari.id).all();
  // Els dies que queden es DERIVEN de la data (mai declarats: un compte es congela).
  const avuiGet = new Date().toISOString().slice(0, 10);
  for (const m of membres) m.dies_contracte = diesRestants(m.data_fi_contracte, avuiGet);
  // FORA `fases_config`: era del model fàbrica (fases `fabrica`/`inflexio`/`competitiu`) i no
  // lligava ni amb la fase real. Els «desquadres» es calculaven contra el no-res i els
  // checklists encara servien el paquet d'inflexió. Qui diu ara què falta és el pla de flux.
  const pla_flux = await plaPersonal(env.DB, data.usuari.id);
  return json({ fase_actual: pla.fase_actual, membres, pla_flux });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!ROLS.includes(c.rol)) return json({ error: 'rol_invalid' }, 400);
  const camps = [c.rol, c.tipus || null, enter(c.nivell), enter(c.sou), c.data_fi_contracte || null];
  if (c.id) {                                        // edició d'un membre propi
    const own = await env.DB.prepare('SELECT id FROM personal_membres WHERE id=? AND usuari_id=?').bind(c.id, data.usuari.id).first();
    if (!own) return json({ error: 'no_trobat' }, 404);
    await env.DB.prepare('UPDATE personal_membres SET rol=?, tipus=?, nivell=?, sou=?, data_fi_contracte=? WHERE id=?').bind(...camps, c.id).run();
    return json({ ok: true });
  }
  await env.DB.prepare('INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou, data_fi_contracte) VALUES (?, ?, ?, ?, ?, ?)').bind(data.usuari.id, ...camps).run();
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
