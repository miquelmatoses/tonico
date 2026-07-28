// Tonico — GUARDIÀ i18n AMPLIAT (polit #4.1a + #4.3d). Vigila TOTES les claus
// referenciades a totes les pàgines/seccions (no sols alerta/categoria/motiu) i
// exigix PARITAT entre ca-valencia i en. node test/i18n_guardia.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../public/i18n/', import.meta.url);
const carrega = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
const ca = carrega('ca-valencia.json');
const en = carrega('en.json');
// Una clau existix si hi és, o si hi és la seua PARELLA DE PLURAL (`_1` i `_n`): quan un text
// porta comptador, el missatge_clau és la base i la variant la tria el nombre.
const hiEs = (k) => Object.prototype.hasOwnProperty.call(ca, k);
const te = (k) => hiEs(k) || (hiEs(`${k}_1`) && hiEs(`${k}_n`));

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
// (Este pas és qui hauria caçat juvenils.edat.) Els prefixos dinàmics t('a.' + x)
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
  // CANARI: si el regex deixa de casar, la comprovació passaria en buit. L'únic productor que
  // queda de l'espai `motiu.*` és la crida juvenil (n'emet quatre); els de l'onze d'entrenament
  // viuen a `alineacio.motiu_*`, que és un altre espai i el cobrix el guardià de famílies.
  assert.ok(vals.size >= 4,
    `el domini de motius ha eixit quasi buit (${vals.size}): el guardià no llig els productors`);
  return [...vals];
}

const families = {
  // UN SOL vocabulari: `hab.*`, el nom de l'HABILITAT. El catàleg `habilitat.*` aparellava una
  // a una les set habilitats amb un «tipus de jugador», però Hattrick només té CINC posicions:
  // «passador» i «llançador» estaven inventats per a omplir la taula.
  'hab': ['porteria','defensa','creativitat','passades','extrem','anotacio','pilota_aturada'],
  // Les accions que el pla POT proposar. Fora `puja`/`puja_al_venciment`/`exclos`: pujar de
  // nivell fora del venciment no és una acció possible (és acomiadar), i el pla ja no exclou
  // ningú. Les formes `_n` porten el nivell concret que el flux sosté.
  // «res» fora: quan no hi ha res a fer NO ES DIU RES. Explicar cada setmana per què no toca
  // moure el nivell és soroll amb un altre nom; l'espai de la píndola es queda buit.
  'flux.accio_': ['contracta','contracta_n','renova','renova_al_nivell_n','no_renoves'],
  'estoc': ['col_que', 'col_per_que', 'col_cost'],
  // Els 16 nivells d'habilitat, pel NOM de Hattrick. L'escala de Tonico compta des d'on el sou
  // deixa de ser el mínim: nivell 1 = «Insuficient» (HT 5), o siga Tonico n = HT n+4.
  'nivell_ht': Array.from({ length: 16 }, (_, i) => String(i + 1)),
  'motiu_baixa': ['venda', 'despatx', 'promocio', 'altres'],
  // `tipus.*` (moviments) i `font.*` (d'on eixia el preu estimat) han caigut: ni hi ha
  // comptabilitat de moviments ni cap estimació de preu.
  'juvenils.estat_': ['seguiment', 'elegit', 'cua_eixida'],
  'configuracio.partits_': ['1', '2'],
  'estrategia': ['competitiva', 'cycle'],
  'sistema_juvenil': ['academia', 'cercapromeses', 'cap'],
  // «desert» fora: no es tria a mà (es deduïx de la transició del CSV i es desa) i un jugador
  // desert ja no arriba a la fitxa de venda.
  'vendes.estat_': ['pendent', 'llistat', 'venut', 'despatxat'],
  'vendes': ['col_jugador', 'col_posicio', 'col_especialitat', 'col_situacio', 'col_data', 'col_tancament', 'col_estat'],
  'falten': ['caixa', 'personal', 'estadi', 'config_pais', 'config_divisio', 'config_partits_setmana', 'config_estrategia'],
  'dia': ['0', '1', '2', '3', '4', '5', '6'],   // noms de dia per a l'agenda
  'agenda': ['llistar'],                          // etiquetes curtes d'acció (missatge_clau del servidor)
  // Els sis tipus d'especialista de la guia + l'entrenador principal (que no gasta plaça).
  'element': ['assistent', 'metge', 'psicoleg', 'forma', 'tactic', 'financer', 'entrenador'],
  // Columnes construïdes des d'arrays (t('prefix.' + k)):
  'personal': ['tipus', 'nivell', 'sou', 'data_fi_contracte'],
  'juvenils': ['col_jugador', 'col_nivell', 'col_edat', 'col_especialitat', 'col_habilitats', 'col_potencial', 'col_promocio', 'col_aterratge', 'col_estat'],
  'jugador': ['col_data', 'col_temporada', 'col_edat', 'col_tsi', 'col_sou', 'col_habilitats', 'col_pops'],
};
for (const [prefix, vals] of Object.entries(families)) for (const v of vals) {
  const k = prefix.endsWith('_') ? prefix + v : `${prefix}.${v}`;   // capital_/estat_ uneixen amb «_»
  assert.ok(te(k), `falta la clau dinàmica: ${k}`);
}

// ── 3b. PLURALS (punt 4): cada base tp() ha de tindre _1 i _n a les dues llengües, i la
// forma _1 (n=1) no pot renderitzar «1 {plural}» (cap «1 <paraula acabada en s>»). ──
const basesPlural = ['esta_setmana.resum_juvenil', 'juvenils.onze_tot_entrena', 'juvenils.onze_m_descobriment', 'alerta.llistar_agregat'];
for (const cat of [ca, en]) for (const base of basesPlural) {
  for (const suf of ['_1', '_n']) assert.ok(Object.prototype.hasOwnProperty.call(cat, base + suf), `falta la forma plural ${base}${suf}`);
  const un = cat[base + '_1'].replace(/\{n\}/g, '1');
  assert.ok(!/\b1\s+\S*s\b/.test(un), `plural mal a ${base}_1 (n=1): «${un}»`);
}

// ── 3c. ESPAIS DE NOMS INTERPOLATS: tot `t('prefix.' + x)` de la vista ha de tindre almenys
// una clau `prefix.*` al catàleg. Sense això, un catàleg retirat es queda interpolat en una
// branca poc transitada i no ho descobrix ningú: `habilitat.*` (els «tipus de jugador» amb
// «passador» i «llançador» inventats) va sobreviure així a la línia de la recomanació de
// fitxatge, que HUI no s'executa mai perquè cap candidat de mercat és admissible encara. ──
{
  const orfes = [];
  for (const f of readdirSync(new URL('../public/', import.meta.url)).filter((x) => x.endsWith('.js'))) {
    const src = readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-z_]+)\.'\s*\+/g)) {
      const prefix = m[1];
      if (!clausCa.some((k) => k.startsWith(prefix + '.'))) orfes.push(`${f}: t('${prefix}.' + …)`);
    }
  }
  assert.deepEqual([...new Set(orfes)], [],
    `la vista interpola espais de noms que el catàleg no té:\n  ${[...new Set(orfes)].join('\n  ')}`);
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
// Una variant de plural la emet el codi per la seua BASE (`tp` hi afig el sufix).
const emesa = (k) => emeses.has(k) || (/_(1|n)$/.test(k) && emeses.has(k.replace(/_(1|n)$/, '')));
const orfenes = clausCa.filter((k) => /^(alerta|agenda)\./.test(k) && !emesa(k) && !EXCEPCIONS_ORFENES.includes(k));
assert.deepEqual(orfenes, [], `claus i18n òrfenes (al catàleg però mai emeses): ${orfenes.join(', ')}`);

// ── 6. GUARDIÀ LINGÜÍSTIC (valencià de la casa): formes VETADES al catàleg ca. Vore
// docs/GLOSSARI.md. Impedix que tornen a colar-se «d'hui», «parte», «Juvenils», etc. ──
const VETATS = [
  [/\bd['’]hui\b/i, 'd\'hui → «de hui» (hui no s\'apostrofa)'],
  [/\bavui\b/i, 'avui → «hui»'],
  [/\bparte\b/i, 'parte → «informe» (castellanisme)'],
  [/\bfotrem\b/i, 'Juvenils → «Acadèmia» (nom propi d\'un usuari)'],
  [/\baquest[ao]?s?\b/i, 'aquest/-a → «este/esta»'],
  [/\bsorti[rmt]/i, 'sortir → «eixir»'],
  [/\b(?:me|te|se)va\b/i, 'meva/teva/seva → «meua/teua/seua»'],
  [/\bche\b/i, 'Che → «Xe» (és així com s\'escriu)'],
  [/\bmigcampista/i, 'migcampista → «mig centre» (és el nom de la posició)'],
  [/\bpassador\b/i, 'passador → no existix: «passades» és una habilitat, no una posició'],
  [/\bllançador\b/i, 'llançador → no existix: «pilota aturada» és una habilitat, no una posició'],
];

// CLAUS VETADES: text que no ha d'existir perquè la decisió és NO DIR RES. Una clau «no hi ha
// res a fer» sempre acaba pintada per algú, i explicar cada setmana per què no toca fer res és
// soroll amb un altre nom.
const CLAUS_VETADES = ['flux.accio_res', 'flux.accio_res_1', 'flux.accio_res_n'];
for (const cat of [ca, en]) {
  const revivides = CLAUS_VETADES.filter((k) => Object.prototype.hasOwnProperty.call(cat, k));
  assert.deepEqual(revivides, [], `claus vetades que han tornat: ${revivides.join(', ')}\n` +
    '→ quan no hi ha acció possible, la píndola es queda BUIDA.');
}
const infraccions = [];
for (const [k, v] of Object.entries(ca)) for (const [re, msg] of VETATS) if (re.test(v)) infraccions.push(`${k}: ${msg}  ·  «${v}»`);
assert.deepEqual(infraccions, [], `formes vetades al catàleg ca:\n  ${infraccions.join('\n  ')}`);

// ── 6b. V9 · CATÀLEG SENCER: intentat i DESCARTAT com a guardià automàtic.
// La vista compon les claus de mil maneres (t('pre.' + k), t(clau + '.titol'), plantilles amb
// prefix I sufix variables, `${CAMPS_JUSTIF}.${categoria}`), i un detector per expressions
// regulars dona ~145 falsos positius sobre 580 claus: un guardià que crida el llop cada dia
// no es mira. Per a fer-ho bé cal recórrer l'AST de la vista o instrumentar `t()` en execució.
// Passada MANUAL feta el 2026-07-26: cinc textos morts de la fàbrica esborrats
// (pujada.exit, economia.capital_coixi_sou, comparador.velocitat, juvenils.onze_descobriments,
// esta_setmana.alineacio_resum). El control automàtic de `alerta.*`/`agenda.*` (pas 5) es
// queda, que és on el text mort fa més mal: eixes claus les emet el codi, no la vista.

// ── 7. V7 · CONCORDANÇA DE NOMBRE: cap text pot interpolar un COMPTADOR seguit d'un nom o
// verb en plural fix. «{n} llocs» es llig malament quan n = 1, i el sistema diu números d'1
// contínuament (1 dia, 1 setmana, 1 juvenil). Qui du comptador es partix en `_1` / `_n` i
// es crida amb `tp`. Les EXEMPCIONS són textos on el número no concorda amb res (una raó,
// una abreviatura, una etiqueta amb el compte entre parèntesis).
const EXEMPTS_PLURAL = new Set([
  'comu.lesionat_durada',              // «🤕 {n} setm.» — abreviatura invariable
  'alerta.lesio_venda',                // «({setmanes} setm.)» — idem
  'alerta.llistar_lesionat',           // idem
  'alineacio.onze_sub',                // «{n} entrenant» — gerundi invariable
  'juvenils.onze_repartiment',           // comptes + gerundis, cap plural que concorde
  'vendes.retingut_cobertura',         // «{n} de camp» — sense nom en plural
  'juvenils.onze_no_viable',             // «només {en_camp} en camp» — idem
  'alerta.crida_juvenil',              // «es quedarà en {futur}» — no compta res
]);
{
  const bases = new Set(clausCa.filter((k) => /_(1|n)$/.test(k)).map((k) => k.replace(/_(1|n)$/, '')));
  // Nom o verb en plural just darrere d'un comptador. Es limita als noms/verbs que el
  // sistema usa de veritat: així no cal endevinar la morfologia del valencià sencera.
  const PLURAL = /\{(n|dies|setmanes|total|actuals|falten|sobren|disponibles|entrenen|descobriments|mancanca|nous|jugarien)\}(?:\/\{\w+\})?\s+(dies|setmanes|jugadors|juvenils|migs|llocs|nivells|pops|entrenen|esperen)\b/;
  const nus = [];
  for (const k of clausCa) {
    if (/_(1|n)$/.test(k) || bases.has(k) || EXEMPTS_PLURAL.has(k)) continue;
    const m = ca[k].match(PLURAL);
    if (m) nus.push(`${k} («${m[0]}»)`);
  }
  assert.deepEqual(nus, [],
    `comptadors sense concordança de nombre: ${nus.join(', ')}\n` +
    '→ partix el text en «_1» i «_n» i crida\'l amb tp(); si el número no concorda amb res, ' +
    'apunta la clau a EXEMPTS_PLURAL amb el motiu.');
  // Que les exempcions no es tornen un calaix: cap pot ser d'una clau que ja no existix.
  const mortes = [...EXEMPTS_PLURAL].filter((k) => !clausCa.includes(k));
  assert.deepEqual(mortes, [], `exempcions de plural per a claus que ja no hi són: ${mortes.join(', ')}`);
}

console.log(`OK — guardià i18n: ${clausCa.length} claus, paritat ca↔en, literals, òrfenes, formes vetades i concordança de nombre`);
