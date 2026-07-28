// Tonico — Juvenils (Fase 7). GET la vista dels juvenils (habilitats 3 estats,
// projecció d'aterratge, avaluació de crida) + decisions; POST fixa una decisió.
import { carregaAncora } from './pujar.js';
import { plaJuvenilComplet } from '../../lib/orquestra_juvenil.js';
import { projeccioAterratge } from '../../lib/juvenils_vista.js';

const HABILITATS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];

export async function onRequestGet({ env, data }) {
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='juvenil'").bind(data.usuari.id).first();
  if (!equip || !pla) return json({ juvenils: [], pla: null });
  const inst = await env.DB.prepare('SELECT id, data FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return json({ juvenils: [], pla: null });

  const ancora = await carregaAncora(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT ij.*, j.nom, j.especialitat, j.id AS jugador_id
       FROM instantanies_juvenils ij JOIN jugadors j ON j.id = ij.jugador_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  // EL PLA DEL PAS 10. Una rutina, dues passades: primer creativitat, després passades.
  const plan = await plaJuvenilComplet(env.DB, data.usuari.id, results, pla.plantilla);
  const perId = new Map((plan?.onze ?? []).map((l) => [l.jugador_id, l]));

  // La FILA de cada juvenil: qui és, què se sap d'ell i què li toca fer esta setmana. El
  // «per què» no és una etiqueta de la vista: ix del pla (motiu + valor).
  const juvenils = results.map((f) => ({
    jugador_id: f.jugador_id, nom: f.nom, especialitat: f.especialitat,
    edat_anys: f.edat_anys, edat_dies: f.edat_dies,
    dies_restants_promocio: f.dies_restants_promocio,
    aterratge: projeccioAterratge(f.dies_restants_promocio, inst.data, ancora),
    habilitats: HABILITATS.map((h) => ({ habilitat: h, actual: f[`${h}_actual`], potencial: f[`${h}_potencial`] })),
    lloc: perId.get(f.jugador_id) ?? null,
    banqueta: (plan?.banqueta ?? []).includes(f.jugador_id),
    bloquejat: (plan?.bloquejats ?? []).includes(f.jugador_id),
    despatxa: (plan?.despatxa ?? []).includes(f.jugador_id),
    promociona: (plan?.promocionables ?? []).includes(f.jugador_id),
  }));

  // ORDE DE PANTALLA = l'orde del pla: qui va davant en la llista és qui va davant en la cua
  // per a les places, i qui va darrere és el primer a eixir. Una sola ordenació, no dues.
  const posicio = new Map([...(plan?.onze ?? []).map((l) => l.jugador_id),
    ...(plan?.banqueta ?? []), ...(plan?.bloquejats ?? [])].map((id, i) => [id, i]));
  juvenils.sort((a, b) => (posicio.get(a.jugador_id) ?? 999) - (posicio.get(b.jugador_id) ?? 999));

  return json({ juvenils, pla: plan ? {
    principal: plan.principal, secundaria: plan.secundaria, llistons: plan.llistons,
    objectiu: plan.objectiu, despatxa: plan.despatxa, promocionables: plan.promocionables,
  } : null });
}

// SENSE POST. No queda cap decisió manual sobre un juvenil: qui juga, qui sobra i qui es
// promociona ho decidix el pla del PAS 10. El desplegable Seguiment / Elegit / Cua d'eixida
// era un control que el sistema ignorava — pareixia una decisió i no ho era.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
