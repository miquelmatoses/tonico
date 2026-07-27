// Tonico — MERCAT (PAS 8). GET: què fa falta fitxar, amb els criteris de cerca i el preu
// declarat de cada tipus. POST: declarar eixe preu.
//
// El FILTRE i la NECESSITAT són la mateixa fitxa. Abans eren dues llistes derivades per camins
// distints —una comptava categories del PAS 6 i l'altra mirava l'assignació d'estructura— i
// podien discrepar sobre què falta.
import { economia } from '../../lib/economia.js';
import { estatEstoc } from '../../lib/orquestra_estoc.js';
import { onzeEstructura } from '../../lib/onze_estructura.js';
import { necessitats, ambPreus, cercaDe } from '../../lib/fitxatges.js';
import { carregaConfigPesos, pesosFormacio } from '../../lib/pesos.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const estoc = await estatEstoc(env.DB, data.usuari.id);

  // ── QUÈ FA FALTA FITXAR, i què costa ────────────────────────────────────────────────────
  // Les places buides manen; després, els llocs de l'onze a més d'un nivell de l'objectiu. El
  // PREU no s'estima —a Hattrick no el calcula el joc— i per això va a banda: Miquel mira les
  // últimes transferències i el declara per TIPUS de fitxatge.
  const equip2 = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
  const inst2 = equip2 ? await env.DB.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip2.id).first() : null;
  let necessaris = [];
  if (inst2 && pla) {
    const { results: tots } = await env.DB.prepare(
      `SELECT j.id, j.nom, ij.edat_anys, ij.edat_dies, ij.sou, ij.experiencia, ij.lideratge,
              ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada
         FROM instantanies_jugadors ij JOIN jugadors j ON j.id = ij.jugador_id
        WHERE ij.instantania_id = ?`
    ).bind(inst2.id).all();
    const eco2 = await economia(env.DB, data.usuari.id);
    const est = await onzeEstructura(env.DB, data.usuari.id, tots, eco2.sou_sostenible_setmanal);
    const cfgP = await carregaConfigPesos(env.DB, pla.plantilla);
    const pesos = pesosFormacio([...new Set((est?.onze || []).map((l) => l.bucket))],
      cfgP.posicio_aportacio, cfgP.taula_aportacio, cfgP.pes_sector);
    const pom = async (clau) => (await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor ?? null;
    const llista = necessitats(est, { entrenable_min: Number(await pom('entrenable_creativitat_min')), pesos });
    const { results: files } = await env.DB.prepare('SELECT clau, preu, data FROM preus_referencia WHERE usuari_id=?').bind(data.usuari.id).all();
    const ambP = ambPreus(llista, new Map(files.map((f) => [f.clau, f])), eco2.caixa,
      Number(await pom('setmanes_caducitat_preu')) || null, hui());
    // I ELS CRITERIS DE CERCA a la mateixa fitxa: el filtre diu QUÈ teclejar a Hattrick i la
    // necessitat diu PER QUÈ fa falta. Abans eren dues llistes derivades per camins distints.
    const posicions = JSON.parse((await pom('buckets_alineacio')) || '{}');
    const habilitats = JSON.parse((await pom('taula_habilitat_lloc')) || '{}');
    const opcs = { posicions, habilitats, caixa: eco2.caixa,
      edat_min: Number(await pom('compra_edat_min')) || null,
      edat_max: Number(await pom('compra_edat_max')) || null };
    necessaris = ambP.map((n) => ({ ...n, cerca: cercaDe(n, opcs) }));
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
