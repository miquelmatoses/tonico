// Tonico — personal i entrenament (Fase 8). GET l'esperat per la fase, el
// declarat, els desquadres i el checklist de canvi cap a les altres fases;
// POST declara un element del personal actual.
import { comparaPersonal, checklistCanviFase } from '../../lib/personal.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla, fase_actual FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  if (!pla) return json({ error: 'sense_pla' }, 404);

  const { results: dec } = await env.DB.prepare('SELECT clau, valor FROM personal_declarat WHERE usuari_id=?').bind(data.usuari.id).all();
  const declarat = Object.fromEntries(dec.map((d) => [d.clau, d.valor]));

  const { results: fases } = await env.DB.prepare('SELECT fase, config FROM fases_config WHERE plantilla=? ORDER BY fase').bind(pla.plantilla).all();
  const actual = fases.find((f) => f.fase === pla.fase_actual);
  const esperat = actual ? JSON.parse(actual.config) : { personal: {} };
  const desquadres = comparaPersonal(esperat.personal, declarat);

  const checklists = fases.filter((f) => f.fase !== pla.fase_actual)
    .map((f) => ({ fase: f.fase, ...checklistCanviFase(JSON.parse(f.config), declarat) }));

  return json({ fase_actual: pla.fase_actual, esperat, declarat, desquadres, checklists });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.clau || c.valor == null || isNaN(Number(c.valor))) return json({ error: 'dades_invalides' }, 400);
  await env.DB.prepare(
    'INSERT INTO personal_declarat (usuari_id, clau, valor) VALUES (?, ?, ?) ON CONFLICT(usuari_id, clau) DO UPDATE SET valor=excluded.valor'
  ).bind(data.usuari.id, c.clau, Math.round(Number(c.valor))).run();
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
