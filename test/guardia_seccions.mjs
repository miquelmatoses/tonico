// Tonico — V4 · L'ESTAT DERIVAT I LA COMPATIBILITAT ENTRE SECCIONS (regla, no cas).
//  (a) `categories_jugador` és un HISTORIAL: la vigent és la de l'id més alt, i eixe
//      subselect només pot viure a lib/categoria_vigent.js. Copiat-i-apegat a huit fitxers
//      no es pot corregir una vegada, i una còpia que s'oblide de creuar la instantània
//      pinta fitxes que ja no hi són.
//  (b) Un jugador NO pot aparéixer a dos seccions incompatibles: retingut i a Vendes,
//      a vendre i alineat, o alineat sense categoria. Es comprova cridant les MATEIXES API
//      que la pantalla consumix i creuant la pertinença per jugador.
// node test/guardia_seccions.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { nova } from './_d1shim.mjs';

// ── (a) una sola font del subselect ──
const arrel = new URL('../', import.meta.url);
const jsDe = (dir) => {
  const out = [];
  for (const e of readdirSync(new URL(dir, arrel), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...jsDe(`${dir}${e.name}/`));
    else if (e.name.endsWith('.js')) out.push(`${dir}${e.name}`);
  }
  return out;
};
const copies = [];
for (const f of [...jsDe('lib/'), ...jsDe('functions/')]) {
  if (f.endsWith('categoria_vigent.js')) continue;
  if (/MAX\(id\) mid FROM categories_jugador/.test(readFileSync(new URL(f, arrel), 'utf8'))) copies.push(f);
}
assert.deepEqual(copies, [],
  `el subselect de la categoria vigent està copiat a ${copies.join(', ')}: ha d'eixir de sqlCategoriaVigent()`);

// ── (b) compatibilitat mútua entre seccions ──
const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',2);
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,2);
  INSERT INTO finances (usuari_id, caixa, caixa_data, taquilla, patrocini, premis)
    VALUES (1, 900000, '2026-07-25', 90000, 40000, 8000);
`);
const N = 26;
for (let i = 1; i <= N; i++) {
  const h = 1 + ((i * 7) % 12);                          // habilitats esteses, sense empats a pilots
  sqlite.exec(`INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (${i},1,${100 + i},'J${i}');
    INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, edat_dies,
        sou, creativitat, defensa, porteria, anotacio, extrem, passades)
      VALUES (1,${i},'DC',${20 + (i % 8)},0,${900 + h * 500},${h},${13 - h},${i === 1 ? 12 : 2},${h},${13 - h},${h});`);
}
// EL CAS QUE DISCRIMINA: un jugador FORT però LLISTAT. Si el filtre de llistats es perd, este
// apareixeria alhora com a retingut (guanyaria plaça per habilitat) i a Vendes. Fort a propòsit:
// amb un dèbil la comprovació no valdria res, perquè no guanyaria plaça de cap manera.
sqlite.exec('UPDATE instantanies_jugadors SET transferible=1 WHERE jugador_id=3;');
sqlite.exec('UPDATE instantanies_jugadors SET defensa=12, creativitat=12, extrem=12, anotacio=12, passades=12 WHERE jugador_id=3;');

// UN JUGADOR QUE JA NO HI ÉS però encara duu categoria: l'estat derivat ranci no pot filtrar
// cap a cap secció (és el residu real que hi havia en producció).
sqlite.exec(`INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (99,1,999,'Fora');
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (99,'venda','auto');`);

// El PAS 6 escriu les categories a partir de la instantània.
const { classificaEquip } = await import('../lib/orquestra_classificacio.js');
await classificaEquip(db, 1, 1, 'competitiva');

const ctx = { env: { DB: db }, data: { usuari: { id: 1 } } };
const dona = async (ruta) => (await (await import(ruta)).onRequestGet(ctx)).json();
const pl = await dona('../functions/api/plantilla.js');
const ve = await dona('../functions/api/vendes.js');
const al = await dona('../functions/api/alineacio.js');

const on = new Map();
const posa = (id, sec) => { (on.get(id) || on.set(id, new Set()).get(id)).add(sec); };
for (const x of pl.jugadors || []) posa(x.id, 'plantilla:' + x.categoria);
for (const x of ve.jugadors || []) posa(x.jugador_id, 'vendes');
for (const p of Object.keys(al.onze || {})) {
  for (const s of al.onze[p]) if (s.jugador) posa(s.jugador.jugador_id, 'onze');
}
assert.ok(on.size > 0, 'les seccions han de tornar jugadors: si no, esta comprovació no val res');
assert.ok([...on.values()].some((s) => s.has('onze')), 'i l\'alineació ha d\'assignar algú');
assert.equal(on.has(99), false, 'un jugador que ja no és a la instantània no ix a cap secció');

const RETINGUTS = new Set(['core', 'rotatiu', 'titular', 'porter', 'cos', 'futur_entrenador']);
const xocs = [];
for (const [id, secs] of on) {
  const cat = [...secs].find((x) => x.startsWith('plantilla:'))?.slice(10);
  if (cat && RETINGUTS.has(cat) && secs.has('vendes')) xocs.push(`${id}: retingut (${cat}) i a Vendes`);
  if (cat === 'venda' && secs.has('onze')) xocs.push(`${id}: a vendre i alineat`);
  if (secs.has('onze') && !cat) xocs.push(`${id}: alineat i absent de Plantilla`);
}
assert.deepEqual(xocs, [], `seccions incompatibles per al mateix jugador:\n  ${xocs.join('\n  ')}`);
// I que la comprovació DISCRIMINE: el llistat fort. El full només en garantix una cosa
// (restricció 4: «llistat no juga»), i això sí que s'ha de complir sempre.
const secs3 = [...(on.get(3) || [])];
assert.ok(!secs3.includes('onze'),
  `un llistat no s'alinea mai (restricció 4 del full); està a: ${secs3.join(', ')}`);
// CONTRADICCIÓ OBERTA DEL FULL (pendent de correcció, no de pedaç): el PAS 6 reparteix rols
// sobre `plantilla` sencera, que inclou els llistats, mentres el PAS 9 no els alinea. Un
// llistat pot quedar-se el rol de core i deixar el lloc buit sense que ningú el reemplace.
// Ací es MESURA el dany en lloc d'afirmar cap de les dos lectures.
const rol3 = secs3.find((x) => x.startsWith('plantilla:'))?.slice(10);
if (rol3 && RETINGUTS.has(rol3)) {
  console.log(`   ⚠ contradicció PAS 6 / PAS 9: un llistat duu rol «${rol3}» i no pot jugar ` +
    `→ el sistema ho avisa com a: ${JSON.stringify(al.avisos.filter((a) => a.jugador_id === 3))}. ` +
    'Correcció del full pendent d\'aprovació.');
}

// ── V5: la puntuació no pot dependre que la categoria CANVIE ──
// Només s'inserix fila de categoria quan hi ha canvi de rol. Si la puntuació només s'escriu
// en eixa fila, qui es queda al mateix rol la conserva de la fila vella per sempre: era el
// cas dels titulars sense marcador. Es deriva dos vegades (la segona no canvia res) i
// s'exigix que TOTA fila de TOTA categoria duga la seua puntuació.
// Es reprodueix l'estat HERETAT: files de categoria vigents amb el marcador buit (escrites
// abans que la puntuació existira). Si la posada al dia no existix, la segona derivació no
// canvia cap rol, no inserix cap fila, i eixes files es queden buides per sempre.
sqlite.exec('UPDATE categories_jugador SET puntuacio = NULL;');
await classificaEquip(db, 1, 1, 'competitiva');
const pl2 = await dona('../functions/api/plantilla.js');
const sensePunt = (pl2.jugadors || []).filter((j) => j.puntuacio == null).map((j) => `${j.nom} (${j.categoria})`);
assert.deepEqual(sensePunt, [],
  `files sense puntuació després de re-derivar sense canvis: ${sensePunt.join(', ')}`);
const cats = new Set((pl2.jugadors || []).map((j) => j.categoria));
assert.ok(cats.size >= 4, `la fixture ha de cobrir prou categories (${[...cats].join(', ')})`);

console.log(`OK — V4: font única de la categoria vigent · ${on.size} jugadors, cap secció incompatible` +
  ` · V5: ${cats.size} categories, cap fila sense puntuació`);
