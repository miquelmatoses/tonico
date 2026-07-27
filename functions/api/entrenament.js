// Tonico — ENTRENAMENT (PAS 1). El que s'ENTRENA es prescriu; el que es DECLARA és
// l'entrenador, perquè el seu nivell entra a la velocitat d'entrenament i no es pot derivar
// de res.
//
// Ací viu l'entrenador i no a Personal: no és especialista, no gasta cap de les 4 places, no
// cobra per l'escala d'especialistes i no té contracte de 16 setmanes.
import { entrenamentPrescrit } from '../../lib/entrenament_places.js';
import { llegixConfig } from '../../lib/config.js';

export async function onRequestGet({ env, data }) {
  const conf = await llegixConfig(env.DB, data.usuari.id);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const prescrit = await entrenamentPrescrit(env.DB, estrategia);
  const pom = async (clau) => (await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const constant = async (clau) => {
    const f = await env.DB.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first();
    return f?.valor ? JSON.parse(f.valor) : null;
  };
  const entrenador = await env.DB.prepare(
    "SELECT id, coach_entrenament, coach_lideratge, sou FROM personal_membres WHERE usuari_id=? AND rol='entrenador' LIMIT 1"
  ).bind(data.usuari.id).first();
  const assistents = (await env.DB.prepare(
    "SELECT COALESCE(SUM(nivell),0) n FROM personal_membres WHERE usuari_id=? AND tipus='assistent'"
  ).bind(data.usuari.id).first())?.n ?? 0;

  return json({
    prescrit,
    // Els dos que Miquel va dir que són prescripció i no decisió.
    intensitat: Number(await pom('entrenament_intensitat')),
    resistencia: Number(await pom('entrenament_resistencia')),
    entrenador: entrenador ?? null,
    assistents,
    // Les opcions de nivell d'entrenador i què val cada una: no és un desplegable inventat.
    eficiencia: await constant('coach_eficiencia'),
  });
}

// Declarar o editar l'entrenador. És l'ÚNICA cosa que es declara d'esta secció.
export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  const eficiencia = JSON.parse((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='coach_eficiencia'").first())?.valor || '{}');
  if (c.coach_entrenament != null && !(c.coach_entrenament in eficiencia)) {
    return json({ error: 'nivell_invalid' }, 400);
  }
  const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));
  const camps = [c.coach_entrenament || null, enter(c.coach_lideratge), enter(c.sou)];
  const seu = await env.DB.prepare("SELECT id FROM personal_membres WHERE usuari_id=? AND rol='entrenador' LIMIT 1").bind(data.usuari.id).first();
  if (seu) {
    await env.DB.prepare('UPDATE personal_membres SET coach_entrenament=?, coach_lideratge=?, sou=? WHERE id=?')
      .bind(...camps, seu.id).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO personal_membres (usuari_id, rol, tipus, coach_entrenament, coach_lideratge, sou) VALUES (?, 'entrenador', 'entrenador', ?, ?, ?)"
    ).bind(data.usuari.id, ...camps).run();
  }
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
