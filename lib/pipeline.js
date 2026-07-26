// Tonico — regeneració del pipeline derivat sencer, en orde i idempotent:
// classificació → alertes. Manté la regla
// d'or: guanys de plaça lliure en silenci, desplaçaments com a intercanvis
// pendents. Es crida en pujar i sota demanda («Passa revista»).
import { classificaEquip } from './orquestra_classificacio.js';
import { generaAlertes } from './orquestra_alertes.js';
import { marcaDeserts } from './vendes.js';

// `hui` es passa avant fins a les alertes: la frescor de les dades es mesura contra el dia de
// veres, i cap capa de baix es fabrica el seu propi rellotge.
export async function regeneraPipeline(db, usuariId, hui = new Date().toISOString().slice(0, 10)) {
  const pla = await db.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const classificacio = pla && equip ? await classificaEquip(db, usuariId, equip.id, pla.plantilla) : null;
  // LA SUBHASTA DESERTA es dedueix de la transició entre les dues últimes instantànies, i per
  // tant només es pot vore ACÍ, quan la nova acaba d'arribar. Es desa perquè és un fet que ha
  // de durar: passades dues pujades la transició ja no es veu i el jugador tornaria a Vendes.
  await marcaDeserts(db, usuariId);
  const alertes = await generaAlertes(db, usuariId, hui);   // escriu la revisió amb el hash complet
  return { classificacio, alertes };
}
