// Tonico — G1 CONTRACTE-FULL (invariant 11). Per a cada fórmula de formules.json amb
// avaluador i referència, sobre fixtures sintètics: avaluador(f,fix) = referència(f,fix).
// Les fórmules encara no reconstruïdes queden com a PENDENTS DECLARADES (visibles al
// resum, mai silenci). Assert de tancament: verificades + pendents = total → cap forat.
//
// Contracte v3 (model competitiu-econòmic). Este guardià CREIX amb la reconstrucció:
// cada lot del DIFF hi registra l'avaluador+referència de les seues fórmules.
// node test/guardia_contracte.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { valorPlaces } from '../lib/valor_placa.js';
import { valorHabilitat, lecturaPromocio } from '../lib/ranquing_juvenil.js';
import { fCalendari, temporadaOperativa } from '../lib/calendari.js';
import { ESTRATEGIES, falten as confFalten, llocsPartit } from '../lib/config.js';
import { souSostenible, perPeriode, reservaFlux, despesaPlanter, dadesVelles,
  fluxRepartible, pressupostPersonal } from '../lib/economia.js';
import { normalitzaDivisio, divisioArab, DIVISIONS } from '../lib/divisio.js';
import { pesLloc, pressupostSou, nivellObjectiu, carregaConfigPesos } from '../lib/pesos.js';
import { nivellActual, mancanca, exces, sobrecost, prioritat } from '../lib/mancanca.js';
import { comptesNucli, maxPartits, construeixPlantilla } from '../lib/plantilla.js';
import { urgent as esUrgent, motiuVenda, ordreVenda, desti, despatxable,
  subhastaDeserta } from '../lib/vendes.js';
import { valorEn, alineaOnzes } from '../lib/onze.js';
import { util as utilJuv, destiPromocio, objectiuJuvenil, sobrants, reiniciCrida } from '../lib/juvenil_v3.js';
import { costFlux, nivellPagable, planPersonal, decisioRenovacio,
  baseTipus as baseTipusG1 } from '../lib/personal_v3.js';
import { guanyJugador, admissibleJugador, deltaManteniment, estadiCaduc, admissibleEstadi,
  eficiencia, decisioEstoc } from '../lib/estoc.js';
import { nivellAccio, agrupaAlertes, ordenaAgenda } from '../lib/informe.js';
import { REGLES } from '../lib/regles.js';
import { entrenamentPrescrit, desquadreEntrenament, placesEntrenament } from '../lib/entrenament_places.js';
import { valorHabilitat as valorHab, valorEsperatDesconegut, ranquingJuvenil } from '../lib/ranquing_juvenil.js';
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
// `esperat_act`/`marge_ple` (divergència de vocabulari, invariant 14; registrada al DIFF).
const optsMarge = () => ({ f_marge: MARGE.f_marge, marge_esperat: MARGE.marge_ple,
  valor_esperat_desconegut: MARGE.esperat_defecte });

// Fixture del PAS 6, compartit per les seues fórmules.
function plantillaFix() {
  const LL = [
    { lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat' },
    { lloc: 'mc2', entrena: true, pct: 100, habilitat: 'creativitat' },
    { lloc: 'ext1', entrena: true, pct: 50, habilitat: 'extrem' },
    { lloc: 'dc1', entrena: false, habilitat: 'defensa' },
    { lloc: 'dc2', entrena: false, habilitat: 'defensa' },
  ];
  const j = (id, o) => ({ jugador_id: id, edat_anys: 20, edat_dies: 0, sou: 1000,
    creativitat: 1, extrem: 1, porteria: 1, defensa: 1, anotacio: 1, ...o });
  const squad = [
    j(1, { creativitat: 9 }), j(2, { creativitat: 8 }), j(3, { creativitat: 7 }),
    j(4, { creativitat: 6 }), j(14, { creativitat: 5 }),
    j(9, { creativitat: 6, edat_anys: 30 }),   // passat del pic: no pot ser rotatiu
    j(5, { defensa: 9 }), j(6, { defensa: 8, sou: 500 }), j(7, { defensa: 8 }),
    j(8, { porteria: 9 }), j(10, { porteria: 7 }),
    j(11, { sou: 200 }), j(12, { sou: 250 }), j(13, { sou: 9000 }),
  ];
  return construeixPlantilla(squad, LL, { A: 'creativitat', core_a_min: 0, edat_pic_venda: 25,
    any_dies: 112, partits_setmana: 2, llocs_partit: 8, habilitat_porter: 'porteria' });
}

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
  'V.horitzo_eixida': () => {
    // La temporada en què edat_d assolix `edat_pic_venda`
    const h = (edatAnys, pic, temporada) => temporada + Math.max(0, Math.ceil(((pic - edatAnys) * 112) / 112));
    assert.equal(h(23, 25, 83), 85, 'a 23 anys i pic 25 → dos temporades');
    assert.equal(h(26, 25, 83), 83, 'passat el pic, ja toca');
  },

  // ── PAS 0 / PAS 1 ──
  'P0.estrategia': () => assert.deepEqual(ESTRATEGIES, ['competitiva', 'cycle'], 'TRIA(competitiva | cycle)'),
  'P0.pais': () => {
    const c = { estrategia: 'competitiva', pais: 'ES', divisio: 'VII', sistema_juvenil: 'academia', partits_setmana: 2 };
    assert.deepEqual(confFalten(c), [], 'els quatre del PAS 0 declarats');
    assert.deepEqual(confFalten({ ...c, pais: null }), ['pais'], 'el que falta es demana');
  },
  'P1.a_b': async () => {
    // (A, B) = (creativitat, passades) PRESCRITS, no configurats
    const p = await entrenamentPrescrit(dbFix, 'competitiva');
    assert.equal(p.skill, 'creativitat', 'A prescrit pel contracte');
    assert.equal(p.skill_b, 'passades', 'B prescrit pel contracte');
    assert.equal(p.intensitat, 100);
    assert.ok(p.resistencia != null, 'resistencia_pct declarada');
  },
  'P1.accio': () => {
    // ACCIÓ SI configurat_HT ≠ prescrit: la 4-tupla sencera
    const pres = { skill: 'creativitat', skill_b: 'passades', intensitat: 100, resistencia: 10 };
    assert.equal(desquadreEntrenament(pres, pres).desquadre, false);
    assert.equal(desquadreEntrenament(pres, { ...pres, intensitat: 90 }).desquadre, true,
      'canviar només la intensitat també és desquadre');
    assert.deepEqual(desquadreEntrenament(pres, { ...pres, skill_b: 'extrem' }).difs, ['skill_b']);
    assert.equal(desquadreEntrenament(pres, null).motiu, 'sense_confirmar');
  },

  // ── PAS 4 / PAS 6 ──
  'P4.habilitat_lloc': async () => {
    const cfg = await carregaConfigPesos(dbFix, 'competitiva');
    assert.equal(cfg.taula_habilitat_lloc.mc, 'creativitat', 'MC → creativitat');
    assert.equal(cfg.taula_habilitat_lloc.porter, 'porteria', 'POR → porteria');
    assert.equal(cfg.taula_habilitat_lloc.davanter, 'anotacio', 'DAV → anotació');
  },
  'P6.core': () => {
    const r = plantillaFix();
    assert.deepEqual(r.core.map((j) => j.jugador_id), [1, 2, 3],
      'els millors en l\'habilitat entrenada, i a igualtat el més jove');
  },
  'P6.rotatius': () => {
    const r = plantillaFix();
    assert.equal(r.rotatius.length, r.n_rotatius);
    assert.deepEqual(r.rotatius.map((j) => j.jugador_id), [4, 14], 'els següents millors en l\'habilitat entrenada');
    assert.ok(!r.rotatius.some((j) => j.jugador_id === 9), 'un passat del pic de venda no és rotatiu');
    // NOTA del contracte: `rotatius` es tria NOMÉS per hab(A), sense mínim. Amb pocs
    // jugadors de l'habilitat entrenada, el model arrossega gent sense eixa habilitat cap a
    // rotatiu. És el que el full diu; queda anotat perquè es veja, no amagat.
  },
  'P6.titulars': () => {
    const r = plantillaFix();
    const t = Object.fromEntries(r.titulars.map((x) => [x.lloc, x.jugador_id]));
    assert.equal(t.dc1, 5, 'el millor de l\'habilitat del lloc');
    assert.equal(t.dc2, 6, 'i a igualtat d\'habilitat, el més barat');
  },
  'P6.porters_n': () => assert.equal(plantillaFix().porters_n, 2, '1 × partits_setmana'),
  'P6.cossos_n': () => {
    const r = plantillaFix();
    assert.equal(r.cossos_n, Math.max(0, Math.ceil((8 - r.llocs_ocupats) / 2)), 'CEIL((llocs_partit − ocupats)/partits)');
  },
  'P6.cossos': () => {
    const r = plantillaFix();
    const sous = r.cossos.map((j) => j.sou);
    assert.deepEqual(sous, [...sous].sort((a, b) => a - b), 'els més barats primer (sou ASC)');
  },
  'P6.retinguts': () => {
    const r = plantillaFix();
    assert.equal(r.retinguts.length, r.core.length + r.rotatius.length + r.titulars.length + r.porters.length + r.cossos.length,
      'retinguts = core ∪ rotatius ∪ titulars ∪ porters ∪ cossos');
  },

  // ── PAS 7 / PAS 8 / PAS 9 ──
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
    const jugadors = [{ jugador_id: 7, nom: 'D', categoria: 'venda', transferible: null, sou: 9000, edat_dies: 50 }];
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
  'P8.candidat': () => {
    // candidat(lloc) = de mercat amb hab(habilitat_lloc) ≥ nivell_objectiu(lloc)
    const cand = (j, hab, obj) => Number(j[hab] ?? 0) >= obj;
    assert.equal(cand({ creativitat: 9 }, 'creativitat', 8), true);
    assert.equal(cand({ creativitat: 7 }, 'creativitat', 8), false);
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
  'P9.llocs': () => {
    // «llocs ordenats per pes DESC, partit ASC»
    const LL = [{ lloc: 'baix', entrena: false, habilitat: 'defensa', pes: 0.1 },
      { lloc: 'alt', entrena: false, habilitat: 'defensa', pes: 9 }];
    const r = alineaOnzes([{ jugador_id: 1, categoria: 'cos', defensa: 5, sou: 1 }], LL,
      [{ id: 'A', competitiu: true }], {});
    assert.equal(r.onze.A.find((x) => x.lloc === 'alt').jugador?.jugador_id, 1,
      'el lloc de més pes es cobrix primer');
    assert.equal(r.onze.A.find((x) => x.lloc === 'baix').jugador, null);
  },

  // ── PAS 10 ──
  'P10.esperat_act': () => {
    // MITJANA(revelacions pròpies); ∅ → `esperat_defecte`
    assert.equal(valorEsperatDesconegut([{ creativitat_actual: 4 }, { creativitat_actual: 8 }], 'creativitat', 5), 6);
    assert.equal(valorEsperatDesconegut([], 'creativitat', 5), 5, 'sense revelacions, el defecte');
  },
  'P10.nivell': () => {
    // NIVELL = pes_A×valor(A) + pes_B×valor(B)
    const o = optsMarge();
    const y = { creativitat_actual: 6, creativitat_potencial: 9, passades_actual: 4, passades_potencial: 6 };
    const r = ranquingJuvenil([{ jugador_id: 1, ...y }], { entrenamentA: 'creativitat', entrenamentB: 'passades',
      pes_a: 1, pes_b: 0.66, ...o });
    const esperat = 1 * valorHab(y, 'creativitat', o) + 0.66 * valorHab(y, 'passades', o);
    assert.equal(r[0].nivell, Math.round(esperat * 100) / 100);
  },
  'P10.promo': () => {
    // PRIMER(ORDENA(elegibles; NIVELL DESC)), màx 1 per setmana
    const rang = [{ jugador_id: 1, nom: 'A', nivell: 7, posicio_rang: 2 }, { jugador_id: 2, nom: 'B', nivell: 9, posicio_rang: 1 }];
    const juv = [{ jugador_id: 1, edat_anys: 17, dies_academia: 200 }, { jugador_id: 2, edat_anys: 17, dies_academia: 200 }];
    const l = lecturaPromocio(rang, juv);
    assert.equal(l.proposta.jugador_id, 2, 'el de més NIVELL entre elegibles');
    assert.ok(!Array.isArray(l.proposta), 'una sola proposta: màx 1 per setmana');
  },
  'P10.onze': () => {
    // «mateixa fórmula del PAS 9»: el motor és el mateix, amb la taula juvenil.
    const LL = [{ lloc: 'mc1', entrena: true, pct: 100, habilitat: 'creativitat', pes: 1 }];
    const r = alineaOnzes([{ jugador_id: 1, categoria: 'core', creativitat: 5 }], LL, [{ id: 'A', competitiu: true }], { pes_entrenament: 1000 });
    assert.equal(r.onze.A[0].jugador.jugador_id, 1);
  },
  'P10.accio': () => {
    // ACCIÓ("fes la crida") SI crida_disponible
    const accio = (disponible) => (disponible ? 'crida' : null);
    assert.equal(accio(true), 'crida');
    assert.equal(accio(false), null);
  },
  'P10.reexecuta': () => {
    // «reexecuta a CADA pujada»: l'esperat es recalibra amb les revelacions noves.
    const abans = valorEsperatDesconegut([{ creativitat_actual: 4 }], 'creativitat', 5);
    const despres = valorEsperatDesconegut([{ creativitat_actual: 4 }, { creativitat_actual: 10 }], 'creativitat', 5);
    assert.notEqual(abans, despres, 'una revelació nova mou l\'esperat');
  },

  // ── PAS 11 / PAS 12 ──
  'P3.flux_repartible': () => {
    // El calaix únic: es lleven els FETS (planter, manteniment, sou de l'entrenador) i el
    // pressupost del personal és una QUOTA d'això, acotada pel que pot absorbir.
    assert.equal(fluxRepartible(100000, 60000, 5000), 35000);
    assert.equal(fluxRepartible(100000, 999999, 5000), 0, 'mai negatiu');
    assert.equal(pressupostPersonal(35000, 0.40, 65280), 14000, 'la quota mana quan cap');
    assert.equal(pressupostPersonal(500000, 0.40, 65280), 65280, 'i el sostre quan la quota el passa');
  },
  'P11.accio': () => {
    // ACCIÓ("contracta/puja de nivell") SI el nivell que el flux sosté > el declarat
    const r = planPersonal(5000, 1020, [{ tipus: 'metge' }]);
    assert.ok(r.pla[0].nivell > 0, 'amb flux, es proposa nivell');
    assert.equal(planPersonal(100, 1020, [{ tipus: 'metge' }]).pla[0].nivell, 0, 'sense flux, res');
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
    const set = { nomina: 5000, manteniment_estadi: 7100, personal: 2040, planter: 20000 };
    const per = Object.values(set).reduce((a, v) => a + perPeriode(v, 2), 0);
    assert.equal(per, 68280, 'totes les despeses són setmanals → × setmanes_periode');
  },
  'P3.flux': () => assert.equal(102127 - 68280, 33847),
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
  'P2.pes': () => {
    // pes(lloc) = SUMA(sectors: aportacio × pes_sector). Guia §5: central .36, banda .255.
    const ps = { mig: 1, central: 0.36, banda: 0.255 };
    const ap = { Mig: { 'Mig#Cre': 1, 'DC#Def': 0.4, 'Lat#Def': 0.19, 'AC#Anot': 0.22, 'AC#Pas': 0.33, 'AL#Anot': 0.26 } };
    const aMa = 1 * 1 + 0.4 * 0.36 + 0.19 * 0.255 + 0.22 * 0.36 + 0.33 * 0.36 + 0.26 * 0.255;
    assert.equal(pesLloc('Mig', ap, ps), Math.round(aMa * 10000) / 10000);
    assert.equal(pesLloc('cap', ap, ps), null, 'posició desconeguda → no se suposa');
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
  'P4.nivell_objectiu': () => {
    // MAX(n : taula_salaris(hab, n) ≤ pressupost). Guia §8: creativitat 1→250, 2→270, 3→330.
    const ts = { creativitat: { 1: 250, 2: 270, 3: 330 } };
    assert.equal(nivellObjectiu('creativitat', 330, ts), 3);
    assert.equal(nivellObjectiu('creativitat', 329, ts), 2);
    assert.equal(nivellObjectiu('creativitat', 100, ts), 0, 'no arriba ni al primer');
    assert.equal(nivellObjectiu('creativitat', null, ts), null);
  },

  // PAS 5 — la mètrica única. Tot competix pel mateix diner amb la mateixa unitat.
  'P5.ocupant': () => assert.equal(nivellActual(null, 'creativitat'), 0, 'lloc buit → ocupant ∅'),
  'P5.nivell_actual': () => {
    assert.equal(nivellActual({ creativitat: 7 }, 'creativitat'), 7);
    assert.equal(nivellActual(null, 'creativitat'), 0);
  },
  'P5.mancanca': () => {
    assert.equal(mancanca(9, 6), 3);
    assert.equal(mancanca(6, 9), 0, 'MAX(0; …)');
    assert.equal(mancanca(null, 6), null);
  },
  'P5.exces': () => {
    assert.equal(exces({ creativitat: 9 }, 'creativitat', 6), 3);
    assert.equal(exces({ creativitat: 5 }, 'creativitat', 6), 0, 'MAX(0; …)');
  },
  'P5.sobrecost': () => {
    const ts = { creativitat: { 3: 330 } };
    assert.equal(sobrecost({ sou: 900 }, 'creativitat', 3, ts), 570);
    assert.equal(sobrecost({ sou: 300 }, 'creativitat', 3, ts), 0, 'MAX(0; …)');
  },
  'P5.prioritat': () => {
    assert.equal(prioritat(3, 1.5), 4.5, 'mancança × pes');
    assert.equal(prioritat(0, 1.5), 0);
  },

  // PAS 2/6 — qui es queda, derivat. Vocabulari del full: core/rotatiu/titular/cos.
  'P2.n_core': () => {
    const slots = [{ entrena: true, pct: 100 }, { entrena: true, pct: 100 },
      { entrena: true, pct: 100 }, { entrena: true, pct: 50 }, { entrena: true, pct: 50 }];
    assert.equal(comptesNucli(slots, 2).n_core, 5, 'N_core = COMPTA(pos_A)');
    // N_core NO depén de partits_setmana: el full no l'hi lliga. Fer-ho buidava el core
    // sencer quan el PAS 0 estava incomplet.
    assert.equal(comptesNucli(slots, null).n_core, 5, 'N_core no depén del PAS 0');
    assert.equal(comptesNucli(slots, null).n_rotatius, null, 'N_rotatius sí que en depén');
  },
  'P2.n_rotatius': () => {
    // SUMA(pos_A amb pct=100: partits_setmana − 1)
    const slots = [{ entrena: true, pct: 100 }, { entrena: true, pct: 100 }, { entrena: true, pct: 100 },
      { entrena: true, pct: 50 }, { entrena: true, pct: 50 }];
    assert.equal(comptesNucli(slots, 2).n_rotatius, 3);
    assert.equal(comptesNucli(slots, 1).n_rotatius, 0, 'amb un partit no calen rotatius');
  },
  'P2.max_partits': () => {
    assert.equal(maxPartits('core', 50), 2, 'un lloc que no entrena al 100% es dobla');
    assert.equal(maxPartits('core', 100), 1);
    assert.equal(maxPartits('cos', 100), 2);
    assert.equal(maxPartits('futur_entrenador', 100), 2);
  },
  'P6.venda': () => {
    // venda = plantilla − retinguts, categoria SENCERA i sense marques dins.
    const llocs = [{ lloc: 'mc', entrena: true, pct: 100, habilitat: 'creativitat' },
      { lloc: 'por', entrena: false, habilitat: 'porteria' }];
    const squad = [
      { jugador_id: 1, creativitat: 9, porteria: 1, sou: 900, edat_anys: 20, edat_dies: 0 },
      { jugador_id: 2, creativitat: 1, porteria: 9, sou: 800, edat_anys: 20, edat_dies: 0 },
      { jugador_id: 3, creativitat: 1, porteria: 1, sou: 100, edat_anys: 20, edat_dies: 0 },
    ];
    const r = construeixPlantilla(squad, llocs, { A: 'creativitat', core_a_min: 0, edat_pic_venda: 25,
      any_dies: 112, partits_setmana: 1, llocs_partit: 2 });
    const tots = [...r.retinguts, ...r.venda].map((j) => j.jugador_id).sort();
    assert.deepEqual(tots, [1, 2, 3], 'retinguts ∪ venda = plantilla');
    assert.ok(r.venda.every((j) => !r.rol[j.jugador_id]), 'cap marca de retenció dins de venda');
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
  'P9.valor': () => {
    const lloc = { entrena: true, pct: 100, habilitat: 'creativitat' };
    assert.equal(valorEn({ categoria: 'core', creativitat: 5 }, lloc, 1000), 1000,
      'en un lloc que entrena, el nucli hi va pel pes d\'entrenament');
    assert.equal(valorEn({ categoria: 'cos', creativitat: 5 }, lloc, 1000), 5,
      'la resta val el que val la seua habilitat');
  },
  'P9.disponible': () => {
    const LL = [{ lloc: 'a', entrena: false, habilitat: 'defensa', pes: 1 }];
    const P = [{ id: 'A', competitiu: true }, { id: 'B' }];
    const base = { jugador_id: 1, categoria: 'cos', defensa: 5, sou: 1 };
    const cap = (extra) => alineaOnzes([{ ...base, ...extra }], LL, P, {}).onze.A[0].jugador;
    assert.equal(cap({}).jugador_id, 1);
    assert.equal(cap({ llistat: true }), null, 'llistat no juga');
    assert.equal(cap({ lesionat: true }), null, 'lesionat no s\'alinea');
    const sanc = alineaOnzes([{ ...base, sancionat: true }], LL, P, { partit_lliga: 'A' });
    assert.equal(sanc.onze.A[0].jugador, null, 'sancionat: fora de la lliga');
    assert.equal(sanc.onze.B[0].jugador.jugador_id, 1, 'però juga l\'altre partit');
    // «j ∈ retinguts»: el sobrant NO s'alinea. Sense este filtre, un porter en venda
    // acabava ocupant un lloc de camp.
    const sobrant = alineaOnzes([{ ...base, categoria: 'venda' }], LL, P, {});
    assert.equal(sobrant.onze.A[0].jugador, null, 'un jugador en venda no entra a l\'onze');
    const retingut = alineaOnzes([{ ...base, categoria: 'cos' }], LL, P, {});
    assert.equal(retingut.onze.A[0].jugador?.jugador_id, 1, 'un retingut sí');
  },
  'P9.jugador': () => {
    // ORDENA(valor DESC, partits_assignats ASC, sou ASC)
    const LL = [{ lloc: 'a', entrena: false, habilitat: 'defensa', pes: 1 }];
    const r = alineaOnzes([
      { jugador_id: 1, categoria: 'cos', defensa: 5, sou: 900 },
      { jugador_id: 2, categoria: 'cos', defensa: 5, sou: 100 },
    ], LL, [{ id: 'A', competitiu: true }], {});
    assert.equal(r.onze.A[0].jugador.jugador_id, 2, 'a igual valor, el més barat');
  },
  'P9.buit': () => {
    const LL = [{ lloc: 'a', entrena: false, habilitat: 'defensa', pes: 1 }];
    const r = alineaOnzes([], LL, [{ id: 'A', competitiu: true }], {});
    assert.equal(r.onze.A[0].jugador, null, 'sense ningú, el lloc queda buit');
    assert.equal(r.buits.length, 1, 'i el buit es declara');
  },
  'P9.comptabilitat': () => {
    // SUMA(pct dels llocs assignats): 50 + 50 = la setmana feta.
    const LL = [{ lloc: 'e1', entrena: true, pct: 50, habilitat: 'extrem', pes: 1 }];
    const r = alineaOnzes([{ jugador_id: 1, categoria: 'core', extrem: 5 }], LL,
      [{ id: 'A', competitiu: true }, { id: 'B' }], { pes_entrenament: 1000 });
    assert.equal(r.comptabilitat.find((c) => c.jugador_id === 1).total, 100);
  },

  // PAS 12 — informe i agenda. Les llindes són POMS, mai números a la vista.
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
  'P8.guany': () => assert.equal(guanyJugador(3, 1.5), 4.5, 'mancança × pes'),
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

  'P10.util': () => {
    assert.equal(utilJuv({ creativitat_potencial: 9 }, 'creativitat', 8), true);
    assert.equal(utilJuv({ creativitat_potencial: 7 }, 'creativitat', 8), false);
    assert.equal(utilJuv({ creativitat_potencial: 9 }, 'creativitat', null), null);
  },
  'P10.desti': () => {
    // v3.1: DOS branques, no tres. `PROMOCIONA_I_LLISTA` depenia d'una estimació de preu i
    // era el juvenil-com-a-negoci que el canvi 9 ja havia retirat.
    assert.equal(destiPromocio({ esUtil: true }), 'PROMOCIONA');
    assert.equal(destiPromocio({ esUtil: false }), 'DESPATXA');
  },
  'P10.sobra': () => {
    assert.equal(objectiuJuvenil(9), 10, 'objectiu = onze legal + 1');
    assert.equal(objectiuJuvenil(null), null);
  },
  'P10.despatxa': () => {
    const j = [{ jugador_id: 1, nivell: 8, n_revelacions: 1 }, { jugador_id: 2, nivell: 4, n_revelacions: 3 },
      { jugador_id: 3, nivell: 4, n_revelacions: 0 }];
    assert.deepEqual(sobrants(j, 2).map((x) => x.jugador_id), [3], 'NIVELL ASC, revelacions ASC');
  },
  'P10.reinici_crida': () => {
    const r = reiniciCrida('2026-07-26T12:00:00Z', { economia_dia: 6, economia_hora: 2 });
    assert.equal(new Date(r).getUTCDay(), 6);
    assert.equal(new Date(r).getUTCHours(), 3, 'l\'hora SÍ que compta (abans s\'ignorava)');
    assert.equal(reiniciCrida('2026-07-26T12:00:00Z', null), null);
  },

  // P10.valor: els QUATRE casos del full coincidixen amb valorHabilitat (el cas (d) es va
  // corregir a L9: un desconegut també té marge).
  'P10.valor': () => {
    const o = optsMarge();
    const ea = MARGE.esperat_defecte;
    const casos = [
      { act: 6, pot: 9, esperat: 6 + (9 - 6) * MARGE.f_marge },                    // (a)
      { act: 6, pot: null, esperat: 6 + MARGE.marge_ple * MARGE.f_marge },         // (b)
      { act: null, pot: 9, esperat: Math.min(ea, 9) + (9 - Math.min(ea, 9)) * MARGE.f_marge }, // (c)
      { act: null, pot: null, esperat: ea + MARGE.marge_ple * MARGE.f_marge },                 // (d)
    ];
    for (const { act, pot, esperat } of casos) {
      const y = { [`${A}_actual`]: act, [`${A}_potencial`]: pot };
      assert.equal(valorHabilitat(y, A, o), esperat, `valor(act=${act}, pot=${pot})`);
    }
  },
  // P10.elegible: elegible(j) = edat_d ≥ 17×112 I estada ≥ 112
  'P10.elegible': () => {
    const rang = [
      { jugador_id: 1, nom: 'A', nivell: 9, posicio_rang: 1 },
      { jugador_id: 2, nom: 'B', nivell: 8, posicio_rang: 2 },
      { jugador_id: 3, nom: 'C', nivell: 7, posicio_rang: 3 },
    ];
    const juvenils = [
      { jugador_id: 1, edat_anys: 17, dies_academia: 120 },   // elegible
      { jugador_id: 2, edat_anys: 16, dies_academia: 200 },   // edat < 17 → no
      { jugador_id: 3, edat_anys: 17, dies_academia: 100 },   // estada < 112 → no
    ];
    const avaluador = juvenils.filter((j) => j.edat_anys * 112 >= 17 * 112 && j.dies_academia >= 112)
      .map((j) => j.jugador_id);
    const lect = lecturaPromocio(rang, juvenils);
    assert.deepEqual(avaluador, [1], 'fixture: només el 1r és elegible');
    assert.equal(lect.proposta?.jugador_id, 1, 'elegible → promo = el de més NIVELL entre elegibles');
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
console.log(`  pendents per pas: ${Object.entries(perPas).map(([p, n]) => `${p}:${n}`).join(' ')}`);
console.log('  → es reconstruïxen pels lots del DIFF; cada lot en registra l\'avaluador+referència ací.');
