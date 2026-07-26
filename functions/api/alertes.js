// Tonico — alertes d'esta setmana. GET les actives (ordenades per urgència);
// POST per marcar estat (vista/ignorada) o regenerar sota demanda.
import { estatRevisio } from '../../lib/orquestra_alertes.js';
import { regeneraPipeline } from '../../lib/pipeline.js';

import { nivellAccio } from '../../lib/informe.js';

export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.missatge_clau, a.parametres, a.urgencia, a.estat, a.diners, j.nom AS jugador
       FROM alertes a LEFT JOIN jugadors j ON j.id = a.jugador_id
      WHERE a.usuari_id = ? AND a.estat = 'nova'
      ORDER BY a.urgencia DESC, a.id`
  ).bind(data.usuari.id).all();
  // AGENDA: accions amb data futura, agrupades per dia (principi «l'informe és
  // l'agenda de hui»). Es deriven cada revisió; ací només es lligen i s'agrupen.
  const { results: age } = await env.DB.prepare(
    `SELECT missatge_clau, parametres, data_accio FROM alertes
      WHERE usuari_id = ? AND estat = 'agenda' AND data_accio IS NOT NULL
      ORDER BY data_accio, id`
  ).bind(data.usuari.id).all();
  const perDia = new Map();
  for (const a of age) {
    if (!perDia.has(a.data_accio)) perDia.set(a.data_accio, []);
    perDia.get(a.data_accio).push({ clau: a.missatge_clau, parametres: a.parametres ? JSON.parse(a.parametres) : {} });
  }
  const agenda = [...perDia].map(([data_accio, accions]) => ({ data: data_accio, accions }));
  const { revisat, instantania } = await estatRevisio(env.DB, data.usuari.id);
  const llind = async (clau) => {
    const f = await env.DB.prepare(
      "SELECT valor FROM plantilles_parametres WHERE plantilla=(SELECT estrategia FROM config_usuari WHERE usuari_id=?) AND clau=?"
    ).bind(data.usuari.id, clau).first();
    return f?.valor != null ? parseInt(f.valor, 10) : null;
  };
  const llindars = { llindar_urgent: await llind('llindar_urgent'), llindar_aviat: await llind('llindar_aviat') };
  const ambNivell = (a) => ({ ...a, nivell: nivellAccio(a.urgencia, llindars) });

  return json({
    alertes: results.map((a) => ambNivell({ ...a, parametres: a.parametres ? JSON.parse(a.parametres) : {},
      diners: a.diners ? JSON.parse(a.diners) : null })),
    agenda, revisat, instantania,
  });
}

export async function onRequestPost({ request, env, data }) {
  const cos = await request.json().catch(() => ({}));
  if (cos.accio === 'regenerar') return json(await regeneraPipeline(env.DB, data.usuari.id));

  if (!cos.id || !['vista', 'ignorada', 'resolta'].includes(cos.estat)) return json({ error: 'dades_invalides' }, 400);
  const r = await env.DB.prepare('UPDATE alertes SET estat = ? WHERE id = ? AND usuari_id = ?')
    .bind(cos.estat, cos.id, data.usuari.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
