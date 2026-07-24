// Tonico — fornades. La fornada és unitat de VENDA, no sols d'entrenament: els
// entrenables reben lletra per horitzó d'eixida i, quan un membre és desplaçat a
// venda, CONSERVA la lletra (es ven amb la finestra de la seua fornada; p.ex. un
// desplaçat entra amb A1 i es ven amb A1). Per això l'assignació auto NO toca els no-entrenables:
// no els reassigna ni els lleva la lletra. La lletra OPERATIVA es deriva de
// l'HORITZÓ D'EIXIDA (quan es preveu vendre), no de l'entrada; l'entrada es
// conserva com a dada. Universal: l'edat de pic de venda és pom de la plantilla.
import { calcularSetmana } from './calendari.js';

const LLETRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ms = 86400000;

// Temporada d'entrada al club, derivada de «Setmanes en el club».
export function temporadaEntrada(setmanesClub, snapshotData, ancora) {
  const dataEntrada = new Date(Date.parse(snapshotData) - (Number(setmanesClub) || 0) * 7 * ms).toISOString().slice(0, 10);
  return calcularSetmana(dataEntrada, ancora).temporada;
}

// Horitzó d'eixida estimat: es ven en arribar a l'edat de pic. Mai abans de la
// pròxima temporada (ref+1).
// ponytail: només depén de l'edat. Millora futura (quan hi haja setmanes
// d'historial): afinar amb la VELOCITAT DE POPS observada — un entrenable que
// creix ràpid pot eixir una temporada abans que la seua cohort. Cal l'historial
// de pops per estimar-la; de moment, edat.
export function temporadaEixida(edatAnys, ref, edatPicVenda) {
  return Math.max(ref + 1, ref + (edatPicVenda - Number(edatAnys)));
}

// Proposta de fornades per als entrenables. Etiqueta = <lletra de generació
// d'entrada><rang d'eixida dins la generació>. Ex.: A1 (generació A, ix primer),
// A2 (generació A, ix després).
// entrenables: [{id_hattrick, nom, edat_anys, setmanes_club}]
export function proposaFornades(entrenables, snapshotData, ancora, ref, edatPicVenda) {
  const amb = entrenables.map((j) => ({
    ...j,
    entrada: temporadaEntrada(j.setmanes_club, snapshotData, ancora),
    eixida: temporadaEixida(j.edat_anys, ref, edatPicVenda),
  }));
  const generacions = [...new Set(amb.map((j) => j.entrada))].sort((a, b) => a - b);  // antiga = A
  const grups = new Map();
  for (const j of amb) {
    const lletra = LLETRES[generacions.indexOf(j.entrada)] || 'Z';
    if (!grups.has(lletra)) grups.set(lletra, new Map());
    const perEixida = grups.get(lletra);
    if (!perEixida.has(j.eixida)) perEixida.set(j.eixida, []);
    perEixida.get(j.eixida).push(j);
  }
  const fornades = [];
  for (const [lletra, perEixida] of grups) {
    const eixides = [...perEixida.keys()].sort((a, b) => a - b);   // ix abans = número menor
    eixides.forEach((eix, i) => {
      const membres = perEixida.get(eix);
      fornades.push({
        lletra: `${lletra}${i + 1}`,
        temporada_entrada: membres[0].entrada,
        temporada_eixida_prevista: eix,
        jugadors: membres.map((m) => m.id_hattrick),
        noms: membres.map((m) => m.nom),
      });
    });
  }
  return fornades;
}
