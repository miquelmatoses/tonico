// Tonico — proposta de fornades per cohort. Mecanisme universal: agrupa per
// TEMPORADA D'ENTRADA al club (derivada de «Setmanes en el club») i assigna
// lletres per antiguitat (A = la més antiga). Pensat per a entrades netes
// futures; un equip ja rodat dóna cohorts bruts que l'usuari reajusta.
import { calcularSetmana } from './calendari.js';

const LLETRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// jugadors: [{id_hattrick, nom, setmanes_club, edat_anys}], snapshotData: 'YYYY-MM-DD'.
export function proposaFornades(jugadors, snapshotData, ancora) {
  const ms = 86400000;
  const perTemporada = new Map();
  for (const j of jugadors) {
    const setmanes = Number(j.setmanes_club) || 0;
    const dataEntrada = new Date(Date.parse(snapshotData) - setmanes * 7 * ms).toISOString().slice(0, 10);
    const { temporada } = calcularSetmana(dataEntrada, ancora);
    if (!perTemporada.has(temporada)) perTemporada.set(temporada, []);
    perTemporada.get(temporada).push(j);
  }
  const temporades = [...perTemporada.keys()].sort((a, b) => a - b);   // antiga → nova
  return temporades.map((temp, i) => ({
    lletra: LLETRES[i] || `Z${i}`,
    temporada_entrada: temp,
    jugadors: perTemporada.get(temp).map((j) => j.id_hattrick),
    noms: perTemporada.get(temp).map((j) => j.nom),
  }));
}
