// Tonico — fornades. La fornada és unitat del negoci d'entrenament: NOMÉS els
// entrenables en tenen. La lletra OPERATIVA es deriva de l'HORITZÓ D'EIXIDA
// (quan es preveu vendre el jugador), no de l'entrada. L'entrada es conserva
// com a dada (comptabilitat de compra). Universal: la política (edat de pic de
// venda) és un paràmetre de la plantilla.
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
