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

// L'ÀNCORA, des de la BD. Ha de caure en el PRIMER DIA de la setmana declarat
// (`setmana_primer_dia`): tota la graella de setmanes penja d'ella, i si l'àncora cau en un
// altre dia, TOTES les vores de setmana queden desplaçades. Ho comprova el guardià.
export async function carregaAncora(db) {
  const { results } = await db.prepare(
    `SELECT clau, valor FROM constants_joc
      WHERE clau IN ('calendari_ancora_data','calendari_ancora_temporada','any_dies')`
  ).all();
  const c = Object.fromEntries(results.map((r) => [r.clau, r.valor]));
  return {
    data: c.calendari_ancora_data,
    temporada: parseInt(c.calendari_ancora_temporada, 10),
    anyDies: parseInt(c.any_dies, 10),
  };
}

// EL PRIMER DIA de la setmana d'una data. La identitat d'una setmana econòmica és la seua
// VORA, no el dia que la declares: sense això, dues declaracions de la mateixa setmana poden
// portar dates distintes i acabar en dues files, o —pitjor— en una fila amb una data que
// contradiu els seus diners.
export function iniciDeSetmana(data, ancora) {
  const c = calcularSetmana(data, ancora);
  const dies = (c.temporada - ancora.temporada) * ancora.anyDies + (c.setmana - 1) * 7;
  return new Date(Date.parse(ancora.data) + dies * 86400000).toISOString().slice(0, 10);
}

// ── ON SOM ARA ───────────────────────────────────────────────────────────────────────────
// El calendari el mou EL TEMPS, no les pujades. La setmana d'una instantània diu de quan és
// EL FITXER, i és una cosa distinta: si passes dos setmanes sense pujar res, el fitxer segueix
// dient el mateix i el món no. Tot el que decidix «en quina setmana estem» —el pla, el parte,
// la finestra de mercat— passa per ací amb HUI.
export async function setmanaDeHui(db, hui = new Date().toISOString().slice(0, 10)) {
  const ancora = await carregaAncora(db);
  const tempSetmanes = parseInt(
    (await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);
  if (!ancora.data) return { temporada: null, setmana: null, crua: { temporada: null, setmana: null }, hui };
  return { ...fCalendari(hui, ancora, tempSetmanes), hui };
}
