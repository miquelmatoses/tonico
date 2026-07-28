// Tonico — QUINES POSICIONS ENTRENEN I A QUIN % segons l'entrenament SÈNIOR triat.
// El motor sènior té UN sol entrenament, però (guia §6) afecta més d'una posició: unes
// al 100% (efecte màxim) i altres al 50% (efecte baix). Tot ix de config (taules), no
// de noms de bucket cablejats: canviar l'entrenament canvia les places, els %, la
// cobertura i els anells del camp, sense tocar codi.
//
//   taula_entrenament       (100%): habilitat → [buckets]   (ex. creativitat → [mc])
//   taula_entrenament_baix   (50%): habilitat → [buckets]   (guia §6: creativitat → [extrem],
//                                                            extrem → [defensa])

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

// ENTRENAMENT SÈNIOR PRESCRIT (contracte v3, PAS 1). No es tria: és un pom del contracte.
//
// EL PRIMER EQUIP ENTRENA UNA SOLA HABILITAT. El doble entrenament (principal + secundari)
// és exclusiu de l'acadèmia, i la intensitat i la resistència són exclusives del sènior: són
// dues pantalles distintes de Hattrick amb continguts distints. Ací hi havia un `skill_b` que
// no tocava res del primer equip —les places ixen només de `skill`— i que la pantalla li
// demanava a Miquel com si el poguera posar en algun lloc.
const pomDe = (db, estrategia) => async (clau) =>
  (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;

export async function entrenamentPrescrit(db, estrategia) {
  const pom = pomDe(db, estrategia);
  const num = async (clau) => { const v = await pom(clau); return v == null ? null : Number(v); };
  return {
    skill: await pom('entrenament_a'),
    intensitat: await num('intensitat_pct'),
    resistencia: await num('resistencia_pct'),
  };
}

// ENTRENAMENT JUVENIL PRESCRIT. L'altra pantalla, l'altre joc de poms: principal i secundari,
// i cap intensitat. També prescrit — l'acadèmia existix per a fabricar entrenables, o siga
// que què entrena no és una tria.
export async function entrenamentJuvenil(db, estrategia) {
  const pom = pomDe(db, estrategia);
  return { principal: await pom('entrenament_juvenil_a'), secundari: await pom('entrenament_juvenil_b') };
}

// ACCIÓ("canvia l'entrenament a HT") SI configurat_HT ≠ prescrit. Compara la 4-tupla
// sencera: canviar només la intensitat també és un desquadre.

// Places del sènior: les que marca l'habilitat A prescrita.
export async function entrenamentEfectiu(db, usuariId) {
  const pla = await db.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return { skill: null, places: {} };
  const pres = await entrenamentPrescrit(db, pla.plantilla);
  if (!pres.skill) return { skill: null, places: {} };
  const get = async (clau) => JSON.parse((await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor || '{}');
  return { ...pres, places: placesEntrenament(pres.skill, await get('taula_entrenament'), await get('taula_entrenament_baix')) };
}
