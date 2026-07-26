// Tonico — GENERADOR DEL MIRALL. docs/FORMULES.md (el contracte) → formules.json.
// El mirall és fidel per construcció: extrau cada línia-fórmula del full i la desa amb
// id/pas/entrades/poms/taules. `extreuLinies` s'exporta perquè el test de paritat use la
// MATEIXA regla (una sola font de la regla → no poden divergir).
//   node scripts/genera_formules.mjs [docs/FORMULES.md] [formules.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Una línia-fórmula és: dins d'un bloc ```, sota una capçalera «## V» o «## PAS n»,
// començant a la columna 0 (les indentades són continuació) i que no siga comentari
// ([...], #, `...`) ni separador de secció (-- ...).
export function extreuLinies(md) {
  const out = [];
  let dinsFence = false, pas = null, pasTitol = null;
  for (const raw of md.split('\n')) {
    if (!dinsFence && /^##\s+/.test(raw)) {
      const cap = raw.match(/^##\s+(V|PAS\s+\d+)\b\s*—?\s*(.*)$/);
      if (cap) { pas = cap[1].replace(/PAS\s+/, 'P'); pasTitol = cap[2].trim(); }
      else { pas = null; pasTitol = null; }            // apèndix (RESTRICCIONS/MECANISME/…)
      continue;
    }
    if (raw.trim().startsWith('```')) { dinsFence = !dinsFence; continue; }
    if (!dinsFence || pas === null || raw.length === 0) continue;
    if (/^\s/.test(raw)) continue;                     // continuació indentada
    const t = raw.trim();
    if (!t || t.startsWith('[') || t.startsWith('#') || t.startsWith('`') || t.startsWith('--')) continue;
    out.push({ pas, pasTitol, linia: raw });
  }
  return out;
}

const nomDe = (linia) => {
  const eq = linia.indexOf('=');
  const head = (eq > 0 ? linia.slice(0, eq) : linia).trim();
  if (/^(ACCIÓ|AGENDA|PREGUNTA|INFO_secció|INFO|PROPOSA|TRIA|reexecuta|despatxa|recalibra|AVÍS|CONTRACTAR|RENOVAR|PER|SI)/.test(head)) {
    return head.split(/[\(\s]/)[0];
  }
  const m = head.match(/^([A-Za-zÀ-ÿ_Δ]+)/);
  return m ? m[1] : head;
};

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase().slice(0, 40) || 'x';

export function construeixMirall(md) {
  const crus = extreuLinies(md);
  const noms = new Set(crus.map((c) => nomDe(c.linia)).filter((n) => /^[A-Za-zÀ-ÿ_Δ]+$/.test(n)));
  ['plantilla', 'juvenils', 'config', 'caixa', 'hui', 'divisio', 'estrategia', 'pais',
   'partits_setmana', 'flux', 'nomina', 'sou', 'exp', 'hab', 'preu', 'act', 'pot',
   'edat_d', 'A', 'B', 'lloc', 'temporada'].forEach((n) => noms.add(n));

  const idsUsats = {};
  return crus.map((c) => {
    const nom = nomDe(c.linia);
    let id = `${c.pas}.${slug(nom)}`;
    idsUsats[id] = (idsUsats[id] || 0) + 1;
    if (idsUsats[id] > 1) id += `_${idsUsats[id]}`;
    const poms = new Set(), taules = new Set();
    let m;
    const taulaRe = /(?:BUSCA|FILTRA)\(\s*`([a-z_à-ÿ]+)`/gi;
    while ((m = taulaRe.exec(c.linia))) taules.add(m[1]);
    const ptRe = /`([a-z_à-ÿ]+)`/gi;
    while ((m = ptRe.exec(c.linia))) { if (!taules.has(m[1])) poms.add(m[1]); }
    const eq = c.linia.indexOf('=');
    const rhs = eq > 0 ? c.linia.slice(eq + 1) : c.linia;
    const entrades = [...noms].filter((n) => n !== nom &&
      new RegExp(`(^|[^A-Za-zÀ-ÿ_])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-zÀ-ÿ_]|$)`).test(rhs));
    return { id, pas: c.pas, pasTitol: c.pasTitol, clau: nom, linia: c.linia,
      entrades: entrades.sort(), poms: [...poms].sort(), taules: [...taules].sort() };
  });
}

// Execució directa (no quan s'importa des del test). pathToFileURL: el camí pot dur espais.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const SRC = process.argv[2] || 'docs/FORMULES.md';
  const OUT = process.argv[3] || 'formules.json';
  const formules = construeixMirall(readFileSync(SRC, 'utf8'));
  writeFileSync(OUT, JSON.stringify({
    _meta: { font: SRC, generat: 'scripts/genera_formules.mjs', contracte: true,
      nota: 'Mirall fidel per construcció. Paritat verificada per test/formules_paritat.mjs.' },
    formules,
  }, null, 2) + '\n');
  console.log(`${formules.length} fórmules → ${OUT}`);
}
