// Tonico — mercat (Fase 6.2). GET filtres de cerca (segons buits) + preus
// observats; POST registra un preu comparable; DELETE l'esborra.
import { carregaConfigPla } from '../../lib/config_pla.js';
import { filtresCompra } from '../../lib/mercat_cerca.js';
import { economia } from '../../lib/economia.js';
import { estatEstoc } from '../../lib/orquestra_estoc.js';
import { sqlCategoriaVigent } from '../../lib/categoria_vigent.js';
import { onzeEstructura } from '../../lib/onze_estructura.js';
import { necessitats, ambPreus } from '../../lib/fitxatges.js';
import { carregaConfigPesos, pesosFormacio } from '../../lib/pesos.js';

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  let filtres = [];
  if (pla) {
    const config = await carregaConfigPla(env.DB, pla.plantilla);
    const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
    const inst = equip ? await env.DB.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first() : null;
    let squad = [];
    if (inst) {
      squad = (await env.DB.prepare(
        `SELECT j.nom, ij.posicio_ultim_partit AS posicio, c.categoria FROM instantanies_jugadors ij
           JOIN jugadors j ON j.id = ij.jugador_id
           LEFT JOIN ${sqlCategoriaVigent(['categoria'])} c
                  ON c.jugador_id = ij.jugador_id
          WHERE ij.instantania_id = ?`
      ).bind(inst.id).all()).results;
    }
    // El cercador de HT demana un RANG d'edat, no un sostre: els dos extrems són poms.
    const pomEnter = async (clau) => {
      const r = await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first();
      return r?.valor == null ? null : parseInt(r.valor, 10);
    };
    const compra = {
      edat_min: await pomEnter('compra_edat_min'),
      edat_max: await pomEnter('compra_edat_max'),
      creativitat_min: await pomEnter('compra_creativitat_min'),
      posicions: JSON.parse((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='compra_posicions'").bind(pla.plantilla).first())?.valor || '["MC"]'),
    };
    const { caixa } = await economia(env.DB, data.usuari.id);
    filtres = filtresCompra(config, squad, caixa, compra);
  }
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
    necessaris = ambPreus(llista, new Map(files.map((f) => [f.clau, f])), eco2.caixa,
      Number(await pom('setmanes_caducitat_preu')) || null, hui());
  }

  return json({ filtres, estoc, necessaris });
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
