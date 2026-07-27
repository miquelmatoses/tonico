// Tonico — V4 · L'ESTAT DERIVAT I LA COMPATIBILITAT ENTRE SECCIONS (regla, no cas).
//  (a) EL GRUP D'UN JUGADOR NO ES DESA. `categories_jugador` era estat derivat escrit a
//      taula: només s'hi inseria fila quan canviava el rol, així que qui es quedava al
//      mateix rol arrossegava per sempre el que s'hi haguera escrit —o el buit—. Retirat el
//      PAS 6, cap consulta pot tornar-hi: este guardià peta si algú la torna a llegir.
//  (b) Un jugador NO pot aparéixer a dos seccions incompatibles: retingut i a Vendes, o
//      a vendre i alineat. Es comprova cridant les MATEIXES API que la pantalla consumix
//      i creuant la pertinença per jugador.
// node test/guardia_seccions.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { nova } from './_d1shim.mjs';

// ── (a) ningú torna a llegir la taula de categories ──
const arrel = new URL('../', import.meta.url);
const jsDe = (dir) => {
  const out = [];
  for (const e of readdirSync(new URL(dir, arrel), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...jsDe(`${dir}${e.name}/`));
    else if (e.name.endsWith('.js')) out.push(`${dir}${e.name}`);
  }
  return out;
};
const lectors = [];
for (const f of [...jsDe('lib/'), ...jsDe('functions/')]) {
  if (/categories_jugador/.test(readFileSync(new URL(f, arrel), 'utf8'))) lectors.push(f);
}
assert.deepEqual(lectors, [],
  `${lectors.join(', ')} llig categories_jugador: el grup es deriva d'onzeEstructura, no es desa`);

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

// UN JUGADOR QUE JA NO HI ÉS a la instantània no pot filtrar cap a cap secció (és el residu
// real que hi havia en producció, quan el grup es desava i sobrevivia al jugador).
sqlite.exec("INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (99,1,999,'Fora');");

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

// ── (c) EL COS DISPONIBLE no pot incloure qui ENTRENA ──────────────────────────────────
// És el número que decidix a quanta gent es reté de la liquidació: si els que entrenen hi
// entren, Tonico es pensa que té més cos del que té i deixa de retindre ningú. Abans eixia
// d'un `categoria NOT IN ('core','rotatiu')` dins d'una consulta SQL, i el dia que es va
// deixar d'escriure la categoria hauria contat TOTHOM sense dir res.
//
// L'oracle NO ix de Vendes: ix de Plantilla —l'altra pantalla— creuada amb la instantània.
// Dos camins distints han de donar el mateix número.
const entrenen = new Set([...(pl.onze_titular || []).filter((l) => l.entrena && l.jugador_id).map((l) => l.jugador_id),
  ...(pl.entrenables?.jugadors || []).map((x) => x.id)]);
assert.ok(entrenen.size > 0, 'el fixture ha de tindre gent entrenant: si no, açò no prova res');
// I un LLISTAT tampoc és cos: ja té un peu fora. Se n'apunta un que no entrena i que no és
// transferible, per a que l'única cosa que el trau del compte siga la fitxa de venda.
const candidat = [...Array(N).keys()].map((i) => i + 1).find((i) => !entrenen.has(i) && i !== 3);
sqlite.prepare("INSERT INTO vendes (usuari_id, jugador_id, estat) VALUES (1, ?, 'llistat')").run(candidat);
const ve2 = await dona('../functions/api/vendes.js');
const deLaInstantania = sqlite.prepare(
  'SELECT jugador_id, posicio_ultim_partit p, transferible FROM instantanies_jugadors WHERE instantania_id=1').all();
const espera = (esPorter) => deLaInstantania.filter((r) => !entrenen.has(r.jugador_id)
  && r.transferible !== 1 && r.jugador_id !== candidat && (esPorter ? r.p === 'PO' : r.p !== 'PO')).length;
assert.equal(ve2.cobertura.cos_camp, espera(false), 'el cos de camp exclou qui entrena i qui ja està llistat');
assert.equal(ve2.cobertura.cos_porter, espera(true), 'i el de porteria igual');

console.log(`OK — V4: ningú desa el grup · ${vistos.size} jugadors amb un sol grup,`
  + ` Mercat/fitxes de venda i Plantilla/Venda idèntiques · cos disponible ${ve2.cobertura.cos_camp}+${ve2.cobertura.cos_porter}`);
