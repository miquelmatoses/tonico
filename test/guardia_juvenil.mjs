// Tonico — G4 · EL PARTE I LA SECCIÓ DIUEN EL MATEIX, i cap secció menteix quan li falta res.
//
// Dos forats reals, els dos de la mateixa família i els dos comesos hui:
//
//  (a) La secció de Juvenils es va connectar al pla nou i el MOTOR D'ALERTES es va quedar amb
//      l'avaluador vell (`avaluaPipeline`, amb els seus llindars cablejats). Dues derivacions
//      de la mateixa pregunta: Paco podia dir «sobren tres» i la pantalla assenyalar-ne uns
//      altres. Cap guardià ho veia, perquè cada un mirava un costat.
//
//  (b) En reescriure l'endpoint, la targeta d'entrenament juvenil va quedar llegint un camp
//      que ja no existia i va caure al seu text de «falta». Res va petar i la clau i18n
//      resolia perfectament: un fallback que MENTIA. `pantalles_pinten` no pot vore-ho —
//      comprova que es pinte, no que diga la veritat.
//
// node test/guardia_juvenil.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nova } from './_d1shim.mjs';
import { modelJuvenil } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';
import { generaAlertes } from '../lib/orquestra_alertes.js';
import * as juvenils from '../functions/api/juvenils.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','academia',2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'S','senior'),(2,1,'J','juvenil');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-26',83,2);
`);
const ancora = await carregaAncora(db);
const files = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  .replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));
// DOTZE juvenils, no deu: amb l'objectiu a 10 en calen més per a que hi haja sobrants de
// veres. Sense excedent, la comparació entre el parte i la secció no prova res.
const cru = files('../data/fixtures/youthplayers.csv');
const dotze = [cru[0], ...cru.slice(1), ...cru.slice(1, 3).map((c, i) => {
  const d = [...c]; d[3] = String(960000000 + i); d[2] = `Extra${i}`; return d;
})];
// I UN AMB LA CREATIVITAT REVELADA, que al fixture no n'hi ha cap. L'oracle és el CSV, no
// l'avaluador: si al full posa 8 i el pla diu que d'ell «no se sap res», el pla està trencat.
// És el que passava, i cap guardià ho veia perquè tots dos costats eixien del mateix pla.
const REVELAT = { id: '960000009', nom: 'Revelat', creativitat: '8', dies: '150' };
// I un del TERCER ESTAT: revelat sense valor («?»). No és el mateix que absent i sobretot no
// és un número: si es cola com a número és NaN, i un NaN no talla mai cap comparació — el
// jugador es quedaria una plaça d'entrenament amb una projecció que no existix.
const SENSE_VALOR = { id: '960000010', nom: 'SenseValor', dies: '80' };
for (const [qui, valor] of [[REVELAT, REVELAT.creativitat], [SENSE_VALOR, '?']]) {
  const d = [...cru[1]];
  d[3] = qui.id; d[2] = qui.nom; d[9] = qui.dies;
  d[16] = valor;                                     // Creativitat (actual)
  dotze.push(d);
}
await desar(db, 1, 'juvenil', modelJuvenil(dotze, '2026-07-26'), ancora);

const ctx = { env: { DB: db }, data: { usuari: { id: 1 } } };
const vista = await (await juvenils.onRequestGet(ctx)).json();
await generaAlertes(db, 1, '2026-07-26');

// ── (a) EL MATEIX VEREDICTE ALS DOS COSTATS ──────────────────────────────────────────────
const sobraSeccio = new Set(vista.juvenils.filter((j) => j.despatxa).map((j) => j.jugador_id));
const alerta = sqlite.prepare(
  "SELECT parametres FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_JUVENIL_SOBRANT'").get();
assert.ok(vista.juvenils.length, 'el fixture ha de portar juvenils: si no, açò no prova res');
assert.ok(sobraSeccio.size > 0, 'i ha de sobrar algú, si no la comparació és buida');
assert.ok(alerta, 'si la secció diu que sobra gent, el parte també ho ha de dir');
const nombreParte = JSON.parse(alerta.parametres).sobren;
assert.equal(nombreParte, sobraSeccio.size,
  `el parte diu que sobren ${nombreParte} i la secció n'assenyala ${sobraSeccio.size}: dues derivacions`);
const nomsParte = JSON.parse(alerta.parametres).noms.split(', ').sort();
const nomsSeccio = vista.juvenils.filter((j) => j.despatxa).map((j) => j.nom).sort();
assert.deepEqual(nomsParte, nomsSeccio, 'i han de ser EXACTAMENT els mateixos, no només la mateixa quantitat');

// ── (b) CAP TEXT DE «FALTA» AMB LA DADA DECLARADA ────────────────────────────────────────
// La prescripció de l'acadèmia està declarada als poms, o siga que la secció no pot dir que
// li falte. Es comprova sobre el que la secció REP, que és on va nàixer el forat.
assert.ok(vista.pla?.principal, 'amb la prescripció juvenil declarada, el pla la porta');
assert.ok(vista.pla?.secundaria, 'les dues: principal i secundari');
const pomA = sqlite.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenament_juvenil_a'").get();
assert.equal(vista.pla.principal, pomA.valor,
  'i és la de l\'ACADÈMIA, no la del primer equip: són dos entrenaments independents');

// ── (c) EL QUE SE SAP D'UN JUVENIL ARRIBA A L'AVALUADOR ──────────────────────────────────
// Les habilitats es guarden com a TEXT (tres estats), i l'avaluador les vol NÚMERO. Quan la
// conversió faltava, tot juvenil valia el llistó per conveni: el pla no ordenava per
// creativitat sinó pels dies fins a la promoció, i ningú ho notava perquè la pantalla i el
// parte s'equivocaven igual. El número el diu el CSV; el pla ha de coincidir.
{
  const j = vista.juvenils.find((x) => x.nom === REVELAT.nom);
  assert.ok(j, 'el juvenil amb la creativitat revelada ha d\'arribar a la secció');
  const cr = j.habilitats.find((h) => h.habilitat === 'creativitat');
  assert.equal(String(cr.actual), REVELAT.creativitat, 'i la pantalla ensenya el que diu el full');
  assert.equal(j.lloc?.motiu, 'arriba',
    `amb creativitat ${REVELAT.creativitat} revelada el pla no pot dir «${j.lloc?.motiu}»`);
  assert.ok(j.lloc.valor >= Number(REVELAT.creativitat),
    'i la projecció ix del seu nivell, no del llistó');
  // Els dies s'han posat a posta perquè NO siga dels primers: si el pla ordenara pel rellotge
  // en compte de per la creativitat, este no entraria a una plaça d'entrenament.
  const persegons = [...vista.juvenils].sort((a, b) => a.dies_restants_promocio - b.dies_restants_promocio);
  assert.ok(persegons.indexOf(j) >= 5, 'el fixture l\'ha de deixar fora dels primers per rellotge');

  // I el tercer estat es queda desconegut, amb un número de veres al costat.
  const sv = vista.juvenils.find((x) => x.nom === SENSE_VALOR.nom);
  assert.equal(sv.lloc?.motiu, 'desconegut', 'revelat sense valor no és un nivell: no diu res d\'ell');
  assert.ok(Number.isFinite(sv.lloc.valor), 'i el que es pinta ha de ser un número, no un NaN');
}

// ── (e) LA ROJA BLOQUEJA, I VA A LA COLUMNA DE LES AMONESTACIONS ─────────────────────────
// El pla comprovava `f.expulsat`, i eixe camp NO EXISTIX: ni a l'esquema, ni a l'adaptador, ni
// enlloc. La condició no s'ha executat mai. La roja i la groga van a la MATEIXA columna del
// CSV i una roja s'escriu com un 3 —el mateix que tres grogues—, o siga que «té roja» i el
// llindar de sanció són el mateix número. L'oracle és el pom, no el codi.
{
  const llindar = Number(sqlite.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='amonestacions_suspensio'").get().valor);
  const { plaJuvenilComplet } = await import('../lib/orquestra_juvenil.js');
  const jid = vista.juvenils[0].jugador_id;
  const files = async () => (await db.prepare(
    'SELECT ij.*, j.nom, j.id AS jugador_id FROM instantanies_juvenils ij JOIN jugadors j ON j.id=ij.jugador_id WHERE ij.instantania_id=(SELECT MAX(id) FROM instantanies WHERE equip_id=2)').all()).results;

  const net = await plaJuvenilComplet(db, 1, await files(), 'competitiva');
  assert.ok(!net.bloquejats.includes(jid), 'sense amonestacions no està bloquejat');

  // Una GROGA no bloqueja.
  sqlite.prepare('UPDATE instantanies_juvenils SET amonestacions=1 WHERE jugador_id=?').run(jid);
  const groga = await plaJuvenilComplet(db, 1, await files(), 'competitiva');
  assert.ok(!groga.bloquejats.includes(jid), 'una groga no bloqueja ningú');

  // La ROJA sí, i el número el diu el pom.
  sqlite.prepare('UPDATE instantanies_juvenils SET amonestacions=? WHERE jugador_id=?').run(llindar, jid);
  const roja = await plaJuvenilComplet(db, 1, await files(), 'competitiva');
  assert.ok(roja.bloquejats.includes(jid),
    `amb ${llindar} amonestacions ha d'estar bloquejat: no pot jugar, ni entrena, ni gasta missatge`);
  assert.ok(!roja.onze.some((l) => l.jugador_id === jid), 'i no ocupa cap plaça d\'entrenament');
  sqlite.prepare('UPDATE instantanies_juvenils SET amonestacions=NULL WHERE jugador_id=?').run(jid);
}

// ── (d) LA PLANTILLA ROÏNA TAMBÉ TÉ ALINEACIÓ ────────────────────────────────────────────
// Si tots estan capats per davall del llistó, cap passada col·loca ningú i tot el pla és la
// cua. Eixe és justament el dia que més falta fa saber què fer, i «–» deu vegades no ho diu.
// L'orde el declara la BD; els números, `maxims_posicio`. Cap dels dos ix d'ací.
{
  const { plaJuvenil } = await import('../lib/juvenil_pla.js');
  const maxims = JSON.parse(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='maxims_posicio'").get().valor);
  const orde = JSON.parse(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='orde_alineacio_residual'").get().valor);
  const minim = Number(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='minim_jugadors'").get().valor);
  // Dotze capats a 2 en les dues habilitats que s'entrenen: no en salva cap.
  const capats = Array.from({ length: 12 }, (_, k) => ({
    jugador_id: k + 1, dies_edat: 15 * 112, dies_restants_promocio: 100 + k,
    creativitat_actual: 2, creativitat_potencial: 2, passades_actual: 2, passades_potencial: 2 }));
  const taula = { '15.0': Array(12).fill(3.6) };
  const pla = plaJuvenil(capats, {
    passades: [{ habilitat: 'creativitat', llisto: 6, taula, buckets: ['mc', 'extrem'] },
      { habilitat: 'passades', llisto: 5, taula, buckets: ['mc', 'extrem', 'davanter'] }],
    places: maxims, habs: ['creativitat', 'passades'], residuals: orde, minimEnCamp: minim });

  assert.equal(pla.onze.length, minim, 'amb dotze capats encara ha d\'eixir una alineació legal');
  // Els dotze estan empatats en tot menys en els dies, o siga que la cua és id 1, 2, 3… i cada
  // posició ha de caure sobre QUI toca: comparar només quants n'hi ha de cada no veu un orde
  // invertit, perque 1+5+3 ompli igual comence per on comence.
  let queden = minim, id = 1;
  const esperat = [];
  for (const b of orde) {
    const n = Math.min(maxims[b] ?? 0, queden);
    for (let k = 0; k < n; k++) esperat.push({ jugador_id: id++, bucket: b });
    queden -= n;
  }
  assert.deepEqual(pla.onze.map(({ jugador_id, bucket }) => ({ jugador_id, bucket }))
    .sort((a, b) => a.jugador_id - b.jugador_id), esperat,
    `l'alineació de rescat ha de seguir l'orde declarat (${orde.join(' → ')}), no un «residual» genèric`);
  assert.ok(!orde.some((b) => ['mc', 'extrem'].includes(b)),
    'i l\'orde declarat no pot gastar places d\'entrenament amb qui no entrena res');
}

console.log(`OK — G4: el parte i Juvenils assenyalen els mateixos ${sobraSeccio.size} sobrants,`
  + ' la prescripció de l\'acadèmia arriba a la secció i la creativitat revelada arriba al pla');
