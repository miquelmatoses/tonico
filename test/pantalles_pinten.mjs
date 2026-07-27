// Tonico — LES PANTALLES ES PINTEN DE VERES. node test/pantalles_pinten.mjs
//
// EL FORAT QUE TAPA ESTE TEST, i és el pitjor que hem tingut: `formFinances` usava dos
// variables (`d1`, `d2`) que ningú havia declarat. Un `ReferenceError` en pintar, o siga
// ECONOMIA SENCERA MORTA —i amb ella l'única finestra per a declarar taquilla i patrocini—
// des del commit que va introduir l'històric per setmanes. Cap guardià el va vore:
//
//   · G1 compara el full amb l'AVALUADOR: la vista no hi entra.
//   · G2 llig la vista com a TEXT (puresa, formatadors, columnes): no l'executa.
//   · G3 compara valors de pantalla amb l'avaluador: agafa l'API, no el DOM.
//   · el guardià i18n mira el CATÀLEG, no qui el crida.
//
// Cap d'ells executa una funció de secció. Este sí: munta un DOM mínim, encamina `fetch` a
// les API de veres damunt del shim de D1, i pinta cada pantalla. Qualsevol variable no
// declarada, propietat de `undefined` o clau i18n que no resol, peta ací.
//
// I ATENCIÓ A `filaSegura`: acota l'error d'una fila i seguix, o siga que un error dins d'una
// fila NO tomba la pàgina — només deixa un `console.error`. Per això el test també falla si
// s'ha escrit qualsevol `console.error`: si no, la degradació taparia justament el que busquem.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
    VALUES (1,'competitiva','ES','VII','academia',3,2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior'),(2,1,'J','juvenil');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES
    (1,1,'2026-07-19',83,1),(2,1,'2026-07-26',83,2),(3,2,'2026-07-26',83,2);
  -- CATORZE jugadors, no quatre: amb menys de dotze tots entren a l'onze, no queda residu i la
  -- targeta d'entrenables ix buida — o siga que la prova no provaria res.
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom, especialitat) VALUES
    (1,1,100,'A','Ràpid'),(2,1,101,'B',NULL),(3,1,102,'C',NULL),(4,1,103,'D',NULL),
    (5,1,104,'E',NULL),(6,1,105,'F',NULL),(7,1,106,'G',NULL),(8,1,107,'H',NULL),
    (9,1,108,'I',NULL),(10,1,109,'J',NULL),(11,1,110,'K',NULL),(12,1,111,'L',NULL),
    (13,1,112,'M',NULL),(14,1,113,'N',NULL);
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, edat_dies,
      sou, tsi, transferible, creativitat, defensa, porteria, anotacio, extrem, passades, pilota_aturada) VALUES
    (1,1,'MC',22,10,3000,5000,1,5,1,1,1,1,4,1),(1,2,'DC',24,20,2000,4000,NULL,1,6,1,1,1,1,1),
    (1,3,'DV',28,30,9000,3000,NULL,1,1,1,5,1,1,1),
    (2,1,'MC',22,17,3000,5000,NULL,5,1,1,1,1,4,1),(2,2,'DC',24,27,2000,4000,NULL,1,6,1,1,1,1,1),
    (2,3,'DV',28,37,9000,3000,NULL,1,1,1,5,1,1,1),
    -- Tres MC millors que el jove, per a que l'onze se'ls emporte i ell caiga a ENTRENABLE.
    (2,5,'MC',24,0,3000,4000,NULL,9,1,1,1,1,1,1),(2,6,'MC',25,0,3000,4000,NULL,8,1,1,1,1,1,1),
    (2,7,'MC',26,0,3000,4000,NULL,7,1,1,1,1,1,1),
    (2,8,'DC',27,0,2000,3000,NULL,1,6,1,1,1,1,1),(2,9,'EX',24,0,2000,3000,NULL,1,1,1,1,6,1,1),
    (2,10,'EX',25,0,2000,3000,NULL,1,1,1,1,5,1,1),(2,11,'DV',26,0,2000,3000,NULL,1,1,1,6,1,1,1),
    (2,12,'DV',27,0,2000,3000,NULL,1,1,1,5,1,1,1),(2,13,'POR',28,0,2000,3000,NULL,1,1,7,1,1,1,1),
    -- I el JOVE: creativitat 6, que és el mínim per a entrenar, i pitjor que els tres titulars
    -- de MC, o siga que cau al residu i és el que ha de portar el càlcul a la pantalla.
    (1,14,'MC',18,10,900,700,NULL,6,1,1,1,1,1,1),(2,14,'MC',18,17,900,700,NULL,6,1,1,1,1,1,1);
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES
    (1,'core','auto'),(2,'titular','auto'),(3,'venda','auto'),(4,'core','auto'),
    (5,'core','auto'),(6,'core','auto'),(7,'titular','auto'),(8,'titular','auto'),
    (9,'titular','auto'),(10,'titular','auto'),(11,'titular','auto'),(12,'cos','auto'),
    (13,'cos','auto'),(14,'cos','auto');
  INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou, data_fi_contracte, coach_entrenament) VALUES
    (1,'especialista','assistent',2,2040,'2026-11-04',NULL),(1,'entrenador','entrenador',NULL,5000,NULL,'passable');
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi, estadi_manteniment, estadi_cost_obra, estadi_data)
    VALUES (1,173004,'2026-07-26',7100,9000,200000,'2026-07-20');
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,21127,40500,'2026-07-19','2026-07-26'),(1,83,2,0,40500,'2026-07-26','2026-07-26');
`);

// ── DOM mínim. Només el que `el()` i les seccions gasten de veres. ──
const crea = (tag) => ({
  tagName: tag, fills: [], atributs: {}, textContent: '', value: '', dataset: {}, style: {},
  classList: {
    _s: new Set(),
    add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); },
    toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on; },
  },
  setAttribute(k, v) { this.atributs[k] = String(v); },
  getAttribute(k) { return this.atributs[k] ?? null; },
  append(...f) { this.fills.push(...f); }, appendChild(x) { this.fills.push(x); return x; },
  addEventListener() {}, focus() {}, remove() {},
  querySelector() { return null; }, querySelectorAll() { return []; },
});
globalThis.document = { createElement: crea, createTextNode: (x) => ({ textContent: x }),
  querySelector: () => null, querySelectorAll: () => [], title: '' };
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.location = { href: '', reload() {} };

// ── `fetch` encaminat a les API de veres: així el que es pinta té la FORMA real. ──
const arrel = new URL('../public/', import.meta.url);
const API = {};
for (const nom of ['finances', 'personal', 'mercat', 'plantilla', 'juvenils', 'vendes',
  'config', 'equips', 'alertes', 'pla', 'alineacio', 'categoria', 'intercanvis', 'entrenament', 'onzes']) {
  try { API[nom] = await import(`../functions/api/${nom}.js`); } catch { /* no existix: 404 */ }
}
const resposta = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (path) => {
  const ruta = String(path).split('?')[0];
  if (ruta.startsWith('/i18n/')) return resposta(JSON.parse(readFileSync(new URL('.' + ruta, arrel), 'utf8')));
  const m = ruta.match(/^\/api\/([\w-]+)/);
  const mod = m && API[m[1]];
  if (!mod?.onRequestGet) return resposta({ error: 'sense_ruta' }, 404);
  return mod.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } }, request: new Request('http://t' + ruta) });
};

// Les seccions importen '/comu.js' (absolut, com al navegador): es reescriu a fitxer real.
const font = readFileSync(new URL('seccions.js', arrel), 'utf8')
  .replaceAll("'/comu.js'", JSON.stringify(new URL('comu.js', arrel).href))
  .replaceAll("'/format.js'", JSON.stringify(new URL('format.js', arrel).href));
const seccions = await import('data:text/javascript;base64,' + Buffer.from(font).toString('base64'));
const comu = await import(new URL('comu.js', arrel).href);
await comu.carregaI18n('ca-valencia');

// ── Cap `console.error`: `filaSegura` i `t()` degraden en silenci i taparien el forat. ──
let renyades = [];
const errOriginal = console.error;
console.error = (...a) => { renyades.push(a.map(String).join(' ')); };

const PANTALLES = ['economia', 'personal', 'mercat', 'plantilla', 'entrenament', 'juvenils', 'esta_setmana',
  'alineacio', 'configuracio', 'decisions'];
const trencades = [];
for (const nom of PANTALLES) {
  renyades = [];
  const main = crea('main');
  try {
    await seccions[nom](main);
    if (renyades.length) trencades.push(`${nom}: ${renyades[0]}`);
    else if (!main.fills.length) trencades.push(`${nom}: no ha pintat res`);
  } catch (err) {
    trencades.push(`${nom}: ${err.constructor.name}: ${err.message}`);
  }
}
console.error = errOriginal;
assert.deepEqual(trencades, [], 'pantalles que no es pinten netes:\n  ' + trencades.join('\n  '));

// ── EL QUE L'AVALUADOR CALCULA HA D'ARRIBAR AL DOM ────────────────────────────────────────
// Pintar sense petar no vol dir pintar les dades. La fila dels entrenables copiava camp a camp
// del que servix l'API i, al moure el «10(6)» a la columna de valor, els dos camps nous es van
// quedar fora: la pantalla pintava un guionet i semblava que el càlcul no existia.
{
  const { onRequestGet } = await import('../functions/api/plantilla.js');
  const dades = await (await onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } })).json();
  const jove = (dades.entrenables?.jugadors || []).find((x) => x.setmanes_seguent != null);
  assert.ok(jove, 'el fixture ha de tindre un entrenable amb càlcul, si no la prova no prova res');

  const main = crea('main');
  await seccions.plantilla(main);
  const text = (n) => (n.textContent || '') + (n.fills || []).map(text).join(' ');
  const pintat = text(main);
  const xifra = String(jove.setmanes_seguent).replace('.', ',');
  assert.ok(pintat.includes(xifra),
    `les setmanes fins al nivell següent (${xifra}) no arriben a la pantalla`);
}

console.log(`OK — les ${PANTALLES.length} pantalles es pinten de veres, sense variables soltes ni claus sense resoldre`);
