// Tonico — ENTRENAMENT PRESCRIT (contracte v3, PAS 1).
//
//   (A, B) = (creativitat, passades) · intensitat 100% · resistència `resistencia_pct`
//
// No es tria: es prescriu. Raó del full: el motor de partit decidix per possessió del mig del
// camp i el mercat de MC és el més líquid, o siga que és l'entrenament que competix i finança
// alhora. Abans això venia de `fases_config` —el personal i l'entrenament esperats per FASE del
// model fàbrica—, que ja no existix: la prescripció viu als poms des del v3 (migració 067).
export async function entrenamentPrescrit(db, plantilla) {
  const pom = async (clau) => (await db.prepare(
    'SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?'
  ).bind(plantilla, clau).first())?.valor ?? null;
  const a = await pom('entrenament_a');
  if (!a) return null;                       // sense prescripció no se n'inventa cap
  return {
    tipus: a,
    principal: a,
    secundaria: await pom('entrenament_b'),
    intensitat: Number(await pom('intensitat_pct')) || null,
    resistencia: Number(await pom('resistencia_pct')) || null,
  };
}
