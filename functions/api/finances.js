import { economia } from '../../lib/economia.js';
import { iniciDeSetmana, fCalendari } from '../../lib/calendari.js';

const hui = () => new Date().toISOString().slice(0, 10);

// L'àncora del calendari: data i temporada del primer partit conegut, i la longitud de l'any.
// `anyDies` és obligatori — sense ell `calcularSetmana` divideix per undefined i tot ix NaN.
async function ancora(db) {
  const g = async (clau) => (await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor;
  return {
    data: await g('calendari_ancora_data'),
    temporada: Number(await g('calendari_ancora_temporada')),
    anyDies: Number(await g('any_dies')) || 112,
  };
}

// Tonico — finances declarades (contracte v3.1, PAS 3).
//
// De l'informe de HT es declaren QUATRE coses i cap més: taquilla i patrocinadors (de la
// setmana passada i d'esta), diners disponibles i manteniment d'estadi. Més els tres números
// de la calculadora d'estadi, que van a banda perquè són d'una altra cadència.
//
// La taquilla i el patrocini van a l'HISTÒRIC PER SETMANA; `finances` guarda l'ESTAT ACTUAL.
// GET torna les dues coses i l'eixida de l'avaluador; POST fa merge (no trepitja el que no ve).
const CAMPS = ['caixa', 'caixa_data', 'despesa_estadi',
  'estadi_manteniment', 'estadi_cost_obra', 'estadi_data', 'estadi_obra_inici'];
const COLS = CAMPS.join(', ');

export async function onRequestGet({ env, data }) {
  const f = await env.DB.prepare(
    `SELECT ${COLS} FROM finances WHERE usuari_id=?`
  ).bind(data.usuari.id).first();
  // La pantalla d'Economia consumix d'ací: les xifres DECLARADES i l'eixida de l'avaluador.
  // Cap aritmètica a la vista (invariant 12).
  return json({ finances: f || {}, economia: await economia(env.DB, data.usuari.id, hui()) });
}

// LES DOS SETMANES a l'històric. QUINES SÓN NO ES PREGUNTA: esta és la de `hui` i la passada la
// de fa set dies. Qui declara només diu quantes setmanes arrere va cada bloc.
//
// El camp de data del formulari era l'única manera d'apuntar diners a la setmana equivocada, i
// a més obria la porta a redeclarar una setmana vella amb una numeració que ja no és la seua.
// Declarar és transcriure l'informe de HT, que sempre parla d'estes dues.
//
// `hui` va com a PARÀMETRE i no com a `new Date()` amagat: si no, el solapament de dues
// declaracions consecutives —«esta» que la setmana que ve és «la passada»— no es pot provar.
export async function desaSetmanes(db, usuariId, setmanes, hui) {
  const anc = await ancora(db);
  const tempSetmanes = Number((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || 16);
  const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));
  for (const s of setmanes) {
    const enrere = Number(s?.endarrere);
    if (!Number.isInteger(enrere) || enrere < 0) continue;
    // UNA SETMANA BUIDA NO ES DECLARA. Sense això, desar només per a corregir la caixa sembrava
    // dues setmanes a zero a l'històric, i eixos zeros entren de ple a la mitjana.
    if (enter(s.taquilla) == null && enter(s.patrocini) == null) continue;
    const dia = new Date(Date.parse(hui) - enrere * 7 * 86400000).toISOString().slice(0, 10);
    const inici = iniciDeSetmana(dia, anc);
    const { temporada, setmana } = fCalendari(inici, anc, tempSetmanes);
    if (temporada == null) continue;
    await db.prepare(
      `INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(usuari_id, temporada, setmana) DO UPDATE SET
         taquilla=excluded.taquilla, patrocini=excluded.patrocini, data=excluded.data,
         declarada=excluded.declarada`
    ).bind(usuariId, temporada, setmana, enter(s.taquilla), enter(s.patrocini), inici, hui).run();
  }
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
  if ('caixa' in c || Array.isArray(c.setmanes)) v.caixa_data = hui();
  const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));
  await env.DB.prepare(
    `INSERT INTO finances (usuari_id, ${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(usuari_id) DO UPDATE SET
       ${CAMPS.map((c) => `${c}=excluded.${c}`).join(', ')}`
  ).bind(data.usuari.id, enter(v.caixa), v.caixa_data || null, enter(v.despesa_estadi),
    enter(v.estadi_manteniment), enter(v.estadi_cost_obra), v.estadi_data || null,
    v.estadi_obra_inici || null).run();

  if (Array.isArray(c.setmanes)) await desaSetmanes(env.DB, data.usuari.id, c.setmanes, hui());
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
