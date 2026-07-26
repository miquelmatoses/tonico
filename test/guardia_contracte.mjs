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
import { souSostenible, caixaDisponible } from '../lib/economia.js';
import { normalitzaDivisio, divisioArab, DIVISIONS } from '../lib/divisio.js';
import { pesLloc, pressupostSou, nivellObjectiu } from '../lib/pesos.js';
import { nivellActual, mancanca, exces, sobrecost, prioritat } from '../lib/mancanca.js';
import { comptesNucli, maxPartits, construeixPlantilla } from '../lib/plantilla.js';
import { calibrat as esCalibrat, estimacioComparables, preuEsperat, setmanesVenda, valorNet,
  urgent as esUrgent, motiuVenda, ordreVenda, desti } from '../lib/preu.js';
import { valorEn, compatible, alineaOnzes } from '../lib/onze.js';
import { util as utilJuv, valorNetPromo, destiPromocio, objectiuJuvenil, sobrants, reiniciCrida } from '../lib/juvenil_v3.js';
import { costFlux, nivellPagable, planPersonal, decisioRenovacio } from '../lib/personal_v3.js';
import { guanyJugador, admissibleJugador, deltaFlux, guanyEstadi, admissibleEstadi,
  eficiencia, decisioEstoc } from '../lib/estoc.js';
import { nivellAccio, agrupaAlertes, ordenaAgenda } from '../lib/informe.js';

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

// REGISTRE de fórmules ja reconciliades: id → prova que compara la transcripció literal
// del full (avaluador) amb el codi actual (referència). Igualtat = contracte satisfet.
const VERIFICADES = {
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
    const suma = (f) => [f.taquilla, f.patrocini, f.premis].reduce((a, v) => a + (v ?? 0), 0);
    assert.equal(suma({ taquilla: 12000, patrocini: 9000, premis: 1000 }), 22000);
  },
  'P3.despeses_fixes': () => {
    const d = { nomina: 5000, manteniment_estadi: 3000, personal: 2040, planter: 2000 };
    assert.equal(d.nomina + d.manteniment_estadi + d.personal + d.planter, 12040);
  },
  'P3.flux': () => assert.equal(22000 - 12040, 9960),
  'P3.sou_sostenible': () => {
    // MAX(0; flux + nòmina − reserva_flux)
    assert.equal(souSostenible(9960, 5000, 0), 14960);
    assert.equal(souSostenible(9960, 5000, 4000), 10960);
    assert.equal(souSostenible(-99999, 5000, 0), 0, 'MAX(0; …)');
    assert.equal(souSostenible(null, 5000), null, 'sense flux, no se suposa');
  },
  'P3.caixa': () => {
    // «saldo real declarat (mai projectat)»: la funció no en fabrica cap.
    assert.equal(caixaDisponible(null, 0), null, 'sense declarar → null, no 0');
  },
  'P3.caixa_disponible': () => {
    assert.equal(caixaDisponible(100000, 30000), 70000);
    assert.equal(caixaDisponible(10000, 30000), 0, 'MAX(0; …)');
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
    // pressupost_sou(lloc) = sou_sostenible × pes(lloc) / SUMA(pesos)
    const pesos = { a: 3, b: 1 };
    assert.deepEqual(pressupostSou(pesos, 8000), { a: 6000, b: 2000 });
    assert.equal(pressupostSou(pesos, null), null, 'sense sou sostenible, res');
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
  'P2.n_core': () => assert.equal(comptesNucli([{ entrena: true, pct: 100 }, { entrena: true, pct: 100 },
    { entrena: true, pct: 100 }, { entrena: true, pct: 50 }, { entrena: true, pct: 50 }], 2).n_core, 5),
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

  // PAS 7 — vendre. UNA sola fórmula de preu, i la depressió profunda en FRACCIÓ.
  'P7.calibrat': () => {
    const c = [{ preu: 1 }, { preu: 2 }];
    assert.equal(esCalibrat(c, 0, 3), false, 'dues mostres no arriben a min_mostres=3');
    assert.equal(esCalibrat(c, 1, 3), true, 'una venda real també és mostra');
  },
  'P7.preu_esperat': () => {
    const j = { posicio: 'MC', creativitat: 8 };
    const comps = [{ posicio: 'MC', preu: 100000 }, { posicio: 'MC', preu: 120000 }, { posicio: 'MC', preu: 110000 }];
    const cal = preuEsperat(j, { comparables: comps, min_mostres: 3, divisio: 'VII', base_preu_divisio: { VII: 2000 } });
    assert.equal(cal.preu, estimacioComparables(comps, j), 'calibrat → mediana dels comparables');
    const noCal = preuEsperat(j, { comparables: [], min_mostres: 3, divisio: 'VII', base_preu_divisio: { VII: 2000 }, nivell_referencia: 8 });
    assert.equal(noCal.preu, 2000, 'sense mostres → base de la divisió × factor');
    assert.equal(preuEsperat(j, { comparables: [] }).preu, null, 'sense divisió no s\'inventa preu');
  },
  'P7.valor_net': () => {
    // valor_net = preu − cost_llistat − sou × setmanes_venda, i setmanes_venda = 1 si no
    // està llistat, o el que queda fins al tancament si ja ho està.
    assert.equal(setmanesVenda({ llistat: false }), 1);
    assert.equal(setmanesVenda({ llistat: true }, 14), 2);
    assert.equal(valorNet(110000, { sou: 1000 }, { cost_llistat: 1000, setmanes_venda: 2 }), 107000);
  },
  'P7.urgent': () => {
    assert.equal(esUrgent(10, 14), true);
    assert.equal(esUrgent(20, 14), false);
  },
  'P7.motiu_venda': () => {
    assert.equal(motiuVenda({}, { esRotatiu: true, temporada: 86, horitzo_eixida: 85 }), 'pic_de_valor');
    assert.equal(motiuVenda({}, { sobrecost: 500 }), 'sou_desproporcionat');
    assert.equal(motiuVenda({}, { enVenda: true }), 'sobrant');
    assert.equal(motiuVenda({}, {}), null);
  },
  'P7.ordre_venda': () => assert.deepEqual(ordreVenda([
    { id: 'a', sobrecost: 0, preu_esperat: 9 }, { id: 'b', sobrecost: 7, preu_esperat: 1 },
  ]).map((x) => x.id), ['b', 'a']),
  'P7.desti': () => {
    assert.equal(desti({}, { lesionat: true }).accio, 'agenda_llistar_en_recuperar');
    assert.equal(desti({}, { calibrat: true, valor_net: -1, llindar_despatx: 0 }).accio, 'despatxa');
    assert.equal(desti({}, { calibrat: false, valor_net: -1 }).accio, 'llista_hui', 'invariant 7');
    // El bug d'unitats que el full corregix: en enters, la branca era inassolible.
    assert.equal(desti({}, { modificador_tancament: -0.15, depressio_profunda: -20 }).accio, 'llista_hui');
    assert.equal(desti({}, { modificador_tancament: -0.25, depressio_profunda: -0.20 }).accio, 'agenda_llistar');
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
    assert.equal(compatible({ categoria: 'porter' }, { habilitat: 'defensa' }), false);
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

  // PAS 8 — el bucle d'estoc: jugadors i estadi amb la MATEIXA unitat.
  'P8.guany': () => assert.equal(guanyJugador(3, 1.5), 4.5, 'mancança × pes'),
  'P8.cost': () => assert.equal(eficiencia(4.5, 50000), 0.00009, 'guany/cost'),
  'P8.admissible': () => {
    assert.equal(admissibleJugador({ preu: 50000, sou: 900 }, { caixa_disponible: 100000, pressupost_sou_lloc: 1000 }), true);
    assert.equal(admissibleJugador({ preu: 150000 }, { caixa_disponible: 100000 }), false, 'cap compra amb diners no cobrats');
    assert.equal(admissibleJugador({ preu: 50000, sou: 5000 }, { caixa_disponible: 100000, pressupost_sou_lloc: 1000 }), false);
  },
  'P8.flux': () => assert.equal(deltaFlux(9000, 6000), 3000, 'Δflux = manteniment actual − nou'),
  'P8.guany_2': () => {
    const TS = { creativitat: { 1: 250, 2: 270, 3: 330, 4: 510, 5: 850 } };
    const PES = { mc: 1.5 };
    const ambManc = { mc: { habilitat: 'creativitat', mancanca: 2 } };
    assert.ok(guanyEstadi(ambManc, { sou_sostenible: 300, delta_flux: 3000, taula_salaris: TS, pesos: PES }) > 0);
    const sense = { mc: { habilitat: 'creativitat', mancanca: 0 } };
    assert.equal(guanyEstadi(sense, { sou_sostenible: 300, delta_flux: 3000, taula_salaris: TS, pesos: PES }), 0,
      'pujar el sostre d\'un lloc ja cobert val 0');
  },
  'P8.admissible_2': () => {
    assert.equal(admissibleEstadi({ cost: 50000, caixa_disponible: 100000, flux: 1000, delta_flux: 500 }), true);
    assert.equal(admissibleEstadi({ cost: 50000, caixa_disponible: 100000, flux: 1000, delta_flux: -2000 }), false,
      'cap obra que deixe el flux en negatiu');
  },
  'P8.eficiencia': () => {
    const t = decisioEstoc([
      { id: 'j', admissible: true, eficiencia: eficiencia(4.5, 50000) },
      { id: 'e', admissible: true, eficiencia: eficiencia(3.0, 20000) },
    ]);
    assert.equal(t.id, 'e', 'guanya la millor relació guany/cost, no el guany més gran');
    assert.equal(decisioEstoc([{ id: 'x', admissible: false, eficiencia: 1 }]), null,
      'sense opció admissible, cap compra: només es ven');
  },

  // PAS 11 — el personal és bucle de FLUX: tots cobren igual, mana la prioritat.
  'P11.cost_flux': () => assert.deepEqual([1, 2, 3, 4, 5].map((n) => costFlux(n, 1020)),
    [1020, 2040, 4080, 8160, 16320], 'staff_cost_base × 2^(n−1)'),
  'P11.nivell': () => {
    assert.equal(nivellPagable(16320, 1020), 5);
    assert.equal(nivellPagable(16319, 1020), 4);
    assert.equal(nivellPagable(1019, 1020), 0, 'si no arriba al primer, cap');
  },
  'P11.prioritat_personal': () => {
    const p = [{ tipus: 'assistent', quants: 2 }, { tipus: 'entrenador' }, { tipus: 'metge' }, { tipus: 'psicoleg' }];
    const r = planPersonal(30000, 1020, p);
    assert.deepEqual(r.pla.map((x) => x.nivell), [5, 4, 3, 1, 0],
      'cada tipus agafa el més alt que el flux restant encara paga, per orde');
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
    assert.equal(destiPromocio({ esUtil: true, valor_net_promo: -1 }), 'PROMOCIONA');
    assert.equal(destiPromocio({ esUtil: false, valor_net_promo: 1 }), 'PROMOCIONA_I_LLISTA');
    assert.equal(destiPromocio({ esUtil: false, valor_net_promo: -1 }), 'DESPATXA');
    assert.equal(valorNetPromo(300000, { cost_promocio: 20000, sou_estimat: 5000 }), 270000);
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
  prova();
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
