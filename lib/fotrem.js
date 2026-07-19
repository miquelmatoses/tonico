// Tonico — Fotrem (Fase 7). Vista dels juvenils amb habilitats actual/potencial
// (3 estats), projecció d'aterratge al primer equip i avaluador de crides.
import { calcularSetmana } from './calendari.js';

const HAB = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];
const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

// Projecció d'aterratge: data real de promoció + temporada del pla.
export function projeccioAterratge(diesRestants, snapshotData, ancora) {
  if (diesRestants == null) return null;
  const data = new Date(Date.parse(snapshotData) + Number(diesRestants) * 86400000).toISOString().slice(0, 10);
  return { data, temporada: calcularSetmana(data, ancora).temporada };
}

// Avaluador de crides — NOMÉS per a OFERTES NOVES (candidats a fitxar), no per als
// juvenils que ja són a casa. Doctrina per edat (poms). Torna {accepta, motiu} o null.
// Clau: «desconegut» NO és «fluix». Sense dades revelades no es pot dir rebutjable.
export function avaluaCrida(edat, potencialMax, compostMax, llindars) {
  const l = llindars?.[String(edat)];
  if (!l) return null;
  if (l.mai) return { accepta: false, motiu: 'mai' };
  const perPot = l.potencial_min != null && potencialMax != null && potencialMax >= l.potencial_min;
  const perComp = l.compost_min != null && compostMax != null && compostMax >= l.compost_min;
  if (perPot || perComp) return { accepta: true, motiu: perPot ? 'potencial' : 'compost' };
  // Per defecte «accepta» (15 anys): acceptar LLEVAT que se sàpiga que és fluix.
  if (l.per_defecte === 'accepta') {
    const fluix = compostMax != null && l.compost_min != null && compostMax < l.compost_min;
    return fluix ? { accepta: false, motiu: 'fluix' } : { accepta: true, motiu: 'sense_dades' };
  }
  return { accepta: false, motiu: 'per_davall' };   // porta positiva (16 anys) no assolida
}

// Construïx la vista d'un juvenil a partir d'una fila d'instantania_juvenil.
export function vistaJuvenil(fila, snapshotData, ancora, llindars) {
  const habilitats = HAB.map((h) => ({ habilitat: h, actual: fila[`${h}_actual`] ?? null, potencial: fila[`${h}_potencial`] ?? null }));
  const potencialMax = Math.max(-1, ...habilitats.map((x) => num(x.potencial) ?? -1));
  const compostMax = Math.max(-1, ...habilitats.map((x) => num(x.actual) ?? -1));
  return {
    jugador_id: fila.jugador_id, nom: fila.nom, edat_anys: fila.edat_anys, edat_dies: fila.edat_dies,
    dies_restants_promocio: fila.dies_restants_promocio,
    habilitats,
    potencial_max: potencialMax >= 0 ? potencialMax : null,
    compost_max: compostMax >= 0 ? compostMax : null,
    aterratge: projeccioAterratge(fila.dies_restants_promocio, snapshotData, ancora),
    crida: avaluaCrida(fila.edat_anys, potencialMax >= 0 ? potencialMax : null, compostMax >= 0 ? compostMax : null, llindars),
    estat: fila.estat || 'seguiment',
  };
}
