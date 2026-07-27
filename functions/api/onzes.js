// Tonico — ELS DOS ONZES a la pantalla d'Alineació.
import { dosOnzes } from '../../lib/dos_onzes.js';
import { economia } from '../../lib/economia.js';

export async function onRequestGet({ env, data }) {
  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
  if (!equip) return json({ error: 'sense_equips' }, 409);
  const inst = await env.DB.prepare('SELECT id, data FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return json({ error: 'sense_instantania' }, 409);

  const { results: jugadors } = await env.DB.prepare(
    `SELECT j.id, j.nom, j.especialitat, ij.posicio_ultim_partit AS posicio, ij.edat_anys, ij.edat_dies,
            ij.sou, ij.tsi, ij.experiencia, ij.lideratge, ij.lesio, ij.transferible,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id = ij.jugador_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  const eco = await economia(env.DB, data.usuari.id);
  const d = await dosOnzes(env.DB, data.usuari.id, jugadors, eco.sou_sostenible_setmanal);
  if (!d) return json({ error: 'sense_formacio' }, 409);
  const fila = (l) => ({ codi: l.lloc, bucket: l.bucket, habilitat: l.habilitat,
    entrena: !!l.entrena, pct: l.pct ?? 100, motiu: l.motiu ?? null,
    jugador: l.jugador ? { id: l.jugador.id, nom: l.jugador.nom } : null });
  return json({ data: inst.data, onze_a: d.onze_a.map(fila), onze_b: d.onze_b.map(fila) });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
