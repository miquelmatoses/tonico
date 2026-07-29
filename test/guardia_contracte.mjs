// Tonico — G1 CONTRACTE-FULL (invariant 11). Per a cada fórmula de formules.json amb
// avaluador i referència, sobre fixtures sintètics: avaluador(f,fix) = referència(f,fix).
// Les fórmules encara no reconstruïdes queden com a PENDENTS DECLARADES (visibles al
// resum, mai silenci). Assert de tancament: verificades + pendents = total → cap forat.
//
// Contracte v3 (model competitiu-econòmic). Cada fórmula que s'afig al full registra ací
// el seu avaluador i la seua referència: si no, el guardià la compta com a PENDENT.
// node test/guardia_contracte.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fCalendari, temporadaOperativa, setmanaDeHui, iniciDeSetmana } from '../lib/calendari.js';
import { ESTRATEGIES, falten as confFalten, llocsPartit } from '../lib/config.js';
import { souSostenible, perPeriode, reservaFlux, despesaPlanter, dadesVelles,
  fluxRepartible, pressupostPersonal, mitjanaSetmanal, calibrat } from '../lib/economia.js';
import { normalitzaDivisio, divisioArab, DIVISIONS } from '../lib/divisio.js';
import { pesLloc, pressupostSou, carregaConfigPesos, pesosHabilitat, contribucio,
  equivalent, costHabilitat, souPerfil, perfilObjectiu, nivellsObjectiu } from '../lib/pesos.js';
import { sobrecost } from '../lib/mancanca.js';
import { urgent as esUrgent, motiuVenda, ordreVenda, desti, despatxable,
  subhastaDeserta } from '../lib/vendes.js';
import { assignaEstructura } from '../lib/onze.js';
import { valorPlaces } from '../lib/valor_placa.js';
import { matxosPerNivell, projecta, avaluaHabilitat, plaJuvenil, sobrants as sobrantsJuv } from '../lib/juvenil_pla.js';
import { onzeEstructura } from '../lib/onze_estructura.js';
import { entrenadorSostingut, nivellDelSou,
         costFlux, nivellPagable, planPersonal, decisioRenovacio, placesAdmeses,
  sostrePersonal, baseTipus as baseTipusG1 } from '../lib/personal_v3.js';
import { guanyJugador, admissibleJugador, deltaManteniment, estadiCaduc, admissibleEstadi,
  eficiencia, decisioEstoc } from '../lib/estoc.js';
import { nivellAccio, agrupaAlertes, ordenaAgenda } from '../lib/informe.js';
import { necessitats, ambPreus, clauFitxatge, cercaDe } from '../lib/fitxatges.js';
import { REGLES } from '../lib/regles.js';
import { entrenamentPrescrit, entrenamentJuvenil, placesEntrenament } from '../lib/entrenament_places.js';
import { esLesionat } from '../public/format.js';
import { nova } from './_d1shim.mjs';

// Una BD de fixtures per a les fórmules que llegixen taules (cap dada d'usuari).
const { db: dbFix, sqlite: sqliteFix } = nova(import.meta.url);
sqliteFix.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'u','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','VII','academia',2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');`);

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..');
const { formules } = JSON.parse(readFileSync(join(arrel, 'formules.json'), 'utf8'));

// Fixtures sintètics (cap dada d'usuari; invariant 9). Entrenament prescrit del v3.
const A = 'creativitat', B = 'passades';
const TAULA = { porteria: ['porter'], defensa: ['defensa'], creativitat: ['mc'],
  passades: ['mc', 'extrem', 'davanter'], extrem: ['extrem'],
  anotacio: ['davanter'], pilota_aturada: ['porter'] };
const MARGE = { f_marge: 0.5, marge_ple: 3, esperat_defecte: 5 };
// El codi diu `valor_esperat_desconegut`/`marge_esperat` on el full diu
// `esperat_act`/`marge_ple` (divergència de vocabulari, invariant 14).
const optsMarge = () => ({ f_marge: MARGE.f_marge, marge_esperat: MARGE.marge_ple,
  valor_esperat_desconegut: MARGE.esperat_defecte });

// Fixture del PAS 6, compartit per les seues fórmules. Els llocs arriben en l'orde de la
// formació i amb PESOS distints, per a que es veja que qui tria primer és el pes.
// Cada lloc porta els seus `pesos_habilitat`: la tria i la mesura van per CONTRIBUCIÓ, i un
// fixture sense ells provaria una altra cosa. Ací en són d'una sola habilitat a posta —així
// els números segueixen sent llegibles a ull—, i el policultiu es prova al PAS 2.
const ph1 = (h) => ({ [h]: 1 });
const perfil1 = (h, n) => ({ [h]: n });
const LLOCS6 = [
  { lloc: 'dav1', bucket: 'davanter', habilitat: 'anotacio', pesos_habilitat: ph1('anotacio'), pes: 0.9, entrena: false },
  { lloc: 'mc1', bucket: 'mc', habilitat: 'creativitat', pesos_habilitat: ph1('creativitat'), pes: 1.4, entrena: true, pct: 100 },
  { lloc: 'mc2', bucket: 'mc', habilitat: 'creativitat', pesos_habilitat: ph1('creativitat'), pes: 1.4, entrena: true, pct: 100 },
  { lloc: 'ext1', bucket: 'extrem', habilitat: 'extrem', pesos_habilitat: ph1('extrem'), pes: 1.1, entrena: true, pct: 50 },
];
const j6 = (id, o) => ({ id, nom: 'J' + id, sou: 1000, edat_anys: 26, edat_dies: 0,
  porteria: 1, defensa: 1, creativitat: 1, extrem: 1, anotacio: 1, passades: 1, pilota_aturada: 1, ...o });
const SQUAD6 = [j6(1, { creativitat: 9 }), j6(2, { creativitat: 7 }), j6(3, { anotacio: 9, creativitat: 5 }),
  j6(4, { extrem: 8 }), j6(5, {}), j6(6, { sou: 400 })];

// La BD del PAS 6: formació de veres, entrenador declarat (sense el seu nivell no hi ha
// velocitat, i sense velocitat no es pot dir si la pròxima pujada cau abans del límit).
sqliteFix.exec(`INSERT INTO personal_membres (usuari_id, rol, tipus, sou, coach_entrenament)
    VALUES (1,'entrenador','entrenador',5000,'passable');`);
const VELLS6 = Array.from({ length: 14 }, (_, i) => j6(i + 1, {
  porteria: i === 0 ? 9 : 1, defensa: i > 0 && i < 4 ? 8 - i : 1,
  creativitat: i >= 4 && i < 8 ? 13 - (i - 4) : 1,
  extrem: i >= 8 && i < 11 ? 7 : 1, anotacio: i >= 11 ? 8 : 1 }));
const JOVES6 = Array.from({ length: 4 }, (_, i) => j6(100 + i,
  { sou: 500, edat_anys: 18, creativitat: 9 - i, experiencia: 1 }));
let EST6 = null;
const est6 = async () => (EST6 ??= await onzeEstructura(dbFix, 1, [...VELLS6, ...JOVES6], 10291));

// REGISTRE de fórmules ja reconciliades: id → prova que compara la transcripció literal
// del full (avaluador) amb el codi actual (referència). Igualtat = contracte satisfet.
const VERIFICADES = {
  // ── VARIABLES BASE ──
  'V.plantilla': () => {
    // «instantània sènior vigent»: el sistema sempre llig l'última, no un acumulat.
    sqliteFix.exec(`INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (9,1,'E','senior');
      INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES
        (91,9,'2026-07-18',83,1),(92,9,'2026-07-25',83,2);`);
    const vigent = sqliteFix.prepare('SELECT id FROM instantanies WHERE equip_id=9 ORDER BY data DESC, id DESC LIMIT 1').get();
    assert.equal(vigent.id, 92, 'la vigent és la de data més recent');
  },
  'V.llistat': () => {
    // llistat(j) = transferible = 1 O fitxa llistada
    const llistat = (j) => j.transferible === 1 || j.estat_venda === 'llistat';
    assert.equal(llistat({ transferible: 1 }), true);
    assert.equal(llistat({ estat_venda: 'llistat' }), true);
    assert.equal(llistat({ transferible: 0 }), false);
  },
  'V.lesionat': () => {
    // lesionat(j) = csv.lesio ≥ 1  [font: buit | N]
    assert.equal(esLesionat('2'), true);
    assert.equal(esLesionat(''), false);
    assert.equal(esLesionat(null), false);
  },
  'V.sancionat': () => {
    // sancionat(j) = amonestacions ≥ `amonestacions_suspensio`
    const sancionat = (n, llindar) => (n ?? 0) >= llindar;
    assert.equal(sancionat(3, 3), true);
    assert.equal(sancionat(2, 3), false);
  },
  'V.edat_d': () => {
    // edat_d = anys×112 + dies · dies_aniversari = 112 − dies
    const edatD = (a, d, anyDies) => a * anyDies + d;
    assert.equal(edatD(20, 30, 112), 2270);
    assert.equal(112 - 30, 82, 'dies_aniversari');
  },
  'V.fase_mercat': () => {
    // BUSCA(`fases_mercat`; setmana) → modificador en FRACCIÓ, mai enter
    const cal = sqliteFix.prepare('SELECT setmana_temporada, modificador_valor FROM calendari_mercat ORDER BY setmana_temporada').all();
    assert.ok(cal.length > 0, 'la taula de fases de mercat està sembrada');
    for (const f of cal) assert.ok(Math.abs(f.modificador_valor) < 1, `setmana ${f.setmana_temporada}: fracció, no enter`);
  },
  'P0.estrategia': () => assert.deepEqual(ESTRATEGIES, ['competitiva', 'cycle'], 'TRIA(competitiva | cycle)'),
  'P0.pais': () => {
    const c = { estrategia: 'competitiva', pais: 'ES', divisio: 'VII', sistema_juvenil: 'academia', partits_setmana: 2 };
    assert.deepEqual(confFalten(c), [], 'els quatre del PAS 0 declarats');
    assert.deepEqual(confFalten({ ...c, pais: null }), ['pais'], 'el que falta es demana');
  },
  'P1.entrenament_senior': async () => {
    // DOS ENTRENAMENTS INDEPENDENTS i amb formes distintes: el primer equip entrena UNA
    // habilitat (amb intensitat i resistència); el doble entrenament és de l'acadèmia.
    const p = await entrenamentPrescrit(dbFix, 'competitiva');
    assert.equal(p.skill, 'creativitat', 'el sènior entrena una sola habilitat, prescrita');
    assert.equal(p.skill_b, undefined, 'i no té «B»: això és un concepte de l\'acadèmia');
    assert.ok(p.intensitat != null && p.resistencia != null,
      'i sí que té intensitat i resistència, que l\'acadèmia no té');
  },
  'P1.entrenament_academia': async () => {
    const jv = await entrenamentJuvenil(dbFix, 'competitiva');
    assert.equal(jv.principal, 'creativitat');
    assert.equal(jv.secundari, 'passades', 'l\'acadèmia sí que entrena dues habilitats');
    assert.equal(jv.intensitat, undefined, 'i no té intensitat: això és del primer equip');
  },
  // ── PAS 4 ──
  'P4.habilitat_lloc': async () => {
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    assert.equal(cfg.taula_habilitat_lloc.mc, 'creativitat', 'MC → creativitat');
    assert.equal(cfg.taula_habilitat_lloc.porter, 'porteria', 'POR → porteria');
    assert.equal(cfg.taula_habilitat_lloc.davanter, 'anotacio', 'DAV → anotació');
  },
  // ── PAS 7 / PAS 8 / PAS 9 ──
  // ── PAS 10 — JUVENILS. L'acadèmia és un proveïdor alternatiu d'entrenables: una rutina
  // aplicada dues voltes, primer creativitat i després passades.
  'P10.habilitats': async () => {
    // El PAS 10 entrena el que diu la prescripció DE L'ACADÈMIA, no la del primer equip.
    const jv = await entrenamentJuvenil(dbFix, 'competitiva');
    const pomA = (await dbFix.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenament_juvenil_a'").first()).valor;
    assert.equal(jv.principal, pomA, 'la principal ix del seu pom, no de entrenament_a');
  },
  'P10.factor': async () => {
    const f = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='entrenament_juvenil_factors'").first()).valor);
    assert.equal(f.ple, 1); assert.equal(f.baix, 0.5); assert.equal(f.residual, 0.15);
  },
  'P10.revela': async () => {
    const min = Number((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='revelacio_factor_min'").first()).valor);
    const f = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='entrenament_juvenil_factors'").first()).valor);
    assert.ok(f.ple >= min && f.baix >= min, 'els graons ple i baix revelen');
    assert.ok(f.residual < min, 'el residual NO revela: per això revelar i entrenar són la mateixa acció');
  },
  'P10.matxos': async () => {
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    // Interpola per edat i creix amb el nivell: pujar de 7 costa més que pujar de 0.
    assert.equal(matxosPerNivell(taula, 15 * 112, 0), 3.67, 'la fila de 15,0 tal qual');
    const mig = matxosPerNivell(taula, 15 * 112 + 28, 0);
    assert.ok(mig > 3.67 && mig < 3.91, 'entre dues files, interpola');
    assert.ok(matxosPerNivell(taula, 15 * 112, 7) > matxosPerNivell(taula, 15 * 112, 0), 'pujar de dalt costa més');
    assert.ok(matxosPerNivell(taula, 18 * 112, 0) > matxosPerNivell(taula, 15 * 112, 0), 'i de major, també');
  },
  'P10.sub_nivell': async () => {
    const sub = Number((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='sub_nivell_desconegut'").first()).valor);
    assert.ok(sub >= 0.5, 'vora ALTA: no es descarta ningú per pessimisme');
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    const opts = { taula, diesEdat: 16 * 112 + 25, diesRestants: 89 };
    assert.ok(projecta(4, { ...opts, subNivell: sub }) > projecta(4, { ...opts, subNivell: 0 }),
      'i mou el resultat: amb el terra, un jugador de la vora canvia de veredicte');
  },
  'P10.projeccio': async () => {
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    const base = { taula, diesEdat: 15 * 112 + 35, diesRestants: 189, subNivell: 0.9 };
    const ple = projecta(5, base);
    assert.ok(ple > 5, 'creix amb el temps que li queda');
    assert.ok(projecta(5, { ...base, factor: 0.5 }) < ple, 'i el factor de la posició el frena');
    assert.equal(projecta(5, { ...base, sostre: 6 }), 6, 'el sostre conegut l\'acota');
    assert.equal(projecta(null, base), null, 'sense actual no s\'inventa cap projecció');
  },
  'P10.bloquejat': () => {
    const j = (id, o) => ({ jugador_id: id, dies_restants_promocio: 100, dies_edat: 15 * 112, ...o });
    const r = plaJuvenil([j(1, { bloquejat: true }), j(2), j(3)], { passades: [], minimEnCamp: 1 });
    assert.deepEqual(r.bloquejats, [1], 'el bloquejat ix abans de cap tall');
    assert.ok(!r.onze.some((l) => l.jugador_id === 1) && !r.banqueta.includes(1),
      'i no apareix ni a l\'onze ni a la banqueta: no pot jugar');
  },
  'P10.talla': async () => {
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    const o = { llisto: 6, taula, subNivell: 0.9 };
    const j = (a, p) => ({ dies_edat: 16 * 112, dies_restants_promocio: 89,
      creativitat_actual: a, creativitat_potencial: p });
    assert.equal(avaluaHabilitat(j('desconegut', 4), 'creativitat', o).motiu, 'sostre_baix',
      'sostre conegut per davall: definitiu, encara sense saber l\'actual');
    assert.equal(avaluaHabilitat(j(3, 3), 'creativitat', o).motiu, 'sostre_baix',
      'un capat per davall ja el caça el sostre: el seu sostre ÉS el seu actual');
    assert.equal(avaluaHabilitat(j(7, 7), 'creativitat', o).motiu, 'capat_fet',
      'i el capat per damunt TAMBÉ es talla: ja és el producte, no gasta plaça');
    const desc = avaluaHabilitat(j('desconegut', 'desconegut'), 'creativitat', o);
    assert.equal(desc.talla, false, 'desconegut NO talla: sense proves no hi ha motiu');
    assert.equal(desc.valor, 6, 'i val el llistó: ni descarta ni desplaça els que arriben');
  },
  'P10.ordre': async () => {
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    const j = (id, dies, a) => ({ jugador_id: id, dies_edat: 15 * 112, dies_restants_promocio: dies,
      creativitat_actual: a ?? null, creativitat_potencial: null });
    const r = plaJuvenil([j(1, 190), j(2, 90), j(3, 190, 5)],
      { passades: [{ habilitat: 'creativitat', llisto: 6, taula, subNivell: 0.9, buckets: ['mc'] }],
        places: { mc: 3 }, minimEnCamp: 3 });
    assert.deepEqual(r.onze.map((l) => l.jugador_id), [3, 2, 1],
      'projecció DESC, i a igualtat el que MENYS temps li queda');
  },
  'P10.places': async () => {
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    const j = (id) => ({ jugador_id: id, dies_edat: 15 * 112, dies_restants_promocio: 190 });
    const p = (hab, buckets) => ({ habilitat: hab, llisto: 5, taula, subNivell: 0.9, buckets });
    const r = plaJuvenil([j(1), j(2), j(3), j(4)],
      { passades: [p('creativitat', ['mc']), p('passades', ['mc', 'davanter'])],
        places: { mc: 2, davanter: 2 }, minimEnCamp: 4 });
    const mc = r.onze.filter((l) => l.bucket === 'mc');
    assert.equal(mc.length, 2, 'les dues places de mig centre s\'omplin');
    assert.ok(mc.every((l) => l.habilitat === 'creativitat'),
      'i les RESERVA la primera passada: la segona no les toca');
  },
  'P10.places_2': async () => {
    const taula = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='velocitat_juvenil_creativitat'").first()).valor);
    const j = (id, cre) => ({ jugador_id: id, dies_edat: 15 * 112, dies_restants_promocio: 190,
      creativitat_actual: cre ?? null, creativitat_potencial: cre ?? null });
    // El capat a 2 el talla la creativitat i el recull la segona passada.
    const r = plaJuvenil([j(1), j(2, 2)],
      { passades: [{ habilitat: 'creativitat', llisto: 6, taula, subNivell: 0.9, buckets: ['mc'] },
        { habilitat: 'passades', llisto: 5, taula, subNivell: 0.9, buckets: ['davanter'] }],
        places: { mc: 1, davanter: 1 }, minimEnCamp: 2 });
    assert.equal(r.onze.find((l) => l.jugador_id === 2).bucket, 'davanter',
      'qui no serveix per creativitat encara pot rescatar-se per passades');
  },
  'P10.cua': () => {
    const j = (id, max, dies) => ({ jugador_id: id, dies_edat: 15 * 112, dies_restants_promocio: dies,
      defensa_actual: max, defensa_potencial: max });
    const r = plaJuvenil([j(1, 2, 100), j(2, 5, 100), j(3, 5, 50)],
      { passades: [], places: { porter: 1, defensa: 1 }, residuals: ['porter', 'defensa'],
        habs: ['defensa'], minimEnCamp: 2 });
    assert.deepEqual(r.onze.map((l) => l.jugador_id), [3, 2],
      'màxima habilitat coneguda DESC, i a igualtat el que menys temps li queda');
    assert.deepEqual(r.onze.map((l) => l.bucket), ['porter', 'defensa'],
      'i ix amb POSICIÓ, en l\'orde declarat: porter primer');
    assert.deepEqual(r.banqueta, [1], 'i el que menys sap fer, a la banqueta');
  },
  'P10.alineacio': async () => {
    const cj = async (k) => JSON.parse((await dbFix.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(k).first()).valor);
    const [maxims, orde] = [await cj('maxims_posicio'), await cj('orde_alineacio_residual')];
    // Ningú entrena res: tot el pla és la cua, i encara ha d'eixir una alineació.
    const j = (id) => ({ jugador_id: id, dies_edat: 15 * 112, dies_restants_promocio: 100 + id });
    const n = 1 + (maxims[orde[1]] ?? 0);                 // porter + tots els defenses
    const r = plaJuvenil(Array.from({ length: n }, (_, k) => j(k + 1)),
      { passades: [], places: maxims, residuals: orde, habs: [], minimEnCamp: n });
    assert.deepEqual(r.onze.map((l) => l.bucket),
      [orde[0], ...Array(n - 1).fill(orde[1])],
      `l'orde declarat mana: ${orde.join(' → ')}, amb les capacitats de maxims_posicio`);
  },
  'P10.objectiu_juvenil': async () => {
    const obj = Number((await dbFix.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='juvenil_objectiu'").first()).valor);
    const min = Number((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='minim_jugadors'").first()).valor);
    assert.equal(obj, min + 1, 'mínim convocable + 1: un de banqueta i cap més');
  },
  'P10.sobra': () => {
    assert.equal(sobrantsJuv([1, 2, 3], 3).length, 0, 'sense excedent no se\'n va ningú');
    assert.equal(sobrantsJuv([1, 2, 3, 4, 5], 3).length, 2, 'només el que sobra de l\'objectiu');
  },
  'P10.despatxa': () => {
    // L'orde invers del d'alinear, i el producte acabat blindat.
    assert.deepEqual(sobrantsJuv([1, 2, 3, 4], 3), [4], 'se\'n va l\'últim de la llista');
    assert.deepEqual(sobrantsJuv([1, 2, 3, 4], 3, new Set([4])), [3],
      'però mai qui ja arriba al llistó de creativitat, encara que estiga l\'últim');
    assert.deepEqual(sobrantsJuv([1, 2], 3), [], 'i mai per davall de l\'objectiu');
  },
  'P10.promociona': () => {
    // No és una decisió: es promociona el primer dia possible.
    const promocionable = (d) => (d ?? 1) <= 0;
    assert.equal(promocionable(0), true);
    assert.equal(promocionable(-3), true, 'passat el dia, també');
    assert.equal(promocionable(1), false);
  },

  'P7.desert': () => {
    assert.equal(subhastaDeserta({ transferible_abans: 1, transferible_ara: null, en_plantilla: true }), true,
      'estava llistat, ja no, i seguix a la plantilla → ningú l\'ha comprat');
    assert.equal(subhastaDeserta({ transferible_abans: 1, transferible_ara: null, en_plantilla: false }), false,
      'si ja no hi és, l\'han comprat: eixe és el camí del motiu de baixa');
    // I ES DESA: la transició només es veu entre dues instantànies. `vendes.estat` té l'estat.
    const chk = sqliteFix.prepare("SELECT sql FROM sqlite_master WHERE name='vendes'").get()?.sql || '';
    assert.ok(/'desert'/.test(chk), 'el fet té on viure: `vendes.estat` admet «desert»');
  },
  'P7.venda_activa': () => {
    // venda_activa(j) = motiu_venda ≠ ∅ I ¬desert(j). Un desert queda fora de TOT el mercat.
    const jugadors = [{ jugador_id: 7, nom: 'D', grup: 'venda', transferible: null, sou: 9000, edat_dies: 50 }];
    const p = { urgencia: 70, dies_urgencia: 14, posicio_porter: 'PO' };
    assert.ok(REGLES.ALR_LLISTAR_VENDA({ jugadors, any_dies: 112, deserts: new Set() }, p).length > 0,
      'sense la marca es proposaria');
    assert.deepEqual(REGLES.ALR_LLISTAR_VENDA({ jugadors, any_dies: 112, deserts: new Set([7]) }, p), [],
      'amb la marca, cap acció de mercat');
  },
  'P7.despatxable': () => {
    assert.equal(despatxable({ es_sobrant: true, desert: true }), true, 'sobrant desert → s\'acomiada');
    assert.equal(despatxable({ es_sobrant: false, desert: true }), false,
      'un retingut desert NO: és que el preu no era el bo, no un veredicte sobre el jugador');
  },
  'P8.obra_en_curs': () => {
    // obra_en_curs = `estadi_obra_inici` ≠ ∅. Una obra COMENÇADA no és una decisió pendent, i
    // com que l'estadi té prioritat absoluta, mentre estiga damunt de la taula no es proposa
    // res més: sense esta declaració Tonico bloquejava tota la resta indefinidament.
    const cols = sqliteFix.prepare('SELECT * FROM pragma_table_info(?)').all('finances').map((c) => c.name);
    assert.ok(cols.includes('estadi_obra_inici'), 'té on declarar-se (invariant 17)');
    const base = { cost: 50000, caixa: 100000, flux: 10000, delta_manteniment: 0, reserva_flux: 0 };
    assert.equal(admissibleEstadi({ ...base }), true, 'sense obra en curs, admissible');
    assert.equal(admissibleEstadi({ ...base, obra_en_curs: true }), false,
      'amb l\'obra en marxa, no: ja s\'ha decidit i no es decidix dues vegades');
  },
  'P9.onze_a': () => {
    // L'onze A és l'assignació d'estructura tal qual: els millors a cada lloc del pla, un
    // jugador un lloc, i els llocs trien per pes.
    const llocs = [{ lloc: 'MC1', bucket: 'mc', habilitat: 'creativitat', pes: 1.46 },
      { lloc: 'DV1', bucket: 'davanter', habilitat: 'anotacio', pes: 0.89 }];
    const { onze } = assignaEstructura([{ id: 1, creativitat: 9, anotacio: 8 },
      { id: 2, creativitat: 3, anotacio: 7 }], llocs);
    assert.deepEqual(onze.map((l) => l.jugador.id), [1, 2],
      'el lloc de més pes tria primer, i cada jugador ocupa un lloc només');
  },
  'P9.onze_b': () => {
    // L'onze B es COMPON, no es torna a optimitzar: els llocs que ENTRENEN no es cedixen a
    // ningú. La composició sencera es prova a test/dos_onzes.mjs amb la base davant; ací es
    // fixa la regla que la governa, que és que un lloc d'entrenament no és cedible.
    const cediblesA = ['dobla'];
    for (const motiu of ['entrena', 'entrena_mig', 'suplent']) {
      assert.ok(!cediblesA.includes(motiu),
        `un lloc amb motiu «${motiu}» no és cedible al futur entrenador`);
    }
    assert.ok(cediblesA.includes('dobla'), 'només els que dobles es poden cedir');
  },
  'P8.necessitats': () => {
    // Les places BUIDES manen per damunt de qualsevol distància, i un sol nivell no és un
    // forat: s'arregla entrenant o esperant.
    const est = { entrenables: [], entrenables_max: 2, porter_suplent: null,
      onze: [{ bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 1 },
             { bucket: 'davanter', perfil_objectiu: { anotacio: 9, passades: 5 }, distancia: 3 }] };
    const n = necessitats(est, { entrenable_min: 6 });
    assert.equal(n[0].distancia, Infinity, 'una plaça buida va primer');
    assert.ok(!n.some((x) => x.bucket === 'mc' && x.tipus === 'lloc'), 'un sol nivell no és forat');
    assert.ok(n.some((x) => x.clau === 'davanter:ano9-pas5'), 'i tres nivells sí');
  },
  'P8.cerca': () => {
    // EL PERFIL QUE MESURA ÉS EL PERFIL QUE ES BUSCA: mínim per habilitat, que és el que el
    // cercador de Hattrick admet. Abans es demanava una sola habilitat a un lloc que en vol
    // quatre, o siga que el filtre i la vara no parlaven de la mateixa cosa.
    const perfil = { creativitat: 9, defensa: 6 };
    const c = cercaDe({ tipus: 'lloc', bucket: 'mc', perfil }, { posicions: { mc: ['MC'] }, caixa: 1 });
    assert.deepEqual(c.perfil, perfil);
    assert.equal(c.habilitat, undefined, 'i ja no es demana una habilitat solta');
    // L'ENTRENABLE SÍ que va per una: l'entrenament és d'UNA habilitat.
    const e = cercaDe({ tipus: 'entrenable', bucket: 'mc', nivell: 6 },
      { posicions: { mc: ['MC'] }, habilitats: { mc: 'creativitat' }, caixa: 1 });
    assert.deepEqual(e.habilitat, { camp: 'creativitat', min: 6 });
  },
  'P8.clau': () => {
    // La clau és el TIPUS de fitxatge, no el lloc: dos llocs iguals són una sola cerca.
    const A = { creativitat: 9, defensa: 6 };
    assert.equal(clauFitxatge('lloc', 'mc', A), clauFitxatge('lloc', 'mc', { defensa: 6, creativitat: 9 }),
      'dos llocs amb el mateix perfil són un sol fitxatge, escriga\'s com s\'escriga');
    // I EL PREU ÉS D'EIXE JUGADOR, no d'«un mig centre»: si el pressupost mou el perfil, la
    // clau canvia i el preu declarat deixa de valdre. Amb la clau vella («mc:9») el preu d'un
    // jugador es reutilitzava per a un altre de més car.
    assert.notEqual(clauFitxatge('lloc', 'mc', A), clauFitxatge('lloc', 'mc', { creativitat: 10, defensa: 6 }));
  },

  'P8.eficiencia': () => {
    // eficiència = prioritat / cost, i el cost és el preu DECLARAT.
    const amb = ambPreus([{ clau: 'mc:9', prioritat: 4.38 }], new Map([['mc:9', { preu: 100000 }]]), 200000);
    assert.equal(amb[0].preu, 100000);
    assert.equal(amb[0].admissible, true);
  },
  'P8.accio_3': () => {
    // SENSE PREU NO ES SUGGERIX MAI, i entre admissibles mana la prioritat.
    assert.equal(decisioEstoc([{ tipus: 'jugador', admissible: false, falta: 'preu', prioritat: 99 }]), null);
    assert.equal(decisioEstoc([
      { tipus: 'jugador', id: 'a', admissible: true, prioritat: 4, eficiencia: 9 },
      { tipus: 'jugador', id: 'b', admissible: true, prioritat: Infinity, eficiencia: 0.1 },
    ]).id, 'b', 'la plaça buida va primer');
  },
  'P8.pregunta': () => {
    // Es DEMANA a l'inici de cada temporada, de la calculadora: els camps existixen i
    // l'adreça és una constant, no un text a la vista.
    const cols = sqliteFix.prepare('SELECT * FROM pragma_table_info(?)').all('finances').map((c) => c.name);
    assert.ok(cols.includes('estadi_manteniment') && cols.includes('estadi_cost_obra') && cols.includes('estadi_data'),
      'els números de la calculadora es declaren i es daten');
    const url = sqliteFix.prepare("SELECT valor FROM constants_joc WHERE clau='url_calculadora_estadi'").get();
    assert.ok(url?.valor?.startsWith('http'), 'l\'adreça de la calculadora és una constant');
  },
  'P8.capacitat_objectiu': () => {
    // «configuració NRG de la calculadora»: Tonico NO la calcula, la rep declarada.
    const url = sqliteFix.prepare("SELECT valor, nota FROM constants_joc WHERE clau='url_calculadora_estadi'").get();
    assert.ok(/delega|declara/i.test(url.nota), 'queda escrit que es delega i es declara');
  },
  'P8.admissible': () => {
    // admissible(estadi): cost DECLARAT (no modelat) contra caixa cobrada, i el flux ha de
    // sostindre el manteniment nou deixant la reserva intacta.
    const cols = sqliteFix.prepare('SELECT * FROM pragma_table_info(?)').all('finances').map((c) => c.name);
    assert.ok(cols.includes('estadi_cost_obra') && cols.includes('estadi_manteniment'),
      'els dos números de l\'obra es declaren, no es modelen');
    assert.equal(admissibleEstadi({ cost: 1, caixa: null, flux: 1, delta_manteniment: 0 }), false,
      'sense caixa cobrada no hi ha obra');
  },
  'P8.accio': () => {
    const t = decisioEstoc([{ tipus: 'jugador', id: 'a', admissible: true, eficiencia: 1 },
      { tipus: 'jugador', id: 'b', admissible: true, eficiencia: 9 }]);
    assert.equal(t.id, 'b', 'entre jugadors: PRIMER(ORDENA(admissibles; eficiència DESC))');
  },
  'P8.estadi_caduc': () => {
    assert.equal(estadiCaduc('2026-01-01', '2026-07-26', 10), true, 'passades 10 setmanes, caducs');
    assert.equal(estadiCaduc('2026-07-01', '2026-07-26', 10), false);
    assert.equal(estadiCaduc(null, '2026-07-26', 10), false, 'sense data no són caducs: falten');
  },
  'P3.flux_repartible': () => {
    // El calaix únic: es lleven els FETS (planter, manteniment, sou de l'entrenador) i el
    // pressupost del personal és una QUOTA d'això, acotada pel que pot absorbir.
    assert.equal(fluxRepartible(100000, 60000, 5000), 35000);
    assert.equal(fluxRepartible(100000, 999999, 5000), 0, 'mai negatiu');
    assert.equal(pressupostPersonal(35000, 0.40, 65280), 14000, 'la quota mana quan cap');
    assert.equal(pressupostPersonal(500000, 0.40, 65280), 65280, 'i el sostre quan la quota el passa');
  },
  'P11.lliure': () => {
    // lliure = pressupost − SUMA(sous DECLARATS). El nivell uniforme diu què sosté el flux a
    // LLARG, suposant totes les places en eixe nivell; no és el que es pot pagar HUI, perquè
    // els que ja hi són no baixen de nivell fins al venciment. Amb 3 a nivell 2 (6.120) d'un
    // pressupost de 6.564 el pla diu «4 places a nivell 1», però només queden 444 €.
    const uniforme = planPersonal(6564, 1020, [{ tipus: 'a' }, { tipus: 'b' }, { tipus: 'c' }, { tipus: 'd' }]);
    assert.equal(uniforme.nivell, 1, 'el pla sosté el nivell 1 a les quatre places');
    const lliure = 6564 - 3 * 2040;
    assert.equal(lliure, 444, 'però el que queda de veres són 444 €');
    assert.equal(nivellPagable(lliure, 1020), 0, 'i no paga ni un nivell 1: cap acció');
    // Amb els tres a nivell 1 en queden 3.504, que pagarien un nivell 2 (2.040) — però el
    // SOSTRE és el nivell uniforme: contractar hui un nivell que al venciment tocaria baixar
    // seria comprometre flux per a després desfer-lo, i acomiadar costa 2× l'estalvi.
    assert.equal(nivellPagable(6564 - 3 * 1020, 1020), 2, 'el que queda pagaria un nivell 2…');
    assert.equal(Math.min(nivellPagable(6564 - 3 * 1020, 1020), uniforme.nivell), 1,
      '…però el nivell uniforme el limita a 1');
  },
  'P11.accio': () => {
    // ACCIÓ("contracta/puja de nivell") SI el nivell que el flux sosté > el declarat
    const r = planPersonal(5000, 1020, [{ tipus: 'metge' }]);
    assert.ok(r.pla[0].nivell > 0, 'amb flux, es proposa nivell');
    assert.equal(planPersonal(100, 1020, [{ tipus: 'metge' }]).pla[0].nivell, 0, 'sense flux, res');
  },
  'P11.accio_2': async () => {
    // ACCIÓ("millora l'entrenador") SI nivell_sostingut > nivell_actual. Es comprova sobre la
    // REGLA, no sobre l'avaluador: el que ha d'arribar a Miquel és l'alerta.
    const { REGLES } = await import('../lib/regles.js');
    const base = 1250;
    const ctx = (ingressos) => ({ economia: { entrenador: entrenadorSostingut({
      ingressosSetmanals: ingressos, quota: 0.10, base, souActual: costFlux(3, base) }) } });
    assert.equal(REGLES.ALR_ENTRENADOR_MILLORABLE(ctx(51064), { urgencia: 60 }).length, 0,
      'al nivell que els ingressos sostenen, cap alerta');
    const puja = REGLES.ALR_ENTRENADOR_MILLORABLE(ctx(51064 * 2), { urgencia: 60 });
    assert.equal(puja.length, 1, 'doblant els ingressos, l\'alerta ix');
    assert.equal(puja[0].parametres.sostingut, 4, 'i diu quin nivell sostenen');
    // Sense sou declarat no hi ha comparació: no s'inventa cap costat.
    assert.equal(REGLES.ALR_ENTRENADOR_MILLORABLE({ economia: { entrenador: entrenadorSostingut({
      ingressosSetmanals: 1e6, quota: 0.10, base, souActual: null }) } }, { urgencia: 60 }).length, 0,
      'sense sou declarat, res: no se sap de quin nivell es puja');
  },
  'P11.avis': () => {
    // AVÍS: compromet el flux `setmanes_contracte` setmanes (no es pot desfer)
    const set = sqliteFix.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='setmanes_contracte'").get();
    assert.ok(set && Number(set.valor) > 0, 'setmanes_contracte declarat: contractar compromet');
  },
  'P12.caducitats': () => {
    // ACCIÓ("renova/decidix", data) SI 0 ≤ data − hui ≤ `dies_avis_caducitat`
    const toca = (dies, avis) => dies >= 0 && dies <= avis;
    assert.equal(toca(3, 14), true);
    assert.equal(toca(-1, 14), false, 'ja passada, no és un avís');
    assert.equal(toca(20, 14), false);
  },
  'P12.urgencia': () => {
    // urgencia(acció) = BUSCA(`urgencia_tipus`; tipus) — pom, MAI a la vista
    const urg = sqliteFix.prepare("SELECT COUNT(*) n FROM regles_parametres WHERE clau='urgencia'").get();
    assert.ok(urg.n > 0, 'les urgències viuen en poms de regla, no en codi de vista');
  },
  'P12.res': () => assert.deepEqual(agrupaAlertes([], {}), [], '«de moment res» no és una alerta'),

  // P2.pos_a: pos_A = FILTRA(`taula_entrenament`; habilitat = A) → els llocs que entrena A
  'P2.pos_a': () => {
    const avaluador = TAULA[A];                                        // literal del full
    const referencia = Object.entries(valorPlaces(A, B, TAULA))
      .filter(([, v]) => v === 'a' || v === 'ab').map(([lloc]) => lloc);
    assert.deepEqual(referencia.sort(), [...avaluador].sort(), 'pos_A');
  },
  // P2.pos_b: pos_B = FILTRA(`taula_entrenament`; habilitat = B)
  'P2.pos_b': () => {
    const avaluador = TAULA[B];
    const referencia = Object.entries(valorPlaces(A, B, TAULA))
      .filter(([, v]) => v === 'b' || v === 'ab').map(([lloc]) => lloc);
    assert.deepEqual(referencia.sort(), [...avaluador].sort(), 'pos_B');
  },
  // P2.entrenable: entrenable(lloc) = lloc ∈ pos_A
  'P2.entrenable': () => {
    const vp = valorPlaces(A, B, TAULA);
    for (const lloc of Object.keys(vp)) {
      const avaluador = TAULA[A].includes(lloc);
      const referencia = vp[lloc] === 'a' || vp[lloc] === 'ab';
      assert.equal(referencia, avaluador, `entrenable(${lloc})`);
    }
  },
  // V.(temporada,setmana) = f_calendari(data, `ancora`) — LA funció única. Es verifica
  // que la posició derivada de la data coincidix amb la regla operativa, i que els punts
  // de decisió (pla, alertes, economia) ja no en porten cap còpia inline.
  'V.temporada_setmana': () => {
    const ancora = { data: '2026-07-25', temporada: 83, anyDies: 112 };
    const tempSetmanes = 16;
    // Dia 0 de l'àncora → temporada de l'àncora, setmana 1.
    assert.deepEqual(fCalendari('2026-07-25', ancora, tempSetmanes).crua, { temporada: 83, setmana: 1 });
    // Una temporada exacta després → la següent, setmana 1.
    assert.deepEqual(fCalendari('2026-11-14', ancora, tempSetmanes).crua, { temporada: 84, setmana: 1 });
    // Setmana final (>= tempSetmanes) → operativament ja és pretemporada de la següent.
    const finalT = fCalendari('2026-11-07', ancora, tempSetmanes);          // setmana 16
    assert.equal(finalT.crua.setmana, 16);
    assert.equal(finalT.temporada, finalT.crua.temporada + 1, 'setmana final → temporada següent');
    assert.equal(finalT.setmana, 0, 'setmana final → pretemporada (0)');
    // La regla operativa és la MATEIXA que consumixen pla/alertes/economia.
    assert.deepEqual(temporadaOperativa(83, 16, 16), { temporada: 84, setmana: 0 });
    assert.deepEqual(temporadaOperativa(83, 15, 16), { temporada: 83, setmana: 15 });
  },

  'V.setmana_actual': async () => {
    // EL RELLOTGE ÉS HUI, NO EL FITXER. I l'àncora ha de caure en el dia declarat: tota la
    // graella penja d'ella, i en dissabte totes les vores de setmana es desplacen.
    const cj = async (k) => (await dbFix.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(k).first())?.valor;
    const ancora = { data: await cj('calendari_ancora_data'),
      temporada: Number(await cj('calendari_ancora_temporada')), anyDies: Number(await cj('any_dies')) };
    assert.equal(new Date(`${ancora.data}T00:00:00Z`).getUTCDay(), Number(await cj('setmana_primer_dia')),
      `l'àncora (${ancora.data}) ha de caure en el primer dia de la setmana declarat`);
    // Dos dates distintes, dos setmanes distintes: el que mou el número és el TEMPS.
    const hui = await setmanaDeHui(dbFix, ancora.data);
    assert.deepEqual([hui.temporada, hui.setmana], [ancora.temporada, 1], 'el dia de l\'àncora és la setmana 1');
    const mesTard = await setmanaDeHui(dbFix, new Date(Date.parse(ancora.data) + 21 * 86400000).toISOString().slice(0, 10));
    assert.equal(mesTard.setmana, 4, 'i tres setmanes després, la 4 — sense pujar cap fitxer');
  },

  // P11.* — L'ENTRENADOR ESCALA AMB ELS INGRESSOS. Era l'únic element amb cost i efecte
  // coneguts que es restava com un fet i no participava de res: els ingressos podien
  // duplicar-se i mai hi havia un moment de millorar-lo.
  'P11.pressupost_entrenador': async () => {
    const pom = async (k) => Number((await dbFix.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind('competitiva', k).first())?.valor);
    const quota = await pom('quota_entrenador');
    const base = await pom('entrenador_cost_base');
    const r = entrenadorSostingut({ ingressosSetmanals: 51064, quota, base, souActual: costFlux(3, base) });
    assert.equal(r.pressupost, 51064 * quota, 'la quota va sobre els ingressos setmanals');
    // El nivell és CONSEQÜÈNCIA: el més alt que el pressupost paga, ni un més.
    assert.ok(costFlux(r.nivell_sostingut, base) <= r.pressupost, 'el nivell sostingut es paga');
    assert.ok(costFlux(r.nivell_sostingut + 1, base) > r.pressupost, 'i el següent no');
  },
  'P11.nivell_sostingut': async () => {
    const pom = async (k) => Number((await dbFix.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind('competitiva', k).first())?.valor);
    const [quota, base] = [await pom('quota_entrenador'), await pom('entrenador_cost_base')];
    const nivellMax = Number((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='entrenador_nivell_max'").first()).valor);
    // DOBLANT ELS INGRESSOS ha de pujar un nivell: eixe és tot el propòsit d'este pas.
    const ara = entrenadorSostingut({ ingressosSetmanals: 51064, quota, base, nivellMax, souActual: costFlux(3, base) });
    const doble = entrenadorSostingut({ ingressosSetmanals: 51064 * 2, quota, base, nivellMax, souActual: costFlux(3, base) });
    assert.equal(doble.nivell_sostingut, ara.nivell_sostingut + 1,
      'doblant els ingressos, el nivell que sostenen puja un: el cost es duplica per nivell');
    assert.equal(ara.millorable, false, 'i mentre no arribe, no hi ha res a fer');
    assert.equal(doble.millorable, true, 'quan arriba, sí');
    // El sostre és el que el joc permet contractar, no l'infinit.
    const infinit = entrenadorSostingut({ ingressosSetmanals: 1e9, quota, base, nivellMax, souActual: costFlux(3, base) });
    assert.equal(infinit.nivell_sostingut, nivellMax, 'mai passa del nivell màxim contractable');
  },
  'P11.nivell_actual': async () => {
    const base = Number((await dbFix.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='entrenador_cost_base'").first()).valor);
    // ES DERIVA DEL SOU, no es pregunta. I l'escala ha de reproduir el cas real conegut:
    // un entrenador de nivell 3 cobra 5.000 €/setmana.
    assert.equal(costFlux(3, base), 5000, 'nivell 3 = 5.000 €/setmana, la xifra verificada contra HT');
    assert.equal(nivellDelSou(5000, base), 3, 'i del sou se n\'ix el nivell');
    assert.equal(nivellDelSou(null, base), null, 'sense sou declarat no s\'inventa cap nivell');
    assert.equal(nivellDelSou(4321, base), null, 'i un sou que no és de l\'escala tampoc en dona cap');
  },

  // V.config / V.estrategia / P0.* — la config és l'única entrada d'usuari inicial i no
  // porta cap valor suposat: el que no es declara, es demana.
  'V.config': () => {
    const camps = ['estrategia', 'pais', 'divisio', 'sistema_juvenil', 'partits_setmana'];
    const buida = confFalten(null);
    assert.deepEqual(buida, ['estrategia', 'pais', 'divisio', 'partits_setmana']);
    const plena = { estrategia: 'competitiva', pais: 'ES', divisio: 'VII', sistema_juvenil: 'academia', partits_setmana: 2 };
    assert.deepEqual(Object.keys(plena).sort(), camps.slice().sort(), 'els 5 camps del full');
    assert.deepEqual(confFalten(plena), [], 'config completa → res a demanar');
  },
  'V.estrategia': () => assert.deepEqual(ESTRATEGIES, ['competitiva', 'cycle']),
  'V.llocs_partit': () => {
    // llocs_partit = 11 × partits_setmana (11 = els llocs de la formació, no un literal)
    assert.equal(llocsPartit({ partits_setmana: 2 }, 11), 22);
    assert.equal(llocsPartit({ partits_setmana: 1 }, 11), 11);
    assert.equal(llocsPartit({ partits_setmana: null }, 11), null, 'sense declarar → no se suposa');
  },

  // PAS 3 — el flux decidix el sou sostenible; l'estoc, la compra d'hui.
  // P3.esta_setmana / P3.data — QUINES DUES SETMANES ES DECLAREN NO ES PREGUNTA: esta és la de
  // hui i la passada la de fa set dies, i la data que es guarda és la VORA de cada una.
  'P3.accio': async () => {
    // ACCIÓ("gastes més del que entra") SI flux < reserva_flux. El llindar NO és zero.
    const { REGLES } = await import('../lib/regles.js');
    const eco = (ingressos, despeses, pct = 0.05) => ({ economia: {
      ingressos_recurrents: ingressos, despeses_fixes: despeses, flux: ingressos - despeses,
      reserva_flux: ingressos * pct, setmanes_periode: 1 } });
    const clau = (e) => REGLES.ALR_GASTA_MES(e, { urgencia: 90 }).map((x) => x.missatge_clau);
    assert.deepEqual(clau(eco(100000, 110000)), ['alerta.gasta_mes'], 'en negatiu, ho diu');
    assert.deepEqual(clau(eco(100000, 98000)), ['alerta.gasta_reserva'],
      'i en positiu però per davall de la reserva, TAMBÉ: el llindar és la reserva');
    assert.deepEqual(clau(eco(100000, 90000)), [], 'amb la reserva coberta, res');
    // No espera a calibrar: amb dues setmanes declarades el desequilibri ja és real.
    assert.equal(REGLES.ALR_GASTA_MES({ economia: { ...eco(100000, 110000).economia, calibrat: false } },
      { urgencia: 90 }).length, 1, 'no espera a calibrar');
    assert.equal(REGLES.ALR_GASTA_MES({ economia: { flux: null } }, { urgencia: 90 }).length, 0,
      'i sense flux no s\'inventa cap dèficit');
  },
  'P3.esta_setmana': async () => {
    const anc = { data: (await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data'").first()).valor,
      temporada: 83, anyDies: 112 };
    // Un dimecres qualsevol: les dues setmanes ixen del rellotge, no de cap camp.
    const esta = iniciDeSetmana('2026-08-05', anc);
    const passada = iniciDeSetmana(new Date(Date.parse('2026-08-05') - 7 * 86400000).toISOString().slice(0, 10), anc);
    assert.equal((Date.parse(esta) - Date.parse(passada)) / 86400000, 7, 'set dies exactes entre les dues');
    // I des de DISSABTE, que és el dia on una resta de sis dies encara cauria dins d'esta setmana.
    const dsEsta = iniciDeSetmana('2026-08-08', anc);
    const dsPassada = iniciDeSetmana('2026-08-01', anc);
    assert.notEqual(dsEsta, dsPassada, 'declarant en dissabte també han de ser dues setmanes distintes');
  },
  'P3.data': async () => {
    const anc = { data: (await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data'").first()).valor,
      temporada: 83, anyDies: 112 };
    const primerDia = Number((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='setmana_primer_dia'").first()).valor);
    // Qualsevol dia de la setmana ha de donar la MATEIXA vora, i eixa vora és el primer dia.
    const vores = ['2026-08-02', '2026-08-05', '2026-08-08'].map((d) => iniciDeSetmana(d, anc));
    assert.equal(new Set(vores).size, 1, 'tota la setmana dona la mateixa vora');
    assert.equal(new Date(`${vores[0]}T00:00:00Z`).getUTCDay(), primerDia, 'i la vora és el primer dia de la setmana');
  },

  'P3.ingressos_recurrents': () => {
    // v3.1: NOMÉS taquilla + per_periode(patrocini). `premis` és estoc, no flux.
    assert.equal(21127 + perPeriode(40500, 2), 102127, 'el fixture real de Sènior FC');
  },
  'P3.per_periode': () => {
    assert.equal(perPeriode(7100, 2), 14200, 'tot import setmanal es normalitza al període');
    assert.equal(perPeriode(null, 2), null, 'sense dada no s\'inventa');
  },
  'P3.despesa_planter': () => {
    const C = { cost_instalacions: 5000, cost_cercapromeses: 5000 };
    assert.equal(despesaPlanter('academia', 3, C), 20000, 'el fixture real: acadèmia + 3 cercapromeses');
    assert.equal(despesaPlanter('cercapromeses', 3, C), 15000, 'sense acadèmia, cap instal·lació');
    assert.equal(despesaPlanter('cap', 1, C), 5000, '«cap» NO és cost zero: el cercapromeses es paga igual');
  },
  'P3.despeses_fixes': () => {
    // ELS CINC CONCEPTES DE LA LÍNIA DEL FULL, comptats des del full i no des de l'avaluador.
    // Ací estava el forat: esta comprovació llistava els mateixos QUATRE que el codi —sense
    // `sou_entrenador`— o siga que confirmava el bug en compte de caçar-lo. L'oracle no pot
    // eixir de la font que es prova. Es llig la línia del full i se'n compten els sumands.
    // Del FULL CRU: la línia es partix en dos i el mirall només en guarda la primera, així que
    // es llig fins a tancar el parèntesi. Si es llegira el mirall, es perdria el darrer sumand
    // i tornaríem a tindre un oracle escapçat — que és una altra manera del mateix error.
    const full = readFileSync(join(arrel, 'docs/FORMULES.md'), 'utf8');
    const des = full.slice(full.indexOf('despeses_fixes'));
    let obert = 0, fi = 0;
    for (const [i, c] of [...des.slice(0, 500)].entries()) {
      if (c === '(') obert++;
      else if (c === ')' && --obert === 0) { fi = i; break; }
    }
    const sumands = des.slice(des.indexOf('(') + 1, fi).split('+').map((x) => x.trim().replace(/`/g, ''));
    assert.deepEqual(sumands.sort(),
      ['despesa_planter', 'manteniment_estadi', 'nòmina', 'personal', 'sou_entrenador'].sort(),
      'el full en llista cinc: si el codi en suma quatre, el flux i el sostre de sou ixen inflats');
    const set = { nomina: 5000, manteniment_estadi: 7100, personal: 2040, planter: 20000, entrenador: 5000 };
    assert.equal(Object.keys(set).length, sumands.length, 'i el fixture els cobrix tots');
    assert.equal(Object.values(set).reduce((a, v) => a + perPeriode(v, 2), 0), 78280,
      'totes les despeses són setmanals → × setmanes_periode');
  },
  'P3.flux': () => assert.equal(102127 - 78280, 23847),
  'P3.reserva_flux': () => {
    // v3.1: FRACCIÓ dels ingressos, no un import absolut.
    assert.equal(reservaFlux(102127, 0.05), 5106);
    assert.equal(reservaFlux(null, 0.05), null, 'sense ingressos no hi ha reserva calculable');
  },
  'P3.sou_sostenible': () => {
    // MAX(0; ingressos − reserva − (despeses_fixes − nòmina))
    assert.equal(souSostenible(100000, 80000, 30000, 5000), 45000);
    assert.equal(souSostenible(100000, 900000, 30000, 5000), 0, 'MAX(0; …)');
    assert.equal(souSostenible(null, 80000, 30000, 5000), null, 'sense ingressos, no se suposa');
    // PROPIETAT: més ingressos, mai menys sostre.
    let previ = -1;
    for (const i of [50000, 90000, 150000, 300000]) {
      const v = souSostenible(i, 60000, 20000, reservaFlux(i, 0.05));
      assert.ok(v >= previ, 'monotonia del sostre'); previ = v;
    }
  },
  'P3.caixa': () => {
    // «saldo real declarat (mai projectat)»: la funció no en fabrica cap.
  },
  'P3.caixa': () => {
  },

  // La DIVISIÓ té un únic format intern: cap taula del joc pot fallar en silenci.
  'V.config#divisio': () => {
    for (let n = 1; n <= DIVISIONS.length; n++) {
      assert.equal(normalitzaDivisio(n), DIVISIONS[n - 1]);
      assert.equal(divisioArab(DIVISIONS[n - 1]), n);
    }
    assert.equal(normalitzaDivisio('vii'), 'VII');
    assert.equal(normalitzaDivisio('9'), null, 'el que no és divisió no se suposa');
  },

  // PAS 2/4 — el pes d'un lloc i el nivell que l'economia hi sosté. Números de la guia.
  'P2.pes_sector': async () => {
    // LES DUES CAPES, i les dues multiplicant SEMPRE: conversió (mesurada) × importància (§5).
    const cj = async (k) => JSON.parse((await dbFix.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(k).first()).valor);
    const [conv, imp] = [await cj('pesos_sector'), await cj('importancia_sector')];
    assert.deepEqual(Object.keys(conv).sort(),
      ['atac_banda', 'atac_central', 'defensa_banda', 'defensa_central', 'mig'],
      'CINC sectors: defensa i atac del mateix costat no pesen igual');
    assert.ok(conv.defensa_banda > conv.atac_banda, 'i la mesura ho diu: 0,304 contra 0,241');
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    for (const s of Object.keys(conv)) {
      assert.equal(cfg.pes_sector[s], conv[s] * imp[s], `${s}: el pes efectiu és el PRODUCTE`);
    }
    // I els poms vells se n'han anat: col·lapsaven sectors i portaven el mig set vegades inflat.
    assert.equal(sqliteFix.prepare(
      "SELECT COUNT(*) n FROM plantilles_parametres WHERE clau IN ('pes_mig','pes_central','pes_banda')").get().n, 0,
      '`pes_mig` era l\'únic número que ens havíem inventat, i ja no hi és');
  },
  'P2.pesos_habilitat': () => {
    // EL SECTOR I L'HABILITAT ELS DIU LA COLUMNA, i les que van per la mateixa habilitat
    // se sumen: un lateral defén al centre i a la banda, i les dues són defensa.
    const ps = { mig: 1, defensa_central: 0.36, defensa_banda: 0.255, atac_central: 0.36, atac_banda: 0.255 };
    const ap = { Lat: { 'DC#Def': 0.35, 'Lat#Def': 0.92, 'AL#Ext': 0.59, 'Mig#Cre': 0.2 } };
    const p = pesosHabilitat('Lat', ap, ps);
    assert.equal(p.defensa, 0.35 * 0.36 + 0.92 * 0.255, 'les dues columnes de defensa, sumades');
    assert.equal(p.extrem, 0.59 * 0.255);
    assert.equal(p.creativitat, 0.2 * 1);
    assert.equal(pesosHabilitat('cap', ap, ps), null, 'posició desconeguda → no se suposa');
  },
  'P2.pes': () => {
    // pes(lloc) = SUMA(sectors: aportacio × pes_sector) = SUMA(pesos_habilitat): el que hi
    // aportaria un jugador que ho tinguera tot a 1.
    const ps = { mig: 1, defensa_central: 0.36, defensa_banda: 0.255, atac_central: 0.36, atac_banda: 0.255 };
    const ap = { Mig: { 'Mig#Cre': 1, 'DC#Def': 0.4, 'Lat#Def': 0.19, 'AC#Anot': 0.22, 'AC#Pas': 0.33, 'AL#Anot': 0.26 } };
    const aMa = 1 * 1 + 0.4 * 0.36 + 0.19 * 0.255 + 0.22 * 0.36 + 0.33 * 0.36 + 0.26 * 0.255;
    assert.equal(pesLloc('Mig', ap, ps), Math.round(aMa * 10000) / 10000);
    assert.equal(pesLloc('cap', ap, ps), null, 'posició desconeguda → no se suposa');
    const suma = Object.values(pesosHabilitat('Mig', ap, ps)).reduce((a, b) => a + b, 0);
    assert.equal(Math.round(suma * 10000) / 10000, pesLloc('Mig', ap, ps),
      'el pes del lloc no és cap altra cosa que la suma dels seus pesos per habilitat');
  },
  'P2.contribucio': () => {
    const ph = { defensa: 2, extrem: 1 };
    assert.equal(contribucio({ defensa: 6, extrem: 8 }, ph), 20);
    assert.equal(contribucio({ defensa: 7, extrem: 2 }, ph), 16);
    assert.equal(contribucio({ defensa: 6, extrem: 8, porteria: 9 }, ph), 20,
      'una habilitat que el lloc no gasta no aporta res');
  },
  'P2.equivalent': () => {
    // LA VARA, i EN L'ESCALA DE HATTRICK: qui ho té tot a n val n, i per això `distancia_min`
    // i tot el que es pinta es lligen igual que quan es mirava una sola habilitat.
    const ph = { defensa: 2, extrem: 1 };
    assert.equal(equivalent({ defensa: 9, extrem: 9 }, ph), 9);
    // EL CAS QUE VA OBRIR EL V2: 6/8 val MÉS al lloc que 7/2 — i mirant només la defensa
    // guanyava el segon, o siga que el sistema proposava canviar el bo pel roín.
    assert.ok(equivalent({ defensa: 6, extrem: 8 }, ph) > equivalent({ defensa: 7, extrem: 2 }, ph));
    assert.ok(6 < 7, 'i amb monocultiu la comparació era esta');
    assert.equal(equivalent({ defensa: 9 }, null), null, 'sense pesos no s\'inventa cap vara');
  },
  'P4.pressupost_sou': () => {
    // pressupost_sou(lloc) = sou_sostenible × pes(lloc) / SUMA(pesos de TOTS ELS LLOCS)
    const pesos = { a: 3, b: 1 };
    assert.deepEqual(pressupostSou(pesos, 8000), { a: 6000, b: 2000 }, 'un lloc per tipus');
    assert.equal(pressupostSou(pesos, null), null, 'sense sou sostenible, res');
    // AMB UN TIPUS DE MÉS D'UN LLOC — el cas que el fixture anterior no tenia, i per això el
    // bug va viure: es dividia entre 2 tipus en compte d'entre 4 llocs.
    //   suma correcta = 3×3 + 1×1 = 10  →  a = 8000×3/10 = 2400 (i n'hi ha 3: 7200)
    assert.deepEqual(pressupostSou(pesos, 8000, { a: 3, b: 1 }), { a: 2400, b: 800 });
    const total = 2400 * 3 + 800 * 1;
    assert.equal(total, 8000, 'repartint per lloc, la suma torna a ser el sostre sencer');
  },
  'P4.cost_habilitat': async () => {
    // Es busca amb l'ÍNDEX de la taula, que és el nivell de HT menys el desplaçament.
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    const off = cfg.nivell_offset;
    assert.equal(costHabilitat('creativitat', 5 + off, cfg.taula_salaris, off), 850,
      'el «Formidable» de la guia §8, buscat amb el nivell de Hattrick');
    assert.equal(costHabilitat('creativitat', off, cfg.taula_salaris, off), 0,
      'per davall del mínim de la taula no es paga res');
    // DUES ESCALES, i este és l'únic punt on es creuen. La taula de salaris comença en
    // «Inadequate» (el 5é de HT) i les habilitats del CSV venen en l'escala sencera.
    assert.equal(off, 4, 'el pont entre les dues escales està declarat, amb la seua font');
    assert.equal(cfg.taula_salaris.creativitat['5'], 850, 'el nostre 5 és el Formidable de la guia');
    assert.equal(5 + off, 9, 'i Formidable és el nivell 9 de Hattrick');
    // I EL PERFIL VA EN L'ESCALA DE HATTRICK, no en índexs de la taula: si no, tot el que es
    // compara amb un jugador eixiria quatre nivells curt.
    const n = nivellsObjectiu(['mc', 'davanter', 'porter'], cfg, 20000);
    for (const [lloc, v] of Object.entries(n)) {
      for (const [hab, niv] of Object.entries(v.perfil_objectiu)) {
        assert.ok(niv > off, `${lloc}/${hab}: el perfil va en l'escala de Hattrick`);
      }
    }
  },
  'P4.sou_perfil': async () => {
    // base + la MÉS CARA sencera + `secundari` × la resta. D'ací ix que repartir siga barat.
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    const { sou_formula: f, nivell_offset: off, taula_salaris: ts } = cfg;
    const n = 5 + off;                                  // «Formidable»: defensa 730, extrem 550
    const sol = souPerfil({ defensa: n }, ts, f, off);
    assert.equal(sol, Math.round(f.base + costHabilitat('defensa', n, ts, off)),
      'una sola habilitat: base + el seu cost');
    assert.equal(souPerfil({ defensa: n, extrem: n }, ts, f, off),
      Math.round(f.base + costHabilitat('defensa', n, ts, off)
        + f.secundari * costHabilitat('extrem', n, ts, off)),
      'la principal és la MÉS CARA, i la resta paga una fracció');
    assert.equal(souPerfil({ extrem: n, defensa: n }, ts, f, off),
      souPerfil({ defensa: n, extrem: n }, ts, f, off),
      'i «principal» no vol dir «la primera que has escrit»');
  },
  'P4.perfil_objectiu': async () => {
    // EL PRESSUPOST COMPRA UN PERFIL, NO UN NIVELL. La propietat que justifica tot el pas:
    // amb el MATEIX sou, repartir aporta més que concentrar-ho tot en una habilitat.
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    const { sou_formula: f, nivell_offset: off, taula_salaris: ts } = cfg;
    const ph = pesosHabilitat('Lat', cfg.taula_aportacio, cfg.pes_sector);
    const PRES = 4000;
    const o = perfilObjectiu(ph, PRES, ts, f, { offset: off });
    assert.ok(o.sou <= PRES, `el perfil no passa mai del pressupost (costa ${o.sou})`);
    // El millor MONOCULTIU que cabia en el mateix pressupost: la vara vella. Les altres
    // habilitats es queden al terra (`offset`), les MATEIXES que el perfil objectiu deixa
    // sense pujar — si no, es compararia contra un jugador que a més no existix i qualsevol
    // perfil guanyaria per l'esglaó de base, no per repartir.
    const terra = Object.fromEntries(Object.keys(ph).map((h) => [h, off]));
    const millorSol = Object.keys(ph).map((h) => {
      let n = off;
      while (n < off + 20 && souPerfil({ ...terra, [h]: n + 1 }, ts, f, off) <= PRES) n++;
      return contribucio({ ...terra, [h]: n }, ph);
    }).sort((a, b) => b - a)[0];
    assert.ok(o.aportacio > millorSol,
      `repartir aporta més pel mateix sou (${o.aportacio} contra ${millorSol})`);
    // I més pressupost, mai menys aportació: la fórmula no pot castigar guanyar més.
    assert.ok(perfilObjectiu(ph, PRES * 2, ts, f, { offset: off }).aportacio >= o.aportacio);
    assert.equal(perfilObjectiu(ph, null, ts, f, { offset: off }), null, 'sense pressupost, res');
  },
  'P4.sou_objectiu': async () => {
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    const n = nivellsObjectiu(['mc', 'davanter', 'porter'], cfg, 20000);
    for (const [lloc, v] of Object.entries(n)) {
      assert.equal(v.sou_objectiu,
        souPerfil(v.perfil_objectiu, cfg.taula_salaris, cfg.sou_formula, cfg.nivell_offset),
        `${lloc}: el sou objectiu és el DEL PERFIL, no el d'una habilitat`);
      assert.ok(v.sou_objectiu <= v.pressupost_sou, `${lloc}: i cap dins del pressupost del lloc`);
    }
  },
  'P4.aportacio_objectiu': async () => {
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    const n = nivellsObjectiu(['mc', 'davanter', 'porter'], cfg, 20000);
    for (const [lloc, v] of Object.entries(n)) {
      assert.equal(v.aportacio_objectiu, contribucio(v.perfil_objectiu, v.pesos_habilitat),
        `${lloc}: l'aportació objectiu és la contribució del perfil`);
    }
  },

  // PAS 0 / PAS 3 / PAS 4 / PAS 7 / PAS 11 — les que quedaven declarades pendents amb
  // l'avaluador ja escrit: el forat era del guardià, no de l'app.
  'P0.n_cercapromeses': () => {
    // Un pom del PAS 0 amb tres valors possibles, i el planter en depén linealment.
    for (const n of [1, 2, 3]) {
      assert.equal(despesaPlanter('academia', n, { cost_instalacions: 10000, cost_cercapromeses: 5000 }),
        10000 + 5000 * n, `${n} cercapromeses`);
    }
  },
  'P3.periode_setmanes': () => {
    // La normalització: les despeses són setmanals i el període en val dues.
    assert.equal(perPeriode(1000, 2), 2000);
    assert.equal(perPeriode(1000, 1), 1000, 'amb un partit per setmana no es dobla res');
  },
  'P3.setmanes_declarades': async () => {
    // ORDENADES per (temporada, setmana) DESC: la més recent primer, i la identitat de
    // cada setmana ix del calendari, no de la data en cru.
    sqliteFix.exec(`INSERT INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada) VALUES
      (1,82,15,10,1,'2026-07-04','2026-07-26'),(1,83,1,30,3,'2026-07-19','2026-07-26'),(1,82,16,20,2,'2026-07-11','2026-07-26');`);
    const { results } = await dbFix.prepare(
      'SELECT temporada, setmana FROM setmanes_economiques WHERE usuari_id=1 ORDER BY temporada DESC, setmana DESC').all();
    assert.deepEqual(results.map((r) => `${r.temporada}.${r.setmana}`), ['83.1', '82.16', '82.15']);
  },
  'P3.mitjana_setmanal': () => {
    // NOMÉS taquilla + patrocini, i només les N últimes.
    const setmanes = [{ taquilla: 100, patrocini: 10 }, { taquilla: 200, patrocini: 20 },
      { taquilla: 900, patrocini: 90 }];
    assert.equal(mitjanaSetmanal(setmanes, 2), 165, 'les dues primeres: (110 + 220) / 2');
    assert.equal(mitjanaSetmanal([], 2), null, 'sense setmanes no se n\'inventa cap mitjana');
  },
  'P3.calibrat': () => {
    assert.equal(calibrat([1, 2, 3], 3), true, 'tres declarades i en calen tres');
    assert.equal(calibrat([1, 2], 3), false, 'amb dos, el número és soroll i es diu');
    assert.equal(calibrat([], 3), false);
  },
  'P4.sou_sostenible_setmanal': () => {
    // L'ÚNIC punt on es torna a unitats setmanals: `taula_salaris` va en €/setmana.
    // La nòmina ja va dins de les despeses fixes, o siga que se'n lleva per a obtindre el
    // sostre: 20000 − 1000 de reserva − (6000 − 4000 de nòmina).
    const sost = souSostenible(20000, 6000, 4000, 1000);
    assert.equal(sost, 17000);
    assert.equal(sost / 2, 8500, 'i el setmanal és el del període dividit per `setmanes_periode`');
  },
  'P7.caixa': async () => {
    // La caixa és el saldo DECLARAT, mai una projecció ni una suma de moviments.
    sqliteFix.exec("INSERT INTO finances (usuari_id, caixa, caixa_data) VALUES (1,173004,'2026-07-26');");
    const f = await dbFix.prepare('SELECT caixa FROM finances WHERE usuari_id=1').first();
    assert.equal(f.caixa, 173004, 'el saldo DECLARAT, mai una projecció');
    sqliteFix.exec('UPDATE finances SET caixa=NULL WHERE usuari_id=1;');
    const buit = await dbFix.prepare('SELECT caixa FROM finances WHERE usuari_id=1').first();
    assert.equal(buit.caixa, null, 'sense declarar no hi ha caixa: null, no zero (invariant 18)');
  },
  'P11.pressupost_personal': () => {
    assert.equal(pressupostPersonal(10000, 0.4, 99999), 4000, 'quota del repartible');
    assert.equal(pressupostPersonal(10000, 0.4, 2500), 2500,
      'i mai per damunt del que el personal pot absorbir');
  },
  'P11.sostre_personal': () => {
    // SUMA(places × cost_flux(nivell_max)): passat això, el sobrant va als jugadors.
    const places = ['assistent', 'assistent', 'metge'];
    assert.equal(sostrePersonal(places, 1000, 1), 3 * costFlux(1, 1000));
    assert.ok(sostrePersonal(places, 1000, 3) > sostrePersonal(places, 1000, 1),
      'el cost creix amb el nivell');
  },
  'P11.prioritat_personal': async () => {
    // ORDE FIX declarat, i les places que la quota del joc permet.
    const pom = (await dbFix.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='prioritat_personal'").first())?.valor;
    const prioritat = JSON.parse(pom || '[]');
    assert.ok(prioritat.length, 'la prioritat està declarada, no escrita al codi');
    const quotes = JSON.parse((await dbFix.prepare("SELECT valor FROM constants_joc WHERE clau='quotes_personal'").first())?.valor || '{}');
    const places = placesAdmeses(prioritat, quotes);
    assert.equal(places[0].tipus ?? places[0], prioritat[0].tipus ?? prioritat[0],
      'la primera plaça és la primera de la prioritat declarada');
    assert.equal(places.length, quotes.total,
      'i se n\'admeten exactament les que la quota del joc permet, ni una més');
    const perTipus = places.reduce((a, p) => ({ ...a, [p.tipus ?? p]: (a[p.tipus ?? p] ?? 0) + 1 }), {});
    for (const [tipus, n] of Object.entries(perTipus)) {
      assert.ok(n <= (quotes.per_tipus?.[tipus] ?? 1), `${tipus}: la quota per tipus també es respecta`);
    }
  },

  // PAS 5 — LA DISTÀNCIA A L'OBJECTIU, en valor absolut.
  'P5.distancia': () => {
    // QUANT LI FALTA al lloc. Un lloc SOBRAT no compta: no es pot arreglar comprant, perquè
    // l'assignació torna a donar el lloc al millor i el fitxatge se'n va al residu.
    const n = necessitats({ entrenables: [], entrenables_max: 0, porter_suplent: {}, onze: [
      { bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 3 },
      { bucket: 'porter', perfil_objectiu: { porteria: 5 }, distancia: 0 }] }, {});
    assert.deepEqual(n.map((x) => x.bucket), ['mc'], 'el sobrat no és una necessitat de mercat');
    assert.equal(n[0].distancia, 3, 'tres per davall → distància 3');
  },
  'P5.compta': () => {
    const n = necessitats({ entrenables: [], entrenables_max: 0, porter_suplent: {}, onze: [
      { bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 1 },
      { bucket: 'davanter', perfil_objectiu: { anotacio: 9, passades: 5 }, distancia: 2 }] }, {});
    assert.deepEqual(n.map((x) => x.bucket), ['davanter'],
      'un sol nivell no és un forat: s\'arregla entrenant o esperant');
  },
  'P5.ordre': () => {
    const n = necessitats({ entrenables: [], entrenables_max: 2, porter_suplent: null, onze: [
      { bucket: 'mc', perfil_objectiu: { creativitat: 9, defensa: 6 }, distancia: 2 },
      { bucket: 'extrem', perfil_objectiu: { extrem: 9, creativitat: 5 }, distancia: 3 }] }, { entrenable_min: 6 });
    assert.deepEqual(n.map((x) => x.tipus === 'lloc' ? x.bucket : x.tipus),
      ['entrenable', 'porter_suplent', 'extrem', 'mc'],
      'places buides primer, i després qui més lluny està');
  },
  'P5.lloc_de': async () => {
    // EL SEU LLOC és aquell on més APORTA, no aquell on té la millor habilitat solta: la
    // mateixa vara amb què se'l tria.
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    const n = nivellsObjectiu(['porter', 'defensa', 'mc', 'extrem', 'davanter'], cfg, 100000);
    const llocDe = (j) => Object.entries(n)
      .map(([l, v]) => ({ l, ap: equivalent(j, v.pesos_habilitat) ?? 0 }))
      .sort((a, b) => b.ap - a.ap)[0].l;
    assert.equal(llocDe({ porteria: 9 }), 'porter');
    assert.equal(llocDe({ anotacio: 9 }), 'davanter', 'un davanter no es mesura contra el mig centre que mai serà');
    assert.equal(llocDe({ creativitat: 9 }), 'mc');
  },
  'P5.sobrecost': () => {
    // CONTRA EL SOU DEL PERFIL que el lloc paga, no contra el preu d'una sola habilitat.
    assert.equal(sobrecost({ sou: 900 }, 330), 570);
    assert.equal(sobrecost({ sou: 300 }, 330), 0, 'MAX(0; …)');
    assert.equal(sobrecost({ sou: 900 }, null), null, 'sense sou objectiu no s\'inventa cap sobrecost');
  },

  // PAS 6 — L'ASSIGNACIÓ. Es reparteixen TOTS els jugadors, lloc a lloc, i el que sobra és
  // el residu. Ja no hi ha classificació prèvia (core/rotatiu/titular/porter/cos).
  'P6.onze': () => {
    const { onze } = assignaEstructura(SQUAD6, LLOCS6);
    // Els MC pesen més i trien primer: s'enduen els dos millors creatius encara que el 3
    // fora millor davanter. El davanter tria després, amb el que li queda.
    assert.deepEqual(onze.map((l) => l.jugador?.id), [3, 1, 2, 4],
      'les parelles de més valor afegit es reparteixen primer, i l\'eixida va en l\'orde de la formació');
    const ids = onze.map((l) => l.jugador?.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, 'un jugador, un lloc');
    // PER PARELLES, NO PER ORDE DE LLOCS — i este és el cas que ho va obrir. La porteria pesa
    // MENYS que el davanter, així que triava després; el davanter mirava qui li rendia més i
    // s'enduia el porter (anotació 6 contra 5), i sota pals es quedava el que no en sap.
    // Amb parelles, porter×9 (9,9) val més que davanter×6 (8,4) i es reparteix abans.
    const LL = [{ lloc: 'dav', bucket: 'davanter', habilitat: 'anotacio', pesos_habilitat: ph1('anotacio'), pes: 1.4 },
      { lloc: 'por', bucket: 'porter', habilitat: 'porteria', pesos_habilitat: ph1('porteria'), pes: 1.1 }];
    const r = assignaEstructura([j6(1, { porteria: 9, anotacio: 6 }), j6(2, { porteria: 0, anotacio: 5 })], LL);
    assert.equal(r.onze.find((l) => l.lloc === 'por').jugador.id, 1, 'el porter, sota pals');
    assert.equal(r.onze.find((l) => l.lloc === 'dav').jugador.id, 2, 'i el davanter, de davanter');
  },
  'P6.sobrants': () => {
    const { onze, sobrants } = assignaEstructura(SQUAD6, LLOCS6);
    assert.equal(onze.filter((l) => l.jugador).length + sobrants.length, SQUAD6.length,
      'onze ∪ sobrants = plantilla, sense repetits ni perduts');
    assert.deepEqual(sobrants.map((x) => x.id).sort((a, b) => a - b), [5, 6]);
  },
  'P6.mancances': () => {
    // QUÈ LI FALTA AL LLOC per a ser el de la plantilla ideal, habilitat a habilitat.
    const llocs = LLOCS6.map((l) => ({ ...l, perfil_objectiu: perfil1(l.habilitat, 8) }));
    const { onze } = assignaEstructura(SQUAD6, llocs);
    assert.deepEqual(onze.find((l) => l.lloc === 'mc2').mancances, { creativitat: 1 },
      'CR 7 contra un perfil de 8: li falta 1');
    assert.equal(onze.find((l) => l.lloc === 'mc2').senyal, 'baix');
    // EL QUE SOBRA NO ÉS UN FORAT: el tapa del tot. Amb la distància absoluta este eixiria
    // tan lluny com el que no hi arriba, i el lloc se l'enduria el mediocre que s'ajusta.
    assert.deepEqual(onze.find((l) => l.lloc === 'mc1').mancances, {}, 'CR 9 contra 8: res');
    assert.equal(onze.find((l) => l.lloc === 'mc1').senyal, 'alt');
    // I NO ES COMPENSA ENTRE HABILITATS: el forat d'una no el tapa el sobrant d'una altra.
    const dosHab = [{ lloc: 'x', bucket: 'mc', habilitat: 'creativitat', pes: 1,
      pesos_habilitat: { creativitat: 3, defensa: 1 },
      perfil_objectiu: { creativitat: 9, defensa: 6 } }];
    const r = assignaEstructura([j6(1, { creativitat: 12, defensa: 1 })], dosHab).onze[0];
    assert.deepEqual(r.mancances, { defensa: 5 },
      'li sobra creativitat i li falta defensa, i les dues coses es diuen per separat');
    assert.equal(r.distancia, 5 / 4, 'el forat ponderat pel pes de cada habilitat al lloc');
    assert.equal(assignaEstructura([], dosHab).onze[0].mancances, null,
      'un lloc sense ningú no té forat: té un buit, que és un altre senyal');
  },
  'P6.entrenables_n': async () => {
    const r = await est6();
    assert.equal(r.entrenables_max, 3, '3 llocs al 100% × (2 partits − 1)');
  },
  'P6.entrenables': async () => {
    const r = await est6();
    // Els millors en l'habilitat entrenada DELS QUE SOBREN. El 100 (creativitat 9) ja no hi
    // és: amb el policultiu se'n va a l'onze, perquè al lloc d'extrem la creativitat aporta
    // més que l'habilitat d'extrem mateixa (matriu de la guia §4) i cap dels vells la té.
    assert.deepEqual(r.entrenables.map((x) => x.id), [101, 102, 103],
      'els millors en l\'habilitat entrenada, i només dels que NO han entrat a l\'onze');
    const dins = new Set(r.onze.map((l) => l.jugador?.id));
    assert.ok(r.entrenables.every((x) => !dins.has(x.id)), 'ixen del residu, no es dupliquen');
  },
  'P6.cap_a_temps': async () => {
    // Un de 30 anys amb la mateixa creativitat que els joves NO entra: la pròxima pujada li
    // cau passat el límit, i un entrenable és per a vendre'l car quan haja crescut.
    const vell = j6(200, { sou: 500, edat_anys: 30, creativitat: 9 });
    const r = await onzeEstructura(dbFix, 1, [...VELLS6, vell], 10291);
    assert.ok(!r.entrenables.some((x) => x.id === 200), 'la pujada li cau passat el límit');
  },
  'P6.futur_entrenador': async () => {
    // EL PORTER SUPLENT TRIA ABANS. Un porter amb experiència se n'anava d'entrenador i el
    // sistema es quedava sense porteria per a l'onze_B, dient «et falta un porter suplent»
    // mentres l'alineació el posava sota pals.
    const porterExpert = [...VELLS6, j6(306, { porteria: 6, experiencia: 8, sou: 300 })];
    const rp = await onzeEstructura(dbFix, 1, porterExpert, 10291);
    assert.equal(rp.porter_suplent?.id, 306, "la porteria és obligació; l'entrenador, oportunitat");
    assert.notEqual(rp.futur_entrenador?.id, 306, 'i no pot ser les dues coses alhora');
    const r = await est6();
    assert.equal(r.futur_entrenador, null,
      'amb experiència per davall del primer esglaó de la taula, no s\'assenyala ningú');
    const ambExp = [...VELLS6.map((x) => ({ ...x, experiencia: 1 })),
      { ...j6(300, { sou: 500 }), experiencia: 7, lideratge: 4 }];
    const r2 = await onzeEstructura(dbFix, 1, ambExp, 10291);
    assert.equal(r2.futur_entrenador?.id, 300, 'el del residu amb més experiència');
  },
  'P6.porter_suplent': async () => {
    const r = await est6();
    // Cap dels sobrants arriba al llindar de porteria.
    assert.equal(r.porter_suplent, null);
    const ambPorter = [...VELLS6, j6(301, { porteria: 6, sou: 700 }), j6(302, { porteria: 5, sou: 300 })];
    const r2 = await onzeEstructura(dbFix, 1, ambPorter, 10291);
    assert.equal(r2.porter_suplent?.id, 302, 'entre els que arriben, mana el SOU: eixe lloc no compra res');
    // UN LLINDAR, no una deducció: qui llança faltes seguix sent porter. Abans es demanava la
    // porteria per damunt de TOTES les altres i este se n'anava a venda mentres la mateixa
    // pantalla demanava comprar un porter suplent.
    const faltes = [...VELLS6, j6(304, { porteria: 5, pilota_aturada: 7, sou: 300 })];
    assert.equal((await onzeEstructura(dbFix, 1, faltes, 10291)).porter_suplent?.id, 304,
      'la pilota aturada alta no el desqualifica: només mira la porteria');
    // I per davall del llindar, no.
    const fluix = [...VELLS6, j6(305, { porteria: 1, sou: 100 })];
    assert.equal((await onzeEstructura(dbFix, 1, fluix, 10291)).porter_suplent, null,
      'porteria 1 no és un porter, és un descart');
  },
  'P6.venda': async () => {
    const r = await est6();
    const tots = new Set([...r.onze.map((l) => l.jugador?.id).filter(Boolean),
      ...r.entrenables.map((x) => x.id), ...r.venda.map((x) => x.id), ...r.despatxar.map((x) => x.id),
      ...(r.futur_entrenador ? [r.futur_entrenador.id] : []),
      ...(r.porter_suplent ? [r.porter_suplent.id] : [])]);
    assert.equal(tots.size, VELLS6.length + JOVES6.length, 'tots els jugadors caben en un grup i només un');
    assert.ok(r.venda.length > 0, 'i qui no ocupa cap lloc del pla se\'n va');
  },
  'P6.despatxar': async () => {
    const r = await est6();
    // Sense cap subhasta deserta desada, ningú va a despatxar: és un FET, no una previsió.
    assert.deepEqual(r.despatxar, []);
  },
  // P6.aturats / P6.onze_2 — DUES PASSADES: qui hauria de jugar i qui juga. La diferència és
  // la secció de lesionats i sancionats. Ací es prova la LÒGICA; que la columna
  // `amonestacions` arribe de veres fins ací ho prova `pantalles_pinten` contra l'API, que és
  // on va nàixer el forat: el camp no estava al SELECT i la sanció era invisible.
  'P6.aturats': async () => {
    const llindar = Number((await dbFix.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau='amonestacions_suspensio'").first()).valor);
    const e = await est6();
    const titular = e.onze.find((l) => l.jugador)?.jugador;
    assert.ok(titular, 'el fixture ha de tindre onze amb ocupants');
    assert.deepEqual(e.aturats, [], 'sense lesions ni sancions, cap aturat');
    // La MATEIXA plantilla amb eixe titular sancionat: ix de l'onze i entra als aturats.
    const sancionat = await onzeEstructura(dbFix, 1,
      [...VELLS6, ...JOVES6].map((j) => (j.id === titular.id ? { ...j, amonestacions: llindar } : j)), 10291);
    assert.deepEqual(sancionat.aturats.map((j) => j.id), [titular.id],
      'el sancionat que anava a l\'onze passa a la llista dels que no hi poden estar');
    assert.ok(!sancionat.onze.some((l) => l.jugador?.id === titular.id), 'i deixa el lloc');
    assert.equal(sancionat.onze.filter((l) => l.jugador).length, e.onze.filter((l) => l.jugador).length,
      'que se\'l queda el següent: l\'onze no es queda coix');
    // Una GROGA no és una sanció.
    const groga = await onzeEstructura(dbFix, 1,
      [...VELLS6, ...JOVES6].map((j) => (j.id === titular.id ? { ...j, amonestacions: llindar - 1 } : j)), 10291);
    assert.deepEqual(groga.aturats, [], 'per davall del llindar no passa res');
  },
  'P6.onze_2': () => assert.ok(true, 'vore P6.aturats: les dues passades es proven juntes'),

  'P6.grup': async () => {
    const r = await est6();
    const compta = new Map();
    for (const g of r.grups.values()) compta.set(g, (compta.get(g) ?? 0) + 1);
    assert.equal(compta.get('onze'), 11, 'els onze ocupants porten el grup «onze»');
    assert.equal(compta.get('entrenable'), r.entrenables.length);
    assert.equal([...r.grups.keys()].length, new Set(r.grups.keys()).size, 'un jugador, un grup');
  },
  'P6.entrenen': async () => {
    const r = await est6();
    const dels100 = r.onze.filter((l) => l.entrena && l.jugador).map((l) => l.jugador.id);
    assert.deepEqual([...r.entrenen].sort((a, b) => a - b),
      [...new Set([...dels100, ...r.entrenables.map((x) => x.id)])].sort((a, b) => a - b),
      'ocupants dels llocs que entrenen ∪ entrenables');
  },

  // PAS 7 — vendre. SENSE estimació de preu (v3.1): la subhasta decidix.
  'P7.urgent': () => {
    assert.equal(esUrgent(10, 14), true);
    assert.equal(esUrgent(20, 14), false);
  },
  'P7.motiu_venda': () => {
    assert.equal(motiuVenda({}, { esRotatiu: true, temporada: 86, horitzo_eixida: 85 }), 'pic_de_valor');
    assert.equal(motiuVenda({}, { sobrecost: 500, calibrat: true }), 'sou_desproporcionat');
    assert.equal(motiuVenda({}, { enVenda: true }), 'sobrant');
    assert.equal(motiuVenda({}, {}), null);
    // EL STOPPER: sense calibrar, cap venda per sou. `sobrecost` penja del flux, i el flux amb
    // poques setmanes és soroll. Els altres dos motius no en depenen i seguixen vius.
    assert.equal(motiuVenda({}, { sobrecost: 99999, calibrat: false }), null,
      'sense calibrar, el sou no desfà de ningú');
    assert.equal(motiuVenda({}, { enVenda: true, calibrat: false }), 'sobrant',
      'el sobrant va per estructura: no depén del flux');
  },
  // v3.1: NOMÉS sobrecost. El segon criteri era `preu_esperat DESC`, una xifra inventada.
  'P7.ordre_venda': () => assert.deepEqual(ordreVenda([
    { id: 'a', sobrecost: 0 }, { id: 'b', sobrecost: 7 },
  ]).map((x) => x.id), ['b', 'a']),
  'P7.desti': () => {
    assert.equal(desti({}, { lesionat: true }).accio, 'agenda_llistar_en_recuperar');
    // El bug d'unitats que el full corregix: en enters, la branca era inassolible.
    assert.equal(desti({}, { modificador_tancament: -0.15, depressio_profunda: -20 }).accio, 'llista_hui');
    assert.equal(desti({}, { modificador_tancament: -0.25, depressio_profunda: -0.20 }).accio, 'agenda_llistar');
    // Cap combinació proposa despatxar: això ja no el decidix una previsió de preu (v3.1).
    for (const o of [{}, { urgent: true }, { modificador_tancament: -0.9, depressio_profunda: -0.2 }]) {
      assert.notEqual(desti({}, o).accio, 'despatxa', 'el destí ja no despatxa per una estimació');
    }
  },

  // PAS 9 — les alineacions, greedy per pes.
  'P9.buit': () => {
    const LL = [{ lloc: 'a', bucket: 'defensa', entrena: false, habilitat: 'defensa', pes: 1 }];
    const { onze } = assignaEstructura([], LL);
    assert.equal(onze[0].jugador, null, 'sense ningú, el lloc queda buit i es declara');
  },
  'P12.nivell': () => {
    const LL = { llindar_urgent: 70, llindar_aviat: 55 };
    assert.equal(nivellAccio(70, LL), 'urgent');
    assert.equal(nivellAccio(69, LL), 'aviat');
    assert.equal(nivellAccio(54, LL), 'normal');
    assert.equal(nivellAccio(90, {}), 'normal', 'sense llindes declarades no s\'inventa alarma');
  },
  'P12.alertes': () => {
    const g = agrupaAlertes([{ tipus: 'a', urgencia: 40 }, { tipus: 'a', urgencia: 72 }, { tipus: 'b', urgencia: 60 }],
      { llindar_urgent: 70, llindar_aviat: 55 });
    assert.equal(g.length, 2, 'una línia per TIPUS');
    assert.equal(g[0].tipus, 'a');
    assert.equal(g[0].urgencia, 72, 'ordenades per urgència DESC');
    assert.deepEqual(agrupaAlertes([], {}), [], '«de moment res» no és una alerta');
  },
  'P12.agenda': () => assert.deepEqual(
    ordenaAgenda([{ data_accio: '2026-08-03' }, { data_accio: '2026-07-28' }]).map((x) => x.data_accio),
    ['2026-07-28', '2026-08-03'], 'per data'),

  // PAS 8 — el bucle d'estoc: L'ESTADI VA PRIMER i no es puntua (v3.1).
  'P8.cost': () => assert.equal(eficiencia(4.5, 50000), 0.00009, 'guany/cost'),
  'P8.admissible': () => {
    assert.equal(admissibleJugador({ preu: 50000, sou: 900 }, { caixa: 100000, pressupost_sou_lloc: 1000 }), true);
    assert.equal(admissibleJugador({ preu: 150000 }, { caixa: 100000 }), false, 'cap compra amb diners no cobrats');
    assert.equal(admissibleJugador({ preu: 50000, sou: 5000 }, { caixa: 100000, pressupost_sou_lloc: 1000 }), false);
  },
  'P8.manteniment': () => assert.equal(deltaManteniment(7100, 9000), 1900,
    'Δmanteniment = el que l\'obra AFIG cada setmana'),
  'P8.admissible_2': () => {
    assert.equal(admissibleEstadi({ cost: 50000, caixa: 100000, flux: 10000,
      delta_manteniment: 1000, setmanes_periode: 2, reserva_flux: 5000 }), true);
    assert.equal(admissibleEstadi({ cost: 50000, caixa: 100000, flux: 10000,
      delta_manteniment: 3000, setmanes_periode: 2, reserva_flux: 5000 }), false,
      'cap obra que es menge la reserva de flux');
    // La propietat que el model anterior feia impossible: AMPLIAR (Δmanteniment > 0) ha de
    // poder passar. Abans el guany de l'obra era 0 sempre que s'ampliara.
    assert.equal(admissibleEstadi({ cost: 10000, caixa: 999999, flux: 100000,
      delta_manteniment: 5000, setmanes_periode: 2, reserva_flux: 0 }), true,
      'ampliar l\'estadi ha de poder ser admissible');
  },
  'P8.accio_2': () => {
    // PRIORITAT ABSOLUTA: l'estadi va abans que el millor fitxatge possible.
    const t = decisioEstoc([
      { tipus: 'estadi', admissible: true, caduc: false, eficiencia: null },
      { tipus: 'jugador', id: 'bo', admissible: true, eficiencia: 9e9, guany: 9 },
    ]);
    assert.equal(t.tipus, 'estadi', 'l\'estadi no competix: va primer');
    assert.equal(decisioEstoc([{ tipus: 'jugador', admissible: false, eficiencia: 1 }]), null,
      'sense opció admissible, cap compra: només es ven');
  },

  // PAS 11 — el personal és bucle de FLUX: DUES bases (v3.1), mana la prioritat.
  'P11.cost_flux': () => {
    assert.deepEqual([1, 2, 3, 4, 5].map((n) => costFlux(n, 1020)),
      [1020, 2040, 4080, 8160, 16320], 'especialistes: base 1.020');
    assert.deepEqual([1, 2, 3, 4, 5].map((n) => costFlux(n, 1250)),
      [1250, 2500, 5000, 10000, 20000], 'entrenador: base 1.250');
    // El fixture real de HT: 3 especialistes de nivell 2 + entrenador de nivell 3 = 11.120 €.
    assert.equal(costFlux(2, 1020) * 3 + costFlux(3, 1250), 11120,
      'la xifra exacta de l\'informe — amb una sola base era impossible');
  },
  'P11.cost_flux#base': () => {
    const pri = [{ tipus: 'assistent', quants: 2 }, { tipus: 'entrenador', base: 1250 }];
    assert.equal(baseTipusG1('entrenador', pri, 1020), 1250, 'l\'entrenador porta la seua base');
    assert.equal(baseTipusG1('assistent', pri, 1020), 1020, 'els altres, la de defecte');
  },
  'P11.nivell': () => {
    assert.equal(nivellPagable(16320, 1020), 5);
    assert.equal(nivellPagable(16319, 1020), 4);
    assert.equal(nivellPagable(1019, 1020), 0, 'si no arriba al primer, cap');
  },
  'P11.places': () => {
    // AMPLADA ABANS QUE PROFUNDITAT: efecte lineal, cost exponencial. Les places de la quota
    // s'omplin TOTES al mateix nivell. El repartiment voraç d'abans (el primer s'enduia el
    // màxim) deixava l'entrenador i el metge a zero.
    const p = [{ tipus: 'assistent', quants: 2 }, { tipus: 'metge' }, { tipus: 'psicoleg' },
      { tipus: 'forma' }, { tipus: 'tactic' }, { tipus: 'financer' }];
    const q = { total: 4, per_tipus: { assistent: 2, metge: 1, psicoleg: 1, forma: 1, tactic: 1, financer: 1 } };
    const r = planPersonal(30000, 1020, p, { quotes: q });
    assert.deepEqual(r.pla.map((x) => x.tipus), ['assistent', 'assistent', 'metge', 'psicoleg'],
      'la quota del joc: 4 places, 2 assistents, per orde de prioritat');
    assert.deepEqual(r.pla.map((x) => x.nivell), [3, 3, 3, 3],
      'totes al mateix nivell: cap plaça a zero mentre una altra puja');
    assert.ok(r.flux_restant >= 0, 'mai es compromet més flux del que hi ha');
  },
  'P11.renovar': () => {
    assert.deepEqual(decisioRenovacio(3, 5000, 1020), { accio: 'renova', nivell: 3 });
    assert.deepEqual(decisioRenovacio(4, 5000, 1020), { accio: 'renova_al_nivell', nivell: 3 });
    assert.deepEqual(decisioRenovacio(2, 100, 1020), { accio: 'no_renoves', nivell: null });
  },

};

// DIVERGÈNCIES CONFIRMADES: el codi actual NO fa el que diu el full. Cada entrada assegura
// que la divergència SEGUIX vigent; quan un lot la corregisca, este test avisarà que cal
// promoure-la a VERIFICADES. Així la divergència no es dilueix entre les pendents.
// DIVERGÈNCIES CONFIRMADES: el codi no fa el que diu el full. Cap vigent ara mateix.
const DIVERGENTS = {};

// Una fórmula pot tindre més d'una comprovació: `id#aspecte`. El compte va per fórmula.
const base = (id) => id.split('#')[0];
const cobertes = new Set();
for (const [id, prova] of Object.entries(VERIFICADES)) {
  assert.ok(formules.some((f) => f.id === base(id)),
    `id verificat que ja NO és al full (lleva'l del G1): ${id}`);
  await prova();
  cobertes.add(base(id));
}
const verificades = cobertes.size;

const pendents = formules.filter((f) => !cobertes.has(f.id));
assert.equal(verificades + pendents.length, formules.length, 'forat: ni verificada ni pendent');

// Pendents per pas: visibles, mai en silenci.
const perPas = {};
for (const f of pendents) perPas[f.pas] = (perPas[f.pas] || 0) + 1;
console.log(`OK — G1 contracte-full (v3): ${verificades} verificades (avaluador=referència), ${pendents.length} PENDENTS declarades.`);
for (const [id, prova] of Object.entries(DIVERGENTS)) {
  const base = id.split('#')[0];
  assert.ok(formules.some((f) => f.id === base), `divergència sobre un id inexistent: ${base}`);
  console.log(`  DIVERGENT vigent: ${id} — ${prova()}`);
}
if (pendents.length) console.log(`  pendents per pas: ${Object.entries(perPas).map(([p, n]) => `${p}:${n}`).join(' ')}`);
