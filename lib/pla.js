// Tonico — pla mestre (Fase 4). Estat del pla amb la realitat sobreposada:
// temporada actual i fase. (v3: les fornades han desaparegut del model.)
import { setmanaDeHui } from './calendari.js';

export async function estatPla(db, usuariId, hui = undefined) {
  const pla = await db.prepare('SELECT id, plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;

  // EL RELLOTGE ÉS EL CALENDARI, NO LA PUJADA: la setmana de la instantània diu de quan és el
  // fitxer, no en quina setmana estem. Si passes dos setmanes sense pujar res, el fitxer diu
  // el mateix i el món no.
  const oper = await setmanaDeHui(db, hui);
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
