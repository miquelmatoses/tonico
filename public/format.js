// Tonico — formatadors ÚNICS de presentació. CAP secció formata pel seu compte
// (números, dates, edats, percentatges, diners): tot passa per ací. Pur (sense
// DOM) → importable des del navegador i des dels tests.
//
// Números en valencià: milers amb ESPAI FI (U+202F, no separa en trencar línia
// i evita confusió amb el punt decimal); negatiu amb menys real (U+2212).
const FIN = ' ';

export const milers = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '';
  const v = Math.round(Math.abs(Number(n)));
  const s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, FIN);
  return (Number(n) < 0 ? '−' : '') + s;
};

// Diners: «131 978 €» (milers + espai fi + €). null → guió.
export const diners = (n) => (n == null || n === '' ? '—' : milers(n) + FIN + '€');

// Decimal amb coma valenciana: 3.5 → «3,5».
export const decimal = (n, d = 1) => (n == null || n === '' ? '' : Number(n).toFixed(d).replace('.', ','));

// Percentatge enter: «72%».
export const percent = (n) => (n == null || n === '' ? '' : milers(Math.round(Number(n))) + '%');

// Edat Hattrick: «17a 34d» (anys + dies). Degrada amb dades parcials: sense dies →
// «17a»; sense res (o dades invàlides) → «—». MAI llança (doctrina de degradació).
export const edat = (anys, dies) => {
  if (anys == null || Number.isNaN(Number(anys))) return '—';
  return (dies == null || Number.isNaN(Number(dies))) ? `${anys}a` : `${anys}a${FIN}${dies}d`;
};

// Data: l'ISO ja és llegible; centralitzat per si un dia canvia el format.
export const data = (iso) => iso || '—';

// Lesionat: la columna «Lesions» del CSV és buida si el jugador està sa; qualsevol
// valor no buit i distint de «0» = lesionat (setmanes de baixa). Predicat únic
// (servidor i client) per no dispersar la interpretació de la dada.
export const esLesionat = (lesio) => {
  const v = (lesio == null ? '' : String(lesio)).trim();
  return v !== '' && v !== '0';
};

// Durada de la lesió en setmanes (N) o null si no és numèrica/sa. Per a mostrar-la
// on hi haja la marca (1c: plantilla, fitxa de venda, alerta de llistat lesionat).
export const duradaLesio = (lesio) => {
  const v = (lesio == null ? '' : String(lesio)).trim();
  return /^\d+$/.test(v) && v !== '0' ? Number(v) : null;
};

// NOTA AL PEU reutilitzable: qualificadors repetits en una taula (p.ex.
// «estimació — sense comparables» ×14) passen a un asterisc a la cel·la + una
// llegenda única davall. `marca(text)` torna l'asterisc (o **, *** si n'hi ha
// més d'un tipus); `llegendes()` torna les línies a pintar sota la taula.
export function notes() {
  const vistes = [];
  return {
    marca(text) { let i = vistes.indexOf(text); if (i < 0) i = vistes.push(text) - 1; return '*'.repeat(i + 1); },
    llegendes() { return vistes.map((t, i) => `${'*'.repeat(i + 1)} ${t}`); },
  };
}

// RENDIMENT: una raó menuda (guany per unitat de cost) que només servix per a ORDENAR. Amb
// `decimal` eixiria «0,0» per a tot i amb `String` eixiria «0.000012299999999». Es mostra amb
// tres xifres significatives, que és el que la fa comparable a colp d'ull.
export const rendiment = (n) => (n == null || n === '' || Number.isNaN(Number(n))
  ? '—' : Number(Number(n).toPrecision(3)).toString().replace('.', ','));

// PARÀMETRES D'UN TEXT, formatats d'un colp. Cap secció pot interpolar un número cru: un
// enter ha de dur el separador de milers i un fraccionari la coma valenciana (si no, ix
// «3.4000000000000004» per pantalla). Els que són DINERS els declara qui produïx el text
// (`claus_diners`), perquè cap regla els pot endevinar pel nom.
//   ambXifres({ cost: 131978, mancanca: 3.4, nom: 'X' }, ['cost'])
//     → { cost: '131 978 €', mancanca: '3,4', nom: 'X' }
export function ambXifres(par, clausDiners) {
  const o = { ...(par || {}) };
  const sonDiners = new Set(clausDiners || []);
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    o[k] = sonDiners.has(k) ? diners(v) : Number.isInteger(v) ? milers(v) : decimal(v);
  }
  return o;
}
