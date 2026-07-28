// Tonico — doctrina juvenil v2 (contingut, no constants al codi). Pur.
const HABS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];
const esNum = (v) => v != null && v !== 'desconegut' && Number.isFinite(parseInt(v, 10));

// 2c — REVELACIONS entre dos instantànies juvenils: valors ACTUALS que passen de
// no-revelat (buit/desconegut) a número. Són FETS del món (celebrables al parte).
export function revelacions(prevRows, currRows) {
  const prevById = new Map((prevRows || []).map((r) => [r.jugador_id, r]));
  const out = [];
  for (const c of currRows || []) {
    const p = prevById.get(c.jugador_id);
    if (!p) continue;                                   // nou juvenil: no és «revelació», és alta
    for (const h of HABS) {
      const k = `${h}_actual`;
      if (!esNum(p[k]) && esNum(c[k])) out.push({ jugador_id: c.jugador_id, nom: c.nom, habilitat: h, valor: parseInt(c[k], 10) });
    }
  }
  return out;
}


// 3c — JUGA / NO JUGA per juvenil. Els minuts en posició entrenable són el recurs
// de descobriment: els INTERESSANTS no descoberts juguen (revelen); els duds
// confirmats van a la banqueta; els que creixen en pipeline, juguen (entrenen).
