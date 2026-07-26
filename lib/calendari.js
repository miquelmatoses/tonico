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

// Invers de calcularSetmana: data ISO de l'inici (setmana 1) d'una temporada,
// respecte de l'àncora. Universal: cap constant ací. Serveix per convertir fites
// del pla (temporada d'inflexió, etc.) a dates i comptar setmanes fins a elles.
export function dataDeTemporada(temporada, ancora) {
  const ms = 86400000;
  const dies = (temporada - ancora.temporada) * ancora.anyDies;
  return new Date(Date.parse(ancora.data) + dies * ms).toISOString().slice(0, 10);
}

// Setmanes entre dos dates ISO (pot ser negatiu si b és anterior a a).
export function setmanesEntre(dataA, dataB) {
  return Math.round((Date.parse(dataB) - Date.parse(dataA)) / (7 * 86400000));
}

// Finestra setmanal de crida delimitada pel dia de reinici global (0=diumenge …
// 6=dissabte). Torna [inici, fi) en dates ISO, on `inici` és l'últim reinici en o
// abans de dataRef i `fi` el següent. Universal: el dia és config (constants_joc).
export function finestraCrida(dataRef, reiniciDia) {
  const ms = 86400000;
  const d = new Date(`${dataRef}T00:00:00Z`);
  const enrere = (d.getUTCDay() - reiniciDia + 7) % 7;        // dies des de l'últim reinici
  const inici = new Date(d.getTime() - enrere * ms);
  const fi = new Date(inici.getTime() + 7 * ms);
  return { inici: inici.toISOString().slice(0, 10), fi: fi.toISOString().slice(0, 10) };
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

// f_calendari (contracte v3, V) — LA FUNCIÓ ÚNICA del sistema per a (temporada, setmana).
// D'una data i l'àncora en trau la posició CRUA i l'OPERATIVA. Tot punt de decisió que
// necessite saber en quina temporada som passa per ací: abans es reimplementava en tres
// llocs (pla, alertes, economia) i podien discrepar.
//   → { temporada, setmana }  operatives (setmana final = pretemporada de la següent)
//   → { crua: {temporada, setmana} }  tal com ix del calendari, sense el desplaçament
export function fCalendari(data, ancora, tempSetmanes) {
  const crua = calcularSetmana(data, ancora);
  const op = temporadaOperativa(crua.temporada, crua.setmana, tempSetmanes);
  return { temporada: op.temporada, setmana: op.setmana, crua };
}
