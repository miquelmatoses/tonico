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

  return json({ fase_actual: pla.fase_actual, esperat, membres, desquadres, checklists, entrenament });
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
