// Tonico — BUCLE D'ESTOC (contracte v3.1, PAS 8): l'ESTADI VA PRIMER i no competix per
// eficiència. node test/estoc.mjs
import assert from 'node:assert/strict';
import { guanyJugador, admissibleJugador, deltaManteniment, admissibleEstadi, estadiCaduc,
  eficiencia, decisioEstoc } from '../lib/estoc.js';

// ── Opció JUGADOR ──
assert.equal(guanyJugador(3, 1.5), 4.5, 'guany = mancança × pes (la mètrica única)');
assert.equal(guanyJugador(null, 1.5), null);
assert.equal(admissibleJugador({ preu: 50000, sou: 900 }, { caixa: 100000, pressupost_sou_lloc: 1000 }), true);
assert.equal(admissibleJugador({ preu: 150000, sou: 900 }, { caixa: 100000, pressupost_sou_lloc: 1000 }), false,
  'no es compra amb diners que no tens');
assert.equal(admissibleJugador({ preu: 50000, sou: 5000 }, { caixa: 100000, pressupost_sou_lloc: 1000 }), false,
  'ni un sou que el lloc no sosté');
assert.equal(admissibleJugador({ preu: 1 }, { caixa: null }), false,
  'sense caixa declarada no es compra res');

// ── Opció ESTADI: només admissibilitat, no es puntua ──
assert.equal(deltaManteniment(7100, 9000), 1900, 'el que l\'obra AFIG de manteniment setmanal');
assert.equal(deltaManteniment(null, 6000), null);

// L'obra es paga amb caixa cobrada I el flux la sosté deixant la reserva intacta. El
// Δmanteniment és SETMANAL i el flux va per període: es normalitza (invariant 16).
assert.equal(admissibleEstadi({ cost: 50000, caixa: 100000, flux: 10000,
  delta_manteniment: 1000, setmanes_periode: 2, reserva_flux: 5000 }), true);
assert.equal(admissibleEstadi({ cost: 150000, caixa: 100000, flux: 10000,
  delta_manteniment: 0, setmanes_periode: 2, reserva_flux: 0 }), false,
  'l\'obra tampoc es paga amb diners que no tens');
assert.equal(admissibleEstadi({ cost: 50000, caixa: 100000, flux: 10000,
  delta_manteniment: 3000, setmanes_periode: 2, reserva_flux: 5000 }), false,
  'ni una obra el manteniment de la qual es menge la reserva (3000 × 2 = 6000 > 10000 − 5000)');
// UNA OBRA JA COMENÇADA NO ES TORNA A DECIDIR. Tonico la proposava cada setmana també quan
// s'estava fent, perquè no tenia manera de saber-ho: una decisió presa i irreversible es
// llegia com una decisió pendent.
assert.equal(admissibleEstadi({ cost: 50000, caixa: 100000, flux: 10000,
  delta_manteniment: 1000, setmanes_periode: 2, reserva_flux: 5000, obra_en_curs: true }), false,
  'amb l\'obra en marxa no hi ha res a decidir, encara que la caixa i el flux la paguen');
assert.equal(admissibleEstadi({ cost: 1, caixa: 100, flux: null, delta_manteniment: 0 }), false,
  'sense flux declarat no es decidix una obra');

// PROPIETAT NOVA (v3.1): una AMPLIACIÓ (Δmanteniment > 0) pot ser admissible. Amb el model
// anterior el guany de l'obra era 0 sempre que s'ampliara, i l'estadi no podia guanyar mai.
assert.equal(admissibleEstadi({ cost: 10000, caixa: 999999, flux: 100000,
  delta_manteniment: 5000, setmanes_periode: 2, reserva_flux: 0 }), true,
  'ampliar l\'estadi ha de poder passar el filtre: abans era impossible');

// ── Caducitat dels números de la calculadora ──
assert.equal(estadiCaduc('2026-01-01', '2026-07-26', 10), true, 'passades 10 setmanes, caducs');
assert.equal(estadiCaduc('2026-07-01', '2026-07-26', 10), false);
assert.equal(estadiCaduc(null, '2026-07-26', 10), false, 'sense data no són caducs: és que falten');

// ── La decisió: L'ESTADI VA PRIMER, sempre ──
assert.equal(eficiencia(4.5, 50000), 0.00009);
assert.equal(eficiencia(4.5, 0), null, 'sense cost no hi ha eficiència');

const tria = decisioEstoc([
  { tipus: 'estadi', admissible: true, caduc: false, eficiencia: null, guany: null },
  { tipus: 'jugador', id: 'bo', admissible: true, eficiencia: eficiencia(9, 10000), guany: 9 },
]);
assert.equal(tria.tipus, 'estadi',
  'l\'estadi va abans que QUALSEVOL fitxatge, per bo que siga: és l\'únic que mou el flux');

const senseEstadi = decisioEstoc([
  { tipus: 'estadi', admissible: false, caduc: false },
  { tipus: 'jugador', id: 'a', admissible: true, eficiencia: eficiencia(4.5, 50000), guany: 4.5 },
  { tipus: 'jugador', id: 'b', admissible: true, eficiencia: eficiencia(3.0, 20000), guany: 3.0 },
]);
assert.equal(senseEstadi.id, 'b', 'si l\'estadi no demana res, entre jugadors manda l\'eficiència');

const caduc = decisioEstoc([
  { tipus: 'estadi', admissible: true, caduc: true },
  { tipus: 'jugador', id: 'a', admissible: true, eficiencia: 1, guany: 1 },
]);
assert.equal(caduc.id, 'a', 'amb els números caducs l\'estadi no es recomana: es demana refer-los');

// SENSE PREU DECLARAT NO ES SUGGERIX MAI. A Hattrick el preu no el calcula el joc, i suggerir
// una compra sense saber què costa és decidir a cegues: eixes opcions no són admissibles i no
// poden arribar mai a recomanació, per molta mancança que tinguen.
assert.equal(decisioEstoc([
  { tipus: 'jugador', id: 'sensepreu', admissible: false, falta: 'preu', prioritat: 99 },
]), null, 'una opció sense preu no es recomana, encara que siga la més urgent');

// MANA LA PRIORITAT: una plaça buida (infinita) va per damunt de qualsevol mancança, i entre
// iguals decidix l'eficiència — el que rendix més per euro.
const buida = decisioEstoc([
  { tipus: 'jugador', id: 'forat', admissible: true, prioritat: 4.4, eficiencia: 9 },
  { tipus: 'jugador', id: 'placa', admissible: true, prioritat: Infinity, eficiencia: 0.1 },
]);
assert.equal(buida.id, 'placa', 'una plaça d\'entrenament buida va primer siga com siga');
const empat = decisioEstoc([
  { tipus: 'jugador', id: 'car', admissible: true, prioritat: 4.4, eficiencia: 1 },
  { tipus: 'jugador', id: 'barat', admissible: true, prioritat: 4.4, eficiencia: 8 },
]);
assert.equal(empat.id, 'barat', 'a igualtat de prioritat, el que rendix més per euro');

assert.equal(decisioEstoc([{ tipus: 'jugador', admissible: false, eficiencia: 1 }]), null,
  'sense cap opció admissible, cap compra: només es ven');
assert.equal(decisioEstoc([]), null);

console.log('OK — bucle d\'estoc v3.1: l\'estadi va primer i una ampliació ja pot passar');
