// Tonico — QUINES POSICIONS ENTRENEN I A QUIN % segons l'entrenament SÈNIOR triat.
// El motor sènior té UN sol entrenament, però (guia §6) afecta més d'una posició: unes
// al 100% (efecte màxim) i altres al 50% (efecte baix). Tot ix de config (taules), no
// de noms de bucket cablejats: canviar l'entrenament canvia les places, els %, la
// cobertura i els anells del camp, sense tocar codi.
//
//   taula_entrenament       (100%): habilitat → [buckets]   (ex. creativitat → [mc])
//   taula_entrenament_baix   (50%): habilitat → [buckets]   (guia §6: creativitat → [extrem],
//                                                            extrem → [defensa])
import { entrenamentFase } from './entrenament.js';

// {bucket: pct} per a una habilitat. El 100% mana sobre el 50% si un bucket és a les dues.
export function placesEntrenament(skill, taula = {}, taulaBaix = {}) {
  const p = {};
  for (const b of (taula[skill] || [])) p[b] = 100;
  for (const b of (taulaBaix[skill] || [])) if (p[b] == null) p[b] = 50;
  return p;
}

// Aplica les places a la formació: cada slot rep entrena/pct segons el seu bucket.
// Els slots de buckets que no entrenen amb esta habilitat queden entrena:false.
export function aplicaEntrenament(slots, places = {}) {
  return (slots || []).map((s) => (places[s.bucket] ? { ...s, entrena: true, pct: places[s.bucket] } : { ...s, entrena: false }));
}

// Entrenament sènior EFECTIU d'un usuari: l'override del pla (entrenament_senior) si
// n'hi ha, si no el principal que prescriu la fase. Torna {skill, places}.
export async function entrenamentEfectiu(db, usuariId) {
  const pla = await db.prepare('SELECT plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return { skill: null, places: {} };
  const params = pla.parametres ? JSON.parse(pla.parametres) : {};
  const fase = await entrenamentFase(db, pla.plantilla, pla.fase_actual);
  const skill = params.entrenament_senior || fase?.principal || fase?.tipus || null;
  const get = async (clau) => JSON.parse((await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor || '{}');
  return { skill, places: placesEntrenament(skill, await get('taula_entrenament'), await get('taula_entrenament_baix')) };
}
