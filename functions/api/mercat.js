// Tonico — mercat (Fase 6.2). GET filtres de cerca (segons buits) + preus
// observats; POST registra un preu comparable; DELETE l'esborra.
import { carregaConfigPla } from '../../lib/config_pla.js';
import { filtresCompra } from '../../lib/mercat_cerca.js';
import { economia } from '../../lib/economia.js';

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
        `SELECT ij.posicio_ultim_partit AS posicio, c.categoria FROM instantanies_jugadors ij
           LEFT JOIN (SELECT cj.jugador_id, cj.categoria FROM categories_jugador cj
                       JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON cj.id=m.mid) c
                  ON c.jugador_id = ij.jugador_id
          WHERE ij.instantania_id = ?`
      ).bind(inst.id).all()).results;
    }
    const compra = {
      edat_max: parseInt((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='compra_edat_max'").bind(pla.plantilla).first())?.valor || '18', 10),
      creativitat_min: parseInt((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='compra_creativitat_min'").bind(pla.plantilla).first())?.valor || '6', 10),
    };
    const { caixa } = await economia(env.DB, data.usuari.id);
    filtres = filtresCompra(config, squad, caixa, compra);
  }
  const { results: preus } = await env.DB.prepare('SELECT id, posicio, edat, habilitat, preu, data, nota FROM preus_observats WHERE usuari_id=? ORDER BY data DESC, id DESC').bind(data.usuari.id).all();
  return json({ filtres, preus });
}

export async function onRequestPost({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (c.preu == null || isNaN(Number(c.preu))) return json({ error: 'dades_invalides' }, 400);
  await env.DB.prepare('INSERT INTO preus_observats (usuari_id, posicio, edat, habilitat, preu, data, nota) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(data.usuari.id, c.posicio || null, c.edat ?? null, c.habilitat ?? null, Math.round(Number(c.preu)),
      /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data : new Date().toISOString().slice(0, 10), c.nota || null).run();
  return json({ ok: true }, 201);
}

export async function onRequestDelete({ request, env, data }) {
  const c = await request.json().catch(() => ({}));
  if (!c.id) return json({ error: 'falta_id' }, 400);
  await env.DB.prepare('DELETE FROM preus_observats WHERE id=? AND usuari_id=?').bind(c.id, data.usuari.id).run();
  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
