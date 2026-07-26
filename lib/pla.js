// Tonico — pla mestre (Fase 4). Estat del pla amb la realitat sobreposada:
// temporada actual i fase. (v3: les fornades han desaparegut del model.)
import { temporadaOperativa } from './calendari.js';

export async function estatPla(db, usuariId) {
  const pla = await db.prepare('SELECT id, plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;

  const tempSetmanes = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = equip ? await db.prepare('SELECT temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first() : null;
  const oper = inst ? temporadaOperativa(inst.temporada, inst.setmana_temporada, tempSetmanes)
    : { temporada: null, setmana: null };
  const temporadaActual = oper.temporada;

  // v3: el pla per temporada era del model fàbrica (temporades concretes d'un equip).
  // L'estratègia mana i viu a config_usuari; ací només queda l'estat viu del pla.
  const files = [];

  return {
    plantilla: pla.plantilla, fase_actual: pla.fase_actual,
    parametres: pla.parametres ? JSON.parse(pla.parametres) : {},
    temporadaActual, setmanaActual: oper.setmana, temporades: files,
  };
}
