// Tonico — Juvenils (Fase 7). Vista dels juvenils amb habilitats actual/potencial
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
