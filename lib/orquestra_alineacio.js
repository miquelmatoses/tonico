// Tonico — integració de l'alineació amb la BD. Construïx la plantilla des de
// l'última instantània sènior (categoria, fornada d'eixida, lesions, sancions,
// obligació de minuts de la Junta) i crida el motor.
import { alinea } from './alineacio.js';

async function carregaConfig(db, plantilla) {
  const get = async (clau) => JSON.parse((await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor || 'null');
  return { partits: await get('partits'), slots: await get('formacio'), buckets: await get('buckets_alineacio') };
}

export async function proposaAlineacio(db, usuariId, opts = {}) {
  const pla = await db.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;
  const config = await carregaConfig(db, pla.plantilla);
  if (!config.slots) return null;

  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = await db.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return null;

  const susp = parseInt((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='suspensio_amonestacions'").bind(pla.plantilla).first())?.valor || '3', 10);

  const { results: files } = await db.prepare(
    `SELECT ij.jugador_id, j.nom, ij.posicio_ultim_partit AS posicio, ij.lesio, ij.amonestacions,
            c.categoria, f.temporada_eixida_prevista AS fornada_eixida
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id=ij.jugador_id
       LEFT JOIN (SELECT cj.jugador_id, cj.categoria FROM categories_jugador cj
                   JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON cj.id=m.mid) c
              ON c.jugador_id = j.id
       LEFT JOIN fornades_jugadors fj ON fj.jugador_id = j.id
       LEFT JOIN fornades f ON f.id = fj.fornada_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  const { results: junta } = await db.prepare(
    "SELECT DISTINCT a.jugador_id FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE a.usuari_id=? AND r.codi='ALR_JUNTA_PORTER' AND a.estat IN ('nova','vista')"
  ).bind(usuariId).all();
  const ambObligacio = new Set(junta.map((x) => x.jugador_id));

  const squad = files.map((f) => ({
    jugador_id: f.jugador_id, nom: f.nom, posicio: f.posicio, categoria: f.categoria,
    fornada_eixida: f.fornada_eixida,
    lesionat: !!(f.lesio && String(f.lesio).trim() !== ''),
    suspes: (f.amonestacions ?? 0) >= susp,
    obligacio_minuts: ambObligacio.has(f.jugador_id),
  }));

  return alinea(squad, config, opts);
}
