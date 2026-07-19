// Tonico — calendari Hattrick. Cap constant ací: l'àncora i la longitud de
// l'any arriben des de constants_joc (BD). Este mòdul és només l'aritmètica.
//
// Retorna la temporada i la setmana (1..N) d'una data d'instantània respecte
// de l'àncora (primer partit de la temporada de referència). Admet dates
// anteriors a l'àncora (exportació de pretemporada → última setmana de la
// temporada anterior).
export function calcularSetmana(dataInstantania, ancora) {
  const ms = 86400000;
  const dia = Math.round((Date.parse(dataInstantania) - Date.parse(ancora.data)) / ms);
  const anyDies = ancora.anyDies;                 // p.ex. 112
  const temporades = Math.floor(dia / anyDies);   // floor: correcte amb dies negatius
  let offset = dia % anyDies;
  if (offset < 0) offset += anyDies;
  return {
    temporada: ancora.temporada + temporades,
    setmana: Math.floor(offset / 7) + 1,
  };
}

// Temporada OPERATIVA (una sola font per a totes les vistes): la setmana final
// (>= temporada_setmanes) és pretemporada de la següent, així que operativament ja
// som a la temporada que ve (setmana 0 = pretemporada). Unifica el criteri entre
// el parte, la plantilla i el pla.
export function temporadaOperativa(temporada, setmana, tempSetmanes) {
  if (temporada == null) return { temporada: null, setmana: null };
  return setmana >= tempSetmanes
    ? { temporada: temporada + 1, setmana: 0 }
    : { temporada, setmana };
}
