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

// Entrenament sènior PRESCRIT (contracte v3, PAS 1). No es tria: (A, B) són poms del
// contracte, no una fase ni un override del pla. Torna {skill, skill_b, intensitat,
// resistencia, places}: `skill` és A, que és qui marca les places del sènior.
export async function entrenamentPrescrit(db, estrategia) {
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const num = async (clau) => { const v = await pom(clau); return v == null ? null : Number(v); };
  return {
    skill: await pom('entrenament_a'),
    skill_b: await pom('entrenament_b'),
    intensitat: await num('intensitat_pct'),
    resistencia: await num('resistencia_pct'),
  };
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
