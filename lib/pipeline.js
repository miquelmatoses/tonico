// Tonico — regeneració del pipeline derivat sencer, en orde i idempotent. Es crida en pujar
// i sota demanda («Passa revista»).
//
// Ja no hi ha PAS de classificació: el grup de cada jugador no es desa, es DERIVA de
// l'assignació d'estructura cada volta que es mira. Una taula de categories era estat derivat
// desat, i estat derivat desat és estat que es queda ranci.
import { generaAlertes } from './orquestra_alertes.js';
import { marcaDeserts } from './vendes.js';

// `hui` es passa avant fins a les alertes: la frescor de les dades es mesura contra el dia de
// veres, i cap capa de baix es fabrica el seu propi rellotge.
export async function regeneraPipeline(db, usuariId, hui = new Date().toISOString().slice(0, 10)) {
  // LA SUBHASTA DESERTA es dedueix de la transició entre les dues últimes instantànies, i per
  // tant només es pot vore ACÍ, quan la nova acaba d'arribar. Es desa perquè és un fet que ha
  // de durar: passades dues pujades la transició ja no es veu i el jugador tornaria a Vendes.
  await marcaDeserts(db, usuariId);
  const alertes = await generaAlertes(db, usuariId, hui);   // escriu la revisió amb el hash complet
  return { alertes };
}
