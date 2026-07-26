// Tonico — pla mestre (Fase 4). Estat del pla amb la realitat sobreposada:
// temporada actual i fase. (v3: les fornades han desaparegut del model.)
import { temporadaOperativa } from './calendari.js';

export async function estatPla(db, usuariId) {
  const pla = await db.prepare('SELECT id, plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;

  const tempSetmanes = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = equip ? await db.prepare('SELECT temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first() : null;
  const temporadaActual = inst
    ? temporadaOperativa(inst.temporada, inst.setmana_temporada, tempSetmanes).temporada : null;

  const { results: temporades } = await db.prepare(
    'SELECT temporada, divisio_prevista, mode, accions_previstes FROM plans_temporades WHERE pla_id=? ORDER BY temporada'
  ).bind(pla.id).all();

  const files = temporades.map((t) => {
    const accions = t.accions_previstes ? JSON.parse(t.accions_previstes) : {};
    const estat = temporadaActual == null ? 'futura'
      : t.temporada < temporadaActual ? 'passada'
        : t.temporada === temporadaActual ? 'actual' : 'futura';
    const retard = [];                                  // v3: les fornades han desaparegut
    return { temporada: t.temporada, divisio_prevista: t.divisio_prevista, mode: t.mode, accions, estat, retard };
  });

  return {
    plantilla: pla.plantilla, fase_actual: pla.fase_actual,
    parametres: pla.parametres ? JSON.parse(pla.parametres) : {},
    temporadaActual, temporades: files,
  };
}
