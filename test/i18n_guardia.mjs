// Tonico — GUARDIÀ i18n AMPLIAT (polit #4.1a + #4.3d). Vigila TOTES les claus
// referenciades a totes les pàgines/seccions (no sols alerta/categoria/motiu) i
// exigix PARITAT entre ca-valencia i en. node test/i18n_guardia.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../public/i18n/', import.meta.url);
const carrega = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
const ca = carrega('ca-valencia.json');
const en = carrega('en.json');
const te = (k) => Object.prototype.hasOwnProperty.call(ca, k);

// ── 0. PARITAT: tota clau d'una llengua ha d'existir a l'altra ──
const clausCa = Object.keys(ca), clausEn = Object.keys(en);
const faltenEn = clausCa.filter((k) => !(k in en));
const faltenCa = clausEn.filter((k) => !(k in ca));
assert.deepEqual(faltenEn, [], `claus a ca-valencia però no a en: ${faltenEn}`);
assert.deepEqual(faltenCa, [], `claus a en però no a ca-valencia: ${faltenCa}`);

// ── 1. Claus 'alerta.*' que produïxen les regles (literals de lib/regles.js) ──
const regles = readFileSync(new URL('../lib/regles.js', import.meta.url), 'utf8');
const clausAlerta = [...regles.matchAll(/'(alerta\.[a-z0-9_]+)'/g)].map((m) => m[1]);
assert.ok(clausAlerta.length >= 10, 'troba les claus d\'alerta');
for (const k of new Set(clausAlerta)) assert.ok(te(k), `falta la clau i18n d'alerta: ${k}`);

// ── 2. Literals ESTÀTICS t('a.b') i data-i18n="a.b" a tot public/ ──
// (Este pas és qui hauria caçat fotrem.edat.) Els prefixos dinàmics t('a.' + x)
// acaben en punt o en «_» i NO es capturen ací; es cobrixen al pas 3.
const pub = new URL('../public/', import.meta.url);
const fitxers = ['comu.js', 'seccions.js',
  ...readdirSync(pub).filter((f) => f.endsWith('.html'))];
const KEY = /[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+/;
const estatics = new Set();
for (const f of fitxers) {
  const src = readFileSync(new URL(f, pub), 'utf8');
  for (const m of src.matchAll(/\bt\(\s*(['"])([^'"]+)\1/g)) if (KEY.test(m[2]) && m[2] === m[2].match(KEY)[0]) estatics.add(m[2]);
  if (f.endsWith('.html')) for (const m of src.matchAll(/data-i18n\s*=\s*"([^"]+)"/g)) estatics.add(m[1]);  // atribut real, no comentaris JS
}
// Descarta els que acaben en «_» (prefixos dinàmics com economia.capital_)
for (const k of estatics) if (!k.endsWith('_')) assert.ok(te(k), `falta la clau i18n estàtica referenciada: ${k}`);

// ── 3. Famílies DINÀMIQUES t('prefix.' + variable): cada valor possible ──
// El domini dels `motiu` es DERIVA del codi (qualsevol `motiu: 'x'` de lib/), perquè afegir
// un motiu nou sense la seua clau és justament el que produïa «[text no disponible]».
function motiusDelCodi() {
  // Només hi ha DOS llocs que renderitzen t('motiu.' + …): els avisos d'alineació i el
  // veredicte de crida. El domini es deriva de les seues DUES funcions productores — no de
  // fitxers sencers, que arrossegarien `motiu` d'altres espais de noms (bucle d'estoc,
  // destí de venda, pipeline juvenil) que es renderitzen amb altres prefixos.
  const PRODUCTORS = [
    ['../lib/orquestra_alineacio.js', 'avisosOnze'],
    ['../lib/fotrem.js', 'avaluaCrida'],
  ];
  const vals = new Set();
  for (const [ruta, fn] of PRODUCTORS) {
    const src = readFileSync(new URL(ruta, import.meta.url), 'utf8');
    const i = src.indexOf(`function ${fn}(`);
    assert.ok(i >= 0, `el productor de motius ${fn} ja no existix: actualitza el guardià`);
    // Sobre el COS SENCER, no per línia: l'assignació de `motiu` pot ocupar més d'una
    // línia, i per línia el regex no la veia (i el domini eixia buit sense dir-ho).
    const cos = src.slice(i, src.indexOf('\n}\n', i))
      .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    for (const m of cos.matchAll(/\bmotiu:\s*'([a-z_]+)'/g)) vals.add(m[1]);
    for (const m of cos.matchAll(/\bmotiu\s*=\s*([^;]+);/g)) {
      for (const q of m[1].matchAll(/'([a-z_]+)'/g)) vals.add(q[1]);
    }
    for (const m of cos.matchAll(/motiu:\s*'([a-z_]+)'/g)) vals.add(m[1]);
  }
  assert.ok(vals.size >= 5,
    `el domini de motius ha eixit quasi buit (${vals.size}): el guardià no llig els productors`);
  return [...vals];
}

const families = {
  'habilitat': ['porteria','defensa','creativitat','passades','extrem','anotacio','pilota_aturada'],
  'vendes.eixida_': ['rebaixar','rellistar','despatxar','un_euro'],
  'flux.accio_': ['contracta','puja','renova','renova_al_nivell','no_renoves','res','exclos'],
  'flux': ['col_tipus','col_nivell','col_cost','col_accio'],
  'estoc': ['col_opcio','col_guany','col_cost','col_eficiencia'],
  'categoria': ['core', 'rotatiu', 'titular', 'porter', 'cos', 'venda', 'futur_entrenador'],
  'motiu': motiusDelCodi(),        // derivat del codi: un motiu nou el caça sol
  'motiu_baixa': ['venda', 'despatx', 'promocio', 'altres'],
  'tipus': ['compra', 'venda', 'sou_setmanal', 'ingres_patrocini', 'taquilla', 'personal', 'estadi', 'taxa_llistat', 'altres'],
  'font': ['comparables', 'pom'],
  'fotrem.estat_': ['seguiment', 'elegit', 'cua_eixida'],
  'configuracio.partits_': ['1', '2'],
  'estrategia': ['competitiva', 'cycle'],
  'sistema_juvenil': ['academia', 'cercapromeses', 'cap'],
  'personal.rol_': ['entrenador', 'especialista'],
  'vendes.estat_': ['pendent', 'llistat', 'venut', 'desert', 'despatxat'],
  'vendes': ['col_jugador', 'col_posicio', 'col_especialitat', 'col_proposat', 'col_preu', 'col_data', 'col_tancament', 'col_estat', 'col_venut'],
  'fotrem.joc_motiu_': ['revelar', 'dud', 'entrena', 'sense_pipeline'],
  'fotrem.onze_m_': ['entrena', 'estructura', 'recanvi'],
  'falten': ['caixa', 'personal', 'estadi', 'config_pais', 'config_divisio', 'config_partits_setmana', 'config_estrategia'],
  'dia': ['0', '1', '2', '3', '4', '5', '6'],   // noms de dia per a l'agenda
  'agenda': ['llistar'],                          // etiquetes curtes d'acció (missatge_clau del servidor)
  'element': ['assistents', 'metge', 'psicoleg'],
  // Columnes construïdes des d'arrays (t('prefix.' + k)):
  'personal': ['rol', 'tipus', 'nivell', 'sou', 'setmanes_contracte'],
  'fotrem': ['col_jugador', 'col_nivell', 'col_edat', 'col_especialitat', 'col_habilitats', 'col_potencial', 'col_promocio', 'col_aterratge', 'col_estat'],
  'plantilla': ['col_jugador', 'col_posicio', 'col_edat', 'col_especialitat', 'col_habilitats', 'col_tsi', 'col_puntuacio', 'col_categoria'],
  'economia': ['col_compres', 'col_vendes', 'col_marge', 'col_data', 'col_tipus', 'col_import', 'col_jugador', 'col_nota'],
  'jugador': ['col_data', 'col_temporada', 'col_edat', 'col_tsi', 'col_sou', 'col_habilitats', 'col_pops', 'col_categoria', 'col_origen', 'col_puntuacio'],
};
for (const [prefix, vals] of Object.entries(families)) for (const v of vals) {
  const k = prefix.endsWith('_') ? prefix + v : `${prefix}.${v}`;   // capital_/estat_ uneixen amb «_»
  assert.ok(te(k), `falta la clau dinàmica: ${k}`);
}

// ── 3b. PLURALS (punt 4): cada base tp() ha de tindre _1 i _n a les dues llengües, i la
// forma _1 (n=1) no pot renderitzar «1 {plural}» (cap «1 <paraula acabada en s>»). ──
const basesPlural = ['esta_setmana.resum_juvenil', 'fotrem.onze_tot_entrena', 'fotrem.onze_m_descobriment', 'alerta.llistar_agregat'];
for (const cat of [ca, en]) for (const base of basesPlural) {
  for (const suf of ['_1', '_n']) assert.ok(Object.prototype.hasOwnProperty.call(cat, base + suf), `falta la forma plural ${base}${suf}`);
  const un = cat[base + '_1'].replace(/\{n\}/g, '1');
  assert.ok(!/\b1\s+\S*s\b/.test(un), `plural mal a ${base}_1 (n=1): «${un}»`);
}

// Rols de partit: el nom visible és una clau i18n (config per plantilla).
for (const k of ['rol.onze_a', 'rol.onze_b', 'rol.onze_a_curt', 'rol.onze_b_curt']) assert.ok(te(k), `falta el nom de rol: ${k}`);

// ── 4. Cap valor del catàleg conté una clau sense resoldre (patró namespace.clau nu) ──
for (const cat of [ca, en]) for (const [k, v] of Object.entries(cat)) {
  assert.ok(!/\b(alerta|categoria|motiu|rol)\.[a-z_]+\b/.test(v), `el text de ${k} conté una clau crua: ${v}`);
}

// ── 5. Claus ÒRFENES (correcció post-auditoria #1, punt 4): tota clau 'alerta.*' o
// 'agenda.*' del catàleg ha d'estar EMESA pel codi (literal a lib/, functions/ o
// public/) o declarada a EXCEPCIONS_ORFENES (claus llegades que només viuen en files
// desades a BD). Si no, és text mort d'una doctrina retirada → error del guardià. ──
const EXCEPCIONS_ORFENES = [];   // claus alerta./agenda. que sobreviuen només en alertes desades
const dirs = [new URL('../lib/', import.meta.url), new URL('../functions/', import.meta.url),
  new URL('../functions/api/', import.meta.url), new URL('../public/', import.meta.url)];
const emeses = new Set();
for (const d of dirs) {
  for (const f of readdirSync(d).filter((x) => x.endsWith('.js'))) {
    const src = readFileSync(new URL(f, d), 'utf8');
    for (const m of src.matchAll(/['"](alerta\.[a-z0-9_]+|agenda\.[a-z0-9_]+)['"]/g)) emeses.add(m[1]);
  }
}
const orfenes = clausCa.filter((k) => /^(alerta|agenda)\./.test(k) && !emeses.has(k) && !EXCEPCIONS_ORFENES.includes(k));
assert.deepEqual(orfenes, [], `claus i18n òrfenes (al catàleg però mai emeses): ${orfenes.join(', ')}`);

// ── 6. GUARDIÀ LINGÜÍSTIC (valencià de la casa): formes VETADES al catàleg ca. Vore
// docs/GLOSSARI.md. Impedix que tornen a colar-se «d'hui», «parte», «Fotrem», etc. ──
const VETATS = [
  [/\bd['’]hui\b/i, 'd\'hui → «de hui» (hui no s\'apostrofa)'],
  [/\bavui\b/i, 'avui → «hui»'],
  [/\bparte\b/i, 'parte → «informe» (castellanisme)'],
  [/\bfotrem\b/i, 'Fotrem → «Acadèmia» (nom propi d\'un usuari)'],
  [/\baquest[ao]?s?\b/i, 'aquest/-a → «este/esta»'],
  [/\bsorti[rmt]/i, 'sortir → «eixir»'],
  [/\b(?:me|te|se)va\b/i, 'meva/teva/seva → «meua/teua/seua»'],
];
const infraccions = [];
for (const [k, v] of Object.entries(ca)) for (const [re, msg] of VETATS) if (re.test(v)) infraccions.push(`${k}: ${msg}  ·  «${v}»`);
assert.deepEqual(infraccions, [], `formes vetades al catàleg ca:\n  ${infraccions.join('\n  ')}`);

console.log(`OK — guardià i18n: ${clausCa.length} claus, paritat ca↔en, literals, òrfenes i formes vetades`);
