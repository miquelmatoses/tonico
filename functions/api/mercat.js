// Tonico — MERCAT (PAS 8). GET: què fa falta fitxar, amb els criteris de cerca i el preu
// declarat de cada tipus. POST: declarar eixe preu.
//
// El FILTRE i la NECESSITAT són la mateixa fitxa. Abans eren dues llistes derivades per camins
// distints —una comptava categories del PAS 6 i l'altra mirava l'assignació d'estructura— i
// podien discrepar sobre què falta.
import { estatEstoc } from '../../lib/orquestra_estoc.js';
import { cercaDe } from '../../lib/fitxatges.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const estoc = await estatEstoc(env.DB, data.usuari.id);

  // ── QUÈ FA FALTA FITXAR, i què costa ────────────────────────────────────────────────────
  // La llista ja la porta `estatEstoc` (`mancances`): les places buides manen, després els
  // llocs de l'onze a més d'un nivell de l'objectiu, i cada una amb el seu preu declarat.
  // Ací només se li enganxen els CRITERIS DE CERCA: el filtre diu QUÈ teclejar a Hattrick i
  // la necessitat diu PER QUÈ fa falta — són la mateixa fitxa.
  //
  // Abans això es tornava a derivar de zero (una altra economia, una altra instantània, una
  // altra assignació d'estructura i sis consultes de poms) per a arribar exactament al mateix
  // resultat. Dues derivacions de la mateixa cosa, i podien discrepar.
  let necessaris = [];
  if (pla && estoc.mancances?.length) {
    const pom = async (clau) => (await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor ?? null;
    const opcs = { posicions: JSON.parse((await pom('buckets_alineacio')) || '{}'),
      habilitats: JSON.parse((await pom('taula_habilitat_lloc')) || '{}'),
      caixa: estoc.caixa,
      edat_min: Number(await pom('compra_edat_min')) || null,
      edat_max: Number(await pom('compra_edat_max')) || null };
    necessaris = estoc.mancances.map((n) => ({ ...n, cerca: cercaDe(n, opcs) }));
  }

  return json({ estoc, necessaris });
}

// Declarar el preu de referència d'un TIPUS de fitxatge. La clau la construïx l'avaluador
// (`lib/fitxatges.js`); ací només es comprova que siga una de les que fan falta ara mateix, per
// a no acumular preus de coses que ja no es busquen.
export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.clau || typeof c.clau !== 'string') return json({ error: 'falta_clau' }, 400);
  const preu = c.preu == null || c.preu === '' ? null : Math.round(Number(c.preu));
  if (preu != null && !Number.isFinite(preu)) return json({ error: 'preu_invalid' }, 400);
  await env.DB.prepare(
    `INSERT INTO preus_referencia (usuari_id, clau, preu, data) VALUES (?, ?, ?, ?)
     ON CONFLICT(usuari_id, clau) DO UPDATE SET preu=excluded.preu, data=excluded.data`
  ).bind(data.usuari.id, c.clau, preu, hui()).run();
  return json({ ok: true });
}

const hui = () => new Date().toISOString().slice(0, 10);

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
