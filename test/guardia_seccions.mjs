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
  INSERT INTO finances (usuari_id, caixa, caixa_data) VALUES (1, 900000, '2026-07-25');
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,90000,40000,'2026-07-19','2026-07-25'),(1,83,2,0,40000,'2026-07-25','2026-07-25');
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

// LES DUES LLISTES HAN DE SER LA MATEIXA GENT. Abans això es comprovava com a
// «compatibilitat» —que ningú estiguera alhora retingut i a Vendes— perquè les seccions eixien
// de la classificació del PAS 6 i la llista de vendes es filtrava per categoria: eren dues
// derivacions distintes de la mateixa cosa i podien discrepar.
//
// Ara les dues llegixen el GRUP de l'assignació d'estructura, o siga que la comprovació ja no
// és de compatibilitat sinó d'IDENTITAT: Mercat/fitxes de venda ha de tindre EXACTAMENT els
// mateixos jugadors que Plantilla/Venda. Ni un més, ni un menys.
const onze = new Set((pl.onze_titular || []).map((l) => l.jugador_id).filter(Boolean));
const aVenda = new Set(pl.venda || []);
const aFitxes = new Set((ve.jugadors || []).map((x) => x.jugador_id));

assert.ok(pl.onze_titular?.length, 'les seccions han de tornar jugadors: si no, açò no val res');
assert.deepEqual([...aFitxes].sort(), [...aVenda].sort(),
  'Mercat/fitxes de venda i Plantilla/Venda són la MATEIXA llista');
assert.ok([...aFitxes].every((id) => !onze.has(id)),
  'i ningú que juga a l\'onze titular pot estar a vendre');
assert.equal(aVenda.has(99), false, 'un jugador que ja no és a la instantània no ix a cap secció');

// UN JUGADOR, UN GRUP. Amb el model vell un jugador podia caure en dues seccions perquè cada
// una el classificava pel seu compte; ara el grup és únic per construcció i això es comprova.
const grups = { onze, entrenables: new Set((pl.entrenables?.jugadors || []).map((x) => x.id)),
  venda: aVenda, despatxar: new Set(pl.despatxar || []) };
if (pl.futur_entrenador) grups.futur = new Set([pl.futur_entrenador.jugador_id]);
if (pl.porter_suplent) grups.porter = new Set([pl.porter_suplent.jugador_id]);
const repetits = [];
const vistos = new Map();
for (const [nom, conjunt] of Object.entries(grups)) {
  for (const id of conjunt) {
    if (vistos.has(id)) repetits.push(`${id}: ${vistos.get(id)} i ${nom}`);
    else vistos.set(id, nom);
  }
}
assert.deepEqual(repetits, [], `jugadors en dos grups alhora:\n  ${repetits.join('\n  ')}`);

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

console.log(`OK — V4: font única de la categoria vigent · ${vistos.size} jugadors amb un sol grup,` +
  ` Vendes i Plantilla/Venda idèntiques · V5: ${cats.size} categories, cap fila sense puntuació`);
