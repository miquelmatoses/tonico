import { economia } from '../../lib/economia.js';

const hui = () => new Date().toISOString().slice(0, 10);

// Tonico — finances declarades (contracte v3.1, PAS 3). De l'informe setmanal de HT es
// declaren els ingressos recurrents BI-SETMANALS (taquilla + patrocini) del període TANCAT i
// la caixa («Diners disponibles»). Més el manteniment d'estadi i els números de la
// calculadora, que Tonico consumix i no pot derivar. GET l'estat, POST fa merge dels camps
// enviats (no trepitja els que no vénen).
// v3.1: `despesa_planter` es DERIVA (sistema_juvenil + n_cercapromeses) i `ingres_setmanal`
// i `premis` han eixit del flux. Els ingressos recurrents són BI-SETMANALS i es declaren del
// període TANCAT (`periode_data`), mai de la setmana en curs.
// Les QUATRE coses que es declaren de l'informe, i prou: taquilla i patrocinadors de les dos
// setmanes del període, diners disponibles i manteniment d'estadi. Els tres números de la
// calculadora van a banda perquè són d'una altra cadència (un colp per temporada, amb caducitat).
const CAMPS = ['caixa', 'caixa_data', 'despesa_estadi',
  'taquilla_s1', 'patrocini_s1', 'taquilla_s2', 'patrocini_s2',
  'estadi_manteniment', 'estadi_cost_obra', 'estadi_data'];
const COLS = CAMPS.join(', ');

export async function onRequestGet({ env, data }) {
  const f = await env.DB.prepare(
    `SELECT ${COLS} FROM finances WHERE usuari_id=?`
  ).bind(data.usuari.id).first();
  // La pantalla d'Economia consumix d'ací: les xifres DECLARADES i l'eixida de l'avaluador.
  // Cap aritmètica a la vista (invariant 12).
  return json({ finances: f || {}, economia: await economia(env.DB, data.usuari.id, hui()) });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  const cur = await env.DB.prepare('SELECT * FROM finances WHERE usuari_id=?').bind(data.usuari.id).first() || {};
  const v = {};
  for (const k of CAMPS) v[k] = k in c ? c[k] : (cur[k] ?? null);
  // `caixa_data` és la data de la DECLARACIÓ, i és el rellotge d'on ix «fa més de 7 dies que
  // no em dones dades» (invariant 18). Es reposa a CADA declaració del període: amb la
  // condició d'abans (`&& !v.caixa_data`) només s'escrivia la primera vegada i la frescor es
  // congelava per sempre, o siga que l'avís no hauria saltat mai.
  const DECLARACIO = ['caixa', 'taquilla_s1', 'patrocini_s1', 'taquilla_s2', 'patrocini_s2'];
  if (DECLARACIO.some((k) => k in c)) v.caixa_data = hui();
  const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));
  await env.DB.prepare(
    `INSERT INTO finances (usuari_id, ${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(usuari_id) DO UPDATE SET
       ${CAMPS.map((c) => `${c}=excluded.${c}`).join(', ')}`
  ).bind(data.usuari.id, enter(v.caixa), v.caixa_data || null, enter(v.despesa_estadi),
    enter(v.taquilla_s1), enter(v.patrocini_s1), enter(v.taquilla_s2), enter(v.patrocini_s2),
    enter(v.estadi_manteniment), enter(v.estadi_cost_obra), v.estadi_data || null).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
