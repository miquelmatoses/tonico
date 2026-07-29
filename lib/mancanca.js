// Tonico — EL SOBRECOST (contracte v3, PAS 5).
//
//   sobrecost(j) = MAX(0; sou(j) − sou_objectiu(lloc))
//
// `sou_objectiu` és el sou del PERFIL que el pressupost del lloc paga (v2 del motor). Abans era
// el preu d'una sola habilitat al nivell objectiu, i per tant deixava fora el que costen les
// secundàries — les mateixes que ara SÍ que compten per a triar el jugador. Amb la vara vella,
// premiar un jugador complet per a la tria i castigar-lo pel sou serien dues vares oposades.
//
// El que pagues de MÉS respecte del que el lloc d'eixe jugador mereix segons el pressupost.
// És la vara de la venda (PAS 7: `ordre_venda = sobrecost DESC`) i la de la retenció per
// cobertura, i una sola: es calcula una vegada, a l'assignació d'estructura.
//
// D'ací se n'han anat `mancança`, `excés`, `nivell_actual` i `prioritat`. La distància d'un
// lloc a l'objectiu ja la calcula l'assignació (`diferencia`) i l'ordena `necessitats` en
// valor absolut; l'`excés` preguntava el mateix que el sobrecost però en nivells en compte
// d'euros, i no el mirava ningú.

export function sobrecost(jugador, souObjectiu) {
  if (!jugador || souObjectiu == null) return null;
  return Math.max(0, (jugador.sou ?? 0) - souObjectiu);
}
