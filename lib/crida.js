// Tonico — estat de la crida setmanal (reinici global). DERIVAT del calendari: cap
// configuració per usuari. Disponible si no s'ha declarat cap crida dins de la
// finestra setmanal vigent (delimitada pel dia de reinici de constants_joc).
import { finestraCrida } from './calendari.js';

export async function estatCrida(db, usuariId, dataRef) {
  if (!dataRef) return null;
  const dia = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='crida_reinici_dia'").first())?.valor || '5', 10);
  const f = finestraCrida(dataRef, dia);
  const gastada = (await db.prepare('SELECT COUNT(*) n FROM crides WHERE usuari_id=? AND data>=?').bind(usuariId, f.inici).first())?.n || 0;
  return { disponible: gastada === 0, oberta: f.inici, caducitat: f.fi, proxima: f.fi };
}
