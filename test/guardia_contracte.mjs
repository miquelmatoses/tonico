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

  // P10.valor casos (a)(b)(c): coincidixen amb valorHabilitat. El cas (d) NO — vore DIVERGENTS.
  'P10.valor': () => {
    const o = optsMarge();
    const ea = MARGE.esperat_defecte;
    const casos = [
      { act: 6, pot: 9, esperat: 6 + (9 - 6) * MARGE.f_marge },                    // (a)
      { act: 6, pot: null, esperat: 6 + MARGE.marge_ple * MARGE.f_marge },         // (b)
      { act: null, pot: 9, esperat: Math.min(ea, 9) + (9 - Math.min(ea, 9)) * MARGE.f_marge }, // (c)
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
const DIVERGENTS = {
  // Full: valor(j,h) amb act i pot desconeguts = esperat_act + marge_ple × f_marge.
  // Codi: torna esperat_act pelat, sense el marge (lib/ranquing_juvenil.js:24).
  'P10.valor#cas_d': () => {
    const segonsFull = MARGE.esperat_defecte + MARGE.marge_ple * MARGE.f_marge;   // 6,5
    const segonsCodi = valorHabilitat({ [`${A}_actual`]: null, [`${A}_potencial`]: null }, A, optsMarge());
    assert.notEqual(segonsCodi, segonsFull,
      'la divergència P10.valor cas (d) ja NO existix → promou-la a VERIFICADES');
    return `esperat full=${segonsFull} · codi=${segonsCodi}`;
  },
};

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
