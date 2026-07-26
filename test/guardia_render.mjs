// Tonico — G2 RENDER-PUR (invariant 12 del contracte). Els fitxers de presentació no
// han de contindre lògica de domini: cap llinda numèrica ni aritmètica/condicional sobre
// variables de domini (urgència, pct, preu, edat, nivell, sou, caixa…). Han d'interpolar
// valors JA calculats per l'avaluador.
//
// ESTAT: guardià de RATCHET. Detecta els smells clars HUI (llindes numèriques en
// comparació + aritmètica sobre vars de domini) i els fixa en un BASELINE de deute
// conegut (test/guardia_render_base.json). Falla si apareix un smell NOU. El baseline es
// BUIDA a mesura que la reconstrucció (L1–L11 del DIFF) mou la lògica a l'avaluador; mai
// creix. Regenera'l a consciència amb:  ACTUALITZA_BASELINE=1 node test/guardia_render.mjs
// node test/guardia_render.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..');
const FITXERS = ['public/seccions.js'];        // superfície de presentació (format.js/comu.js = ajudes pures)
const BASE = join(arrel, 'test/guardia_render_base.json');

// Variables de domini: si apareixen amb un operador aritmètic/comparatiu, és lògica.
const DOMINI = ['urgencia', 'pct', 'preu', 'edat', 'nivell', 'sou', 'caixa', 'valor',
  'dies', 'marge', 'objectiu', 'puntuacio', 'porteria', 'creativitat', 'exp', 'falten', 'saldo'];
const reLlinda = /[<>]=?\s*-?\d|-?\d+(?:\.\d+)?\s*[<>]=?/;          // comparació amb literal numèric
const reDominiOp = new RegExp(`\\b(${DOMINI.join('|')})\\w*\\s*[<>+\\-*/]=?\\s*[\\w.]|[\\w.]\\s*[<>+\\-*/]=?\\s*\\b(${DOMINI.join('|')})`);

const senseCadenes = (l) => l
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``');

function escaneja(rel) {
  const violacions = [];
  const codi = readFileSync(join(arrel, rel), 'utf8').split('\n');
  codi.forEach((linia, i) => {
    // Fora comentaris I LITERALS DE CADENA. Sense llevar les cadenes, un nom de classe CSS com
    // «placa-sou» es llegia com a resta (`a` − `sou`) i es marcava com a aritmètica de domini.
    // Una paraula de domini dins d'una cadena no és mai lògica.
    const net = senseCadenes(linia.replace(/\/\/.*$/, '')).trim();
    if (!net) return;
    const teLlinda = reLlinda.test(net);
    const teDominiOp = reDominiOp.test(net);
    if (teLlinda || teDominiOp) violacions.push({ fitxer: rel, linia: i + 1, text: net });
  });
  return violacions;
}

// ── I3: QUALSEVOL import renderitzat sense passar pel formatador únic ──
// Un valor monetari que arriba a la vista ha de passar per diners()/eur(). Es busca l'ACCÉS
// al camp (`obj.sou`), no la paraula: si no, les claus i18n («flux.sense_flux») donarien
// falsos positius. Per això primer es lleven els literals de cadena, i s'ignoren els usos
// que només comparen (`x.caixa == null`), que no pinten res.
const CAMPS_IMPORT = ['sou', 'preu', 'caixa', 'cost', 'flux', 'import', 'valor_net', 'pressupost',
  'sou_sostenible', 'caixa_disponible', 'estadi_cost_obra', 'estadi_manteniment', 'flux_lliure',
  'flux_restant', 'despeses_fixes', 'ingressos_recurrents', 'nomina', 'preu_esperat',
  'preu_proposat', 'delta_flux', 'sou_total', 'marge'];

function escanejaImports(rel) {
  const out = [];
  readFileSync(join(arrel, rel), 'utf8').split('\n').forEach((linia, i) => {
    const net = senseCadenes(linia.replace(/\/\/.*$/, '')).trim();
    if (!net || !net.includes('text:')) return;
    // `ambXifres(obj, ['clau'])` és el MATEIX mecanisme de declaració que `diners`/`eur`: qui
    // emet declara quines claus són imports i el formatador les passa. Faltava a la llista, i
    // per tant una línia que el feia servir es marcava com a smell.
    if (/diners\(|eur\(|ambXifres\(/.test(net)) return;     // ja passa pel formatador
    for (const camp of CAMPS_IMPORT) {
      const re = new RegExp(`\\.${camp}\\b(?!\\s*[=!<>])`);   // accés al camp, no comparació
      if (!re.test(net)) continue;
      out.push({ fitxer: rel, linia: i + 1, text: linia.trim(), import_cru: camp });
      break;
    }
  });
  return out;
}

// ── I3 (regla, no cas): cap alerta pot passar un IMPORT sense declarar-lo a `diners`.
// Les unitats les declara qui emet; si no, la vista el pinta en cru. Es comprova sobre TOTES
// les emissions d'alerta, no sobre les que s'hagen vist fallar.
const emissionsSenseDeclarar = () => {
  const src = readFileSync(join(arrel, 'lib/regles.js'), 'utf8');
  const fora = [];
  // Cada crida a alerta(...): params entre les primeres claus, i `diners` com a últim array.
  for (const m of src.matchAll(/alerta\(\s*'([A-Z_]+)'[^;]*?\{([^{}]*)\}([^;]*?)\)/gs)) {
    const [, codi, params, cua] = m;
    const claus = [...params.matchAll(/(\w+)\s*:/g)].map((x) => x[1]);
    const declarats = new Set([...(cua.match(/\[([^\]]*)\]/)?.[1] || '').matchAll(/'(\w+)'/g)].map((x) => x[1]));
    for (const c of claus) {
      if (!CAMPS_IMPORT.includes(c)) continue;
      if (declarats.has(c)) continue;
      fora.push({ fitxer: 'lib/regles.js', linia: 0, text: `${codi}: l'import «${c}» no es declara a \`diners\``, import_cru: c });
    }
  }
  return fora;
};

const actuals = [...FITXERS.flatMap(escaneja), ...FITXERS.flatMap(escanejaImports), ...emissionsSenseDeclarar()];
// Signatura estable a moviments de línia I a canvis de literals: el baseline es va escriure
// amb el text cru i ara `escaneja` normalitza les cadenes, així que les dues bandes es
// normalitzen igual. Si no, un deute ja conegut tornaria a comptar com a nou.
const sig = (v) => `${v.fitxer}:${senseCadenes(v.text).trim()}`;

if (process.env.ACTUALITZA_BASELINE) {
  writeFileSync(BASE, JSON.stringify({ _nota: 'Deute conegut de render-pur (G2). Es BUIDA amb la reconstrucció; mai creix.', violacions: actuals }, null, 2) + '\n');
  console.log(`baseline actualitzat: ${actuals.length} violacions conegudes`);
  process.exit(0);
}

assert.ok(existsSync(BASE), 'falta test/guardia_render_base.json — genera\'l amb ACTUALITZA_BASELINE=1');
const baseline = JSON.parse(readFileSync(BASE, 'utf8'));
// ── V8 (regla, no cas): cap xifra FRACCIONÀRIA s'interpola crua dins d'un text.
// Un enter cru es llig; un fraccionari ix «3.4000000000000004». Les magnituds fraccionàries
// del contracte estan nomenades: si una d'elles entra a un `t(clau, {…})` sense passar per
// `ambXifres` (o per un formatador explícit), el text les pintarà crues.
{
  const FRACCIONARIES = /^(mancanca|guany|eficiencia|rendiment|puntuacio|pes|delta|sobrecost|exces|util|valor_net)$/;
  const FORMATAT = /\b(ambXifres|eur|diners|milers|decimal|percent|rendiment)\s*\(/;
  const vista2 = readFileSync(new URL('../public/seccions.js', import.meta.url), 'utf8');
  const re = /t\('([\w.]+)',\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|ambXifres\([\s\S]{0,400}?\))\)/g;
  const crues = [];
  let m;
  while ((m = re.exec(vista2))) {
    if (FORMATAT.test(m[2].slice(0, 12))) continue;            // ja ve formatat de fora
    const linia = vista2.slice(0, m.index).split('\n').length;
    for (const parell of m[2].split(/,(?![^()]*\))/)) {
      const p = parell.match(/([\w_]+)\s*:\s*([\s\S]+)/);
      if (!p || !FRACCIONARIES.test(p[1]) || FORMATAT.test(p[2])) continue;
      crues.push(`${linia}: ${m[1]} → ${p[1]}`);
    }
  }
  assert.deepEqual(crues, [],
    `magnituds fraccionàries interpolades crues (${crues.join('; ')}): passa els paràmetres per ambXifres()`);
}

const conegudes = new Set(baseline.violacions.map(sig));

const noves = actuals.filter((v) => !conegudes.has(sig(v)));
assert.equal(noves.length, 0,
  `G2 render-pur: ${noves.length} smell(s) de domini NOU(s) en presentació:\n` +
  noves.map((v) => `  ${v.fitxer}:${v.linia}  ${v.text}`).join('\n') +
  `\n→ mou la lògica a l'avaluador (no a la vista). Si és fals positiu, justifica'l al baseline.`);

// Ratchet: si el codi ha netejat violacions, avisa que cal reduir el baseline (no bloqueja).
const resoltes = [...conegudes].filter((s) => !actuals.some((v) => sig(v) === s));
console.log(`OK — G2 render-pur: 0 smells nous · ${conegudes.size} de deute conegut` +
  (resoltes.length ? ` · ${resoltes.length} ja resoltes (buida el baseline)` : ''));
