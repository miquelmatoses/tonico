// Tonico — EL SOBRECOST (contracte v3, PAS 5).
//
//   sobrecost(j) = MAX(0; sou(j) − taula_salaris(habilitat_lloc, nivell_objectiu))
//
// El que pagues de MÉS respecte del que el lloc d'eixe jugador mereix segons el pressupost.
// És la vara de la venda (PAS 7: `ordre_venda = sobrecost DESC`) i la de la retenció per
// cobertura, i una sola: es calcula una vegada, a l'assignació d'estructura.
//
// D'ací se n'han anat `mancança`, `excés`, `nivell_actual` i `prioritat`. La distància d'un
// lloc a l'objectiu ja la calcula l'assignació (`diferencia`) i l'ordena `necessitats` en
// valor absolut; l'`excés` preguntava el mateix que el sobrecost però en nivells en compte
// d'euros, i no el mirava ningú.

export function sobrecost(jugador, habilitat, nivellObjectiu, taulaSalaris) {
  if (!jugador || nivellObjectiu == null) return null;
  const escala = taulaSalaris?.[habilitat];
  if (!escala) return null;
  const souDelNivell = escala[String(nivellObjectiu)] ?? 0;   // nivell 0 → no es paga res
  return Math.max(0, (jugador.sou ?? 0) - souDelNivell);
}
