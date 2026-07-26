// Tonico — REGRESSIONS V2 i V3, al costuró on van trencar-se (regla, no cas):
//  V2 · L'ORQUESTRADOR ha de fer arribar les HABILITATS a l'assignació. Quan no ho feia,
//       `valor(j, lloc)` valia 0 per a tots i l'orde requeia al desempat per sou: guanyava
//       el més barat, o siga el pitjor. Ací es munta eixa trampa exacta —el millor és el
//       més car— i s'exigix la propietat: cada lloc maximitza `hab(j, habilitat_lloc)`.
//  V3 · El PLA DE PERSONAL és la DIFERÈNCIA amb el declarat: no proposa contractar el que
//       ja hi ha, ni renovar el que no venç.
// node test/regressio_pantalla_v23.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { proposaAlineacio } from '../lib/orquestra_alineacio.js';
import * as apiPersonal from '../functions/api/personal.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',1,2);
  -- Els ingressos van en unitats del PERÍODE (bi-setmanal, v3.1): la nòmina d'estos 24
  -- jugadors és de 105.000 €/setmana, o siga 210.000 € per període. Amb les xifres del model
  -- setmanal antic el flux eixia negatiu i el pla de personal no proposava res, que no és el
  -- que este test vol provar.
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,2);
  INSERT INTO finances (usuari_id, caixa, caixa_data) VALUES (1, 900000, '2026-07-25');
  INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
    (1,83,1,150000,80000,'2026-07-19','2026-07-25'),(1,83,2,0,80000,'2026-07-25','2026-07-25');
`);
// La trampa: el millor defensa (9) és el que més cobra; el pitjor (1) el més barat.
const N = 24;
for (let i = 1; i <= N; i++) {
  const defensa = i <= 12 ? 13 - i : 1;                  // 12, 11, … 1, després tot 1
  const sou = 1000 + defensa * 900;                      // millor ⇒ més car
  sqlite.exec(`INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (${i},1,${100 + i},'J${i}');`);
  sqlite.exec(`INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit,
      edat_anys, edat_dies, sou, creativitat, defensa, porteria, anotacio, extrem, passades)
    VALUES (1,${i},'DC',24,0,${sou},3,${defensa},3,3,3,3);`);
  // Sense categoria no hi ha retinguts i el PAS 9 no assigna ningú (només s'alineen els rols
  // del PAS 6). Ací el que es prova és la maximització: tots titulars.
  sqlite.exec(`INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (${i},'titular','auto');`);
}

sqlite.exec("INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');");
const est = await proposaAlineacio(db, 1);
// L'ORACLE MIRA LA INSTANTÀNIA, no el que l'orquestrador ha passat avall: si el compare amb
// `est.retinguts` i l'orquestrador perd les habilitats, les perd als dos costats i la
// propietat es complix buida. Este és el defecte que este test ha de detectar.
const font = new Map(sqlite.prepare('SELECT * FROM instantanies_jugadors WHERE instantania_id=1').all()
  .map((r) => [r.jugador_id, r]));
const squad = est.retinguts;
assert.equal(squad.length, N, 'tots els titulars són retinguts');
assert.ok(est.onze.A.some((x) => x.jugador), 'l\'assignació no pot eixir buida: hi ha 24 retinguts per a 22 llocs');
assert.ok(est.onze, 'l\'orquestrador torna els onzes');

// ── PROPIETAT V2 ──
let mal = 0;
for (const partit of Object.keys(est.onze)) {
  const usats = new Set(est.onze[partit].map((x) => x.jugador?.jugador_id).filter(Boolean));
  for (const x of est.onze[partit]) {
    if (!x.jugador || x.entrena || !x.habilitat) continue;
    const meu = Number(font.get(x.jugador.jugador_id)[x.habilitat] ?? 0);
    assert.ok(x.jugador[x.habilitat] !== undefined,
      `V2: l'assignat de ${x.lloc} ha d'arribar amb la seua habilitat ${x.habilitat}, no pelat`);
    for (const j of squad) {
      if (usats.has(j.jugador_id)) continue;
      if (Number(font.get(j.jugador_id)[x.habilitat] ?? 0) > meu) { mal++; break; }
    }
  }
}
assert.equal(mal, 0, 'V2: cada lloc s\'emporta el millor disponible en la seua habilitat');

// ── V2 bis: el camp que la regla busca ha de ser el que el productor escriu ──
// El full (F.47) diu `sancionat`. Mentres el productor l'anomenava `suspes`, la restricció
// «¬(sancionat I partit = lliga)» no trobava el camp i cap sancionat quedava fora de la lliga.
sqlite.exec('UPDATE instantanies_jugadors SET amonestacions=9 WHERE jugador_id=1;');
const ambSancio = await proposaAlineacio(db, 1);
const jugaLliga = (id) => ambSancio.onze.A.some((x) => x.jugador?.jugador_id === id);
assert.equal(jugaLliga(1), false, 'un sancionat no juga el partit de lliga');
assert.ok(ambSancio.onze.B.some((x) => x.jugador?.jugador_id === 1),
  'però sí l\'altre partit: la sanció només val per a la lliga');
sqlite.exec('UPDATE instantanies_jugadors SET amonestacions=0 WHERE jugador_id=1;');

// ── V3: el pla contra el declarat ──
const ctx = { env: { DB: db }, data: { usuari: { id: 1 } } };
const cap = (await (await apiPersonal.onRequestGet(ctx)).json()).pla_flux;
assert.ok(cap.pla.some((x) => x.accio === 'contracta'), 'sense res declarat, es proposa contractar');

// Ara es declara EXACTAMENT el que el pla demana, amb contracte llarg.
for (const x of cap.pla.filter((p) => !p.exclos && p.nivell > 0)) {
  for (let k = 0; k < (x.quantitat ?? 1); k++) {
    sqlite.exec(`INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou, setmanes_contracte)
      VALUES (1,'especialista','${x.tipus}',${x.nivell},${x.cost},16);`);
  }
}
const amb = (await (await apiPersonal.onRequestGet(ctx)).json()).pla_flux;
const sobren = amb.pla.filter((x) => x.accio !== 'res' && x.accio !== 'exclos');
assert.deepEqual(sobren.map((x) => `${x.tipus}:${x.accio}`), [],
  'V3: amb tot el pla ja declarat i cap contracte a punt de vèncer, no queda cap acció');
for (const x of amb.pla.filter((p) => !p.exclos && p.nivell > 0)) {
  assert.equal(x.nivell_declarat, x.nivell, `V3: ${x.tipus} es compara amb el seu declarat`);
  assert.equal(x.venciment, false, `V3: ${x.tipus} no venç, per tant no es proposa renovar`);
}

// I si un venç, torna a haver-hi acció: la renovació depén del VENCIMENT, no de existir.
sqlite.exec('UPDATE personal_membres SET setmanes_contracte=0 WHERE usuari_id=1;');
const venç = (await (await apiPersonal.onRequestGet(ctx)).json()).pla_flux;
assert.ok(venç.pla.some((x) => x.venciment && x.accio !== 'res'),
  'V3: al venciment sí que hi ha decisió de renovació');

console.log('OK — V2 assignació maximitzant sobre l\'orquestrador · V3 pla = diferència amb el declarat');
