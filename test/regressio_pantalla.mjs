// Tonico — REGRESSIONS DE PANTALLA (regla, no cas):
//  I5 · TOTA categoria mostra la puntuació de la seua clau d'orde — no només les que
//       fallaven. Un rol nou sense puntuació peta ací.
//  I6 · Sense files, no es pinta la taula: cap capçalera òrfena.
// node test/regressio_pantalla.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construeixPlantilla, ROLS } from '../lib/plantilla.js';
import { sobrecost } from '../lib/mancanca.js';

// ── I5: cada categoria té una clau d'orde, i per tant una puntuació ──
const LLOCS = [
  { lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat' },
  { lloc: 'ext1', entrena: true, pct: 50, habilitat: 'extrem' },
  { lloc: 'por', entrena: false, habilitat: 'porteria' },
  { lloc: 'dc1', entrena: false, habilitat: 'defensa' },
];
const j = (id, o) => ({ jugador_id: id, edat_anys: 20, edat_dies: 0, sou: 1000,
  creativitat: 1, extrem: 1, porteria: 1, defensa: 1, anotacio: 1, ...o });
const squad = [
  j(1, { creativitat: 9 }), j(2, { creativitat: 8 }), j(3, { extrem: 7 }),
  j(4, { porteria: 9 }), j(5, { porteria: 6 }), j(6, { defensa: 8 }),
  j(7, { sou: 200 }), j(8, { sou: 250 }),
  j(9, { sou: 9000, defensa: 3 }), j(10, { sou: 8000, creativitat: 2 }),   // sobrants
];
const r = construeixPlantilla(squad, LLOCS, { A: 'creativitat', core_a_min: 0,
  edat_pic_venda: 25, any_dies: 112, partits_setmana: 2, llocs_partit: 8, habilitat_porter: 'porteria' });

// Tots els rols RETINGUTS porten punts: cap excepció, present o futura.
for (const rol of ROLS) {
  const seus = r.retinguts.filter((x) => r.rol[x.jugador_id] === rol);
  for (const x of seus) {
    assert.ok(r.punts[x.jugador_id] != null,
      `el rol «${rol}» ha de portar la puntuació de la seua clau d'orde (jugador ${x.jugador_id})`);
  }
}
// I la VENDA també en té una: la del PAS 7 (sobrecost DESC). És calculable.
const TS = { creativitat: { 1: 250, 2: 270, 3: 330 }, defensa: { 1: 250, 2: 270, 3: 310 } };
for (const x of r.venda) {
  const p = sobrecost(x, 'defensa', 2, TS);
  assert.ok(p != null, `un sobrant ha de tindre puntuació calculable (jugador ${x.jugador_id})`);
}
// Cap jugador es queda fora de les dues llistes: tots tenen categoria i, per tant, clau.
assert.equal(r.retinguts.length + r.venda.length, squad.length);

// ── I6: cap taula amb capçalera i sense files ──
const vista = readFileSync(new URL('../public/seccions.js', import.meta.url), 'utf8');
// Tota capçalera de graella ha d'estar darrere d'una guarda de files, o vindre de l'ajudant
// únic `graellaAmbFiles` (que ja es nega a pintar-la buida).
const linies = vista.split('\n');
const sensGuarda = [];
linies.forEach((l, i) => {
  if (!/graella-cap/.test(l)) return;
  const context = linies.slice(Math.max(0, i - 3), i + 1).join(' ');
  const protegida = /graellaAmbFiles/.test(context) || /\.length\)/.test(context) || /if \(/.test(context);
  if (!protegida) sensGuarda.push(i + 1);
});
assert.deepEqual(sensGuarda, [],
  `capçaleres de taula sense guarda de files (línies ${sensGuarda.join(', ')}): sense dades no es pinta la taula`);
assert.ok(/const graellaAmbFiles = /.test(vista), 'l\'ajudant únic de graella existix');
assert.ok(/if \(!files \|\| !files\.length\) return null;/.test(vista),
  'i es nega a pintar una taula sense files');

// ── V1: cap camp es pinta buit havent-hi valor ──
// La regla: tot camp de formulari o duu el VALOR ACTUAL precarregat, o declara per què no en
// té. Un camp que es pinta buit i després es desa esborra el que hi havia; i un camp buit
// obliga l'usuari a tornar a teclejar el que el sistema ja sap.
//   `value:` a la construcció, o `X.value = …` dins de la mateixa funció → precarregat.
//   `// crea`        → formulari d'alta: no hi ha valor previ.
//   `// precarrega`  → el valor entra per un ajudant (que hi posa `selected`).
// Un camp nou sense res d'això peta ací: és la manera de no repetir el defecte.
{
  const linies = vista.split('\n');
  const fiFuncio = (i) => { let k = i; while (k < linies.length && !/^\}/.test(linies[k])) k++; return k; };
  const nus = [];
  linies.forEach((l, i) => {
    const re = /const (\w+) = el\('(input|select)'/g;
    let m;
    while ((m = re.exec(l))) {
      if (/value:|type: 'file'|type: 'submit'|type: 'hidden'/.test(l)) continue;
      if (/setAttribute\('selected'/.test(l)) continue;
      if (/\/\/ (crea|precarrega)$/.test(l.trimEnd())) continue;
      const cos = linies.slice(i, fiFuncio(i)).join('\n');
      if (new RegExp(`\\b${m[1]}\\.value\\s*=`).test(cos)) continue;
      nus.push(`${i + 1}:${m[1]}`);
    }
  });
  assert.deepEqual(nus, [],
    `camps sense valor precarregat ni motiu declarat (${nus.join(', ')}): ` +
    'o li poses el valor actual, o el marques «// crea» / «// precarrega»');
  // I que els marcadors no es tornen un calaix de sastre buit: han de existir de veritat.
  assert.ok((vista.match(/\/\/ (crea|precarrega)$/gm) || []).length >= 5,
    'els marcadors de camp existixen i s\'usen');
}

// ── V10: cada taula ha de dur les seues columnes definides ──
// La capçalera i les files són graelles SEPARADES: si la classe de fila no té
// `grid-template-columns`, cadascuna resol amplades pel seu compte i els números no queden
// sota el seu títol (i amb una sola columna implícita, la taula es desfà en una llista).
// La regla lliga les DOS coses que han de quadrar: el nombre de capçaleres que la vista
// passa i el nombre de pistes que el CSS declara.
{
  const css = readFileSync(new URL('../public/estil.css', import.meta.url), 'utf8');
  const pistes = (classe) => {
    const m = css.match(new RegExp(`\\.${classe}\\s*\\{[^}]*grid-template-columns:\\s*([^;]+);`));
    if (!m) return null;
    // `repeat(n, X)` compta com n pistes; la resta, un token per pista.
    let n = 0;
    for (const tros of m[1].replace(/minmax\([^)]*\)/g, 'M').split(/\s+/).filter(Boolean)) {
      const r = tros.match(/^repeat\((\d+),$/);
      n += r ? Number(r[1]) : (tros === 'M,' || tros === 'M' || /^(auto|[\d.]+fr|\dpx)/.test(tros) ? 1 : 0);
    }
    return n;
  };
  const problemes = [];
  for (const m of vista.matchAll(/graellaAmbFiles\('(c-[\w-]+)',\s*\n?\s*\[([^\]]*)\]/g)) {
    const classe = m[1];
    const nCaps = m[2].split(',').filter((x) => x.trim()).length;
    const nPistes = pistes(classe);
    if (nPistes == null) { problemes.push(`${classe}: cap grid-template-columns al CSS`); continue; }
    if (nPistes !== nCaps) problemes.push(`${classe}: ${nCaps} capçaleres però ${nPistes} pistes al CSS`);
  }
  assert.ok(problemes.length === 0, `taules amb columnes mal definides:\n  ${problemes.join('\n  ')}`);
  // I TOTA classe de fila que la vista use ha de tindre columnes, encara que la capçalera no
  // vinga de `graellaAmbFiles` (hi ha taules que la munten a mà).
  const classes = new Set([...vista.matchAll(/graella-fila-d (c-[\w-]+)/g)].map((m) => m[1]));
  for (const m of vista.matchAll(/graella-fila-d (c-[\w-]+)' \+/g)) classes.add(m[1]);
  // CANARI: si el regex deixa de casar, la comprovació passaria en buit sense dir res. En
  // queden dues taules de veres (`c-estoc` i `c-venda`): la de personal ha passat a píndoles.
  assert.ok(classes.size >= 2, `la comprovació ha de vore diverses taules (${[...classes].join(', ')})`);
  const sense = [...classes].filter((c) => pistes(c) == null);
  assert.deepEqual(sense, [], `classes de fila sense grid-template-columns: ${sense.join(', ')}`);

  // LES FILES DE `.fila` HAN DE TINDRE LES CINC CEL·LES DE LA GRAELLA. Al muntar l'onze
  // titular vaig fer una fila de quatre amb una etiqueta pel davant: la graella es desquadra i
  // el codi de colors del xip de posició es perd. Es busca cada `class: 'fila'` de la vista i
  // es compten els fills de primer nivell fins a tancar la crida a `el(`.
  {
    const pistes = (classe) => {
      const m = css.match(new RegExp(`\\.${classe}\\s*\\{[^}]*grid-template-columns:\\s*([^;]+);`));
      return m ? m[1].replace(/minmax\([^)]*\)/g, 'M').split(/\s+/).filter(Boolean).length : null;
    };
    const nPistes = pistes('fila');
    assert.ok(nPistes, '`.fila` declara les seues columnes al CSS');
    const dolentes = [];
    let vistes = 0;
    // SENSE COMENTARIS. El recorregut tracta l'apòstrof com a obertura de cadena, i un
    // comentari amb «l'objectiu» dins es menjava les comes de la resta de la fila: la fila
    // eixia de quatre cel·les i el guardià acusava un desquadre que no existia.
    const net = vista.split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
    for (const m of net.matchAll(/class: (?:'fila'|[\w.?: ]*'fila'[\w.?: ']*)\s*\}/g)) {
      // Des del `}` dels atributs fins al `)` que tanca eixe `el(`: les comes de nivell 0 (fora
      // de parèntesis i de cadenes) separen els fills.
      // Es TALLA en trossos per les comes de nivell 0 i es conten els NO BUITS. Comptar comes
      // no valia: una coma sobrant («…, );») deixava el compte igual que amb el fill posat, i
      // per tant la fila escapçada passava el guardià.
      let prof = 0, dins = null, tros = '';
      const fills = [];
      let i = net.indexOf('}', m.index) + 1;
      for (; i < net.length; i++) {
        const c = net[i];
        if (dins) { tros += c; if (c === dins && net[i - 1] !== '\\') dins = null; continue; }
        if (c === "'" || c === '"' || c === '`') { dins = c; tros += c; continue; }
        if (c === '(' || c === '{' || c === '[') prof++;
        else if (c === '}' || c === ']') prof--;
        else if (c === ')') { if (prof === 0) break; prof--; }
        else if (c === ',' && prof === 0) { fills.push(tros); tros = ''; continue; }
        tros += c;
      }
      fills.push(tros);
      const cel = fills.filter((x) => x.trim() && x.trim() !== '...').length;
      vistes++;
      if (cel !== nPistes) dolentes.push(`${cel} cel·les contra ${nPistes} pistes`);
    }
    assert.ok(vistes >= 2, `la comprovació ha de vore les files de \`.fila\` (n'ha vist ${vistes})`);
    assert.deepEqual(dolentes, [], `files de \`.fila\` desquadrades:\n  ${dolentes.join('\n  ')}`);
  }

  // ELS NÚMEROS D'UNA COLUMNA S'ALINEEN PER LES UNITATS. Sense xifres de la mateixa amplària
  // («tabular-nums») i sense alinear a la dreta, un 7 i un 128 no comparteixen la vertical i la
  // columna es llig com si els números estigueren tirats on siga.
  for (const classe of ['punts', 'tsi', 'graella-val']) {
    const regla = css.match(new RegExp(`\\.${classe}\\s*\\{([^}]*)\\}`))?.[1] || '';
    assert.ok(/tabular-nums/.test(regla), `.${classe}: falta font-variant-numeric: tabular-nums`);
    assert.ok(/text-align:\s*right/.test(regla), `.${classe}: els números van alineats a la dreta`);
  }

  // LES COLUMNES DE NÚMERO HAN D'ANAR A AMPLE FIX, i el motiu és que CADA `.fila` ÉS UNA
  // GRAELLA PRÒPIA: les pistes `auto` es calculen dins de cada fila, no entre files. Amb `auto`,
  // una fila amb «6,0» i una altra amb «−23,3» es donen amples distints i la columna es llig
  // dentada per molt que la xifra vaja alineada a la dreta. Amb `fr` passa igual, perquè el
  // repartiment depén del que ocupen les altres cel·les d'eixa fila.
  {
    // TOTES les declaracions de `.fila`, no només la primera: les variants (`.fila.ent`) i la
    // regla de mòbil també pinten números, i amb `auto` la seua targeta torna a eixir dentada
    // mentres la base seguiria passant el guardià.
    const variants = [...css.matchAll(/(\.fila(?:\.[\w-]+)?)\s*\{\s*([^}]*grid-template-columns:\s*[^;]+;)/g)]
      .map(([, nom, cos]) => [nom, cos.match(/grid-template-columns:\s*([^;]+);/)[1]]);
    assert.ok(variants.length >= 3,
      `s'han de vore totes les declaracions de .fila (n'hi ha ${variants.length})`);
    for (const [nom, plantilla] of variants) {
      const pistes = plantilla.replace(/minmax\([^)]*\)/g, 'M').split(/\s+/).filter(Boolean);
      // La 2a pista és la del VALOR i sempre porta número: ni `auto` ni `fr`. La 3a és la TSI,
      // que al mòbil s'amaga (allí la graella té tres pistes i la tercera és l'última cel·la).
      const aMirar = pistes.length > 3 ? [1, 2] : [1];
      for (const i of aMirar) {
        assert.ok(/^\d+px$/.test(pistes[i] || ''),
          `${nom}: la pista ${i + 1} (número) ha d'anar a ample fix, no «${pistes[i]}»\n  ${plantilla}`);
      }
    }
  }

  // I cap pista pot tindre un mínim FIX més ample que un telèfon estret (360 − 40 de marges):
  // la pista no encongix per davall del seu mínim i la pàgina es desplaça de costat. L'idioma
  // segur és `minmax(min(Npx, 100%), 1fr)`.
  const rígides = [...css.matchAll(/minmax\((\d{3})px,\s*1fr\)/g)]
    .filter((m) => Number(m[1]) > 320).map((m) => m[0]);
  assert.deepEqual(rígides, [],
    `pistes amb mínim fix més ample que un telèfon estret: ${rígides.join(', ')} → usa minmax(min(Npx, 100%), 1fr)`);
}

console.log('OK — regressions de pantalla: tota categoria amb puntuació, cap taula buida, cap camp buit sense motiu');
