// Tonico — avaluador d'ofertes de crida (polit #2.4d). Per a OFERTES NOVES del
// cercapromeses (no per als de casa): veredicte segons la doctrina per edat.
import { avaluaCrida } from '../../lib/fotrem.js';

export async function onRequestGet({ request, env, data }) {
  const q = new URL(request.url).searchParams;
  const edat = parseInt(q.get('edat'), 10);
  const potencial = q.get('potencial') ? parseInt(q.get('potencial'), 10) : null;
  const compost = q.get('compost') ? parseInt(q.get('compost'), 10) : null;
  if (!Number.isFinite(edat)) return json({ error: 'edat_invalida' }, 400);

  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const llindars = pla ? JSON.parse((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='crida_llindars'").bind(pla.plantilla).first())?.valor || 'null') : null;

  return json({ veredicte: avaluaCrida(edat, potencial, compost, llindars) });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
