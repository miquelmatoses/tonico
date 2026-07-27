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
export function recomanaJoc(juvenil) {
  const p = juvenil.pipeline;
  if (!p) return { juga: false, motiu: 'sense_pipeline' };
  if (p.desconegut) return { juga: true, motiu: 'revelar' };        // interessant no descobert → revelar
  if (p.fora) return { juga: false, motiu: 'dud' };                 // dud confirmat → banqueta
  return { juga: true, motiu: 'entrena' };                          // creix en pipeline → entrena
}

// 3c — FRE DE SEGURETAT: mai alinear sense almenys 1 suplent disponible. Si tots
// els juvenils disponibles van a jugar (0 a la banqueta), s'ha de retindre un.
export function freSuplents(juvenils) {
  const disponibles = juvenils.length;
  const jugarien = juvenils.filter((j) => recomanaJoc(j).juga).length;
  return { ok: disponibles - jugarien >= 1, jugarien, disponibles };
}

// 3b — RÀNQUING D'EIXIDA: entre els sobrants (confirmats FORA de pipeline),
// despatxa primer els menys útils com a farciment. Un dud JA DESCOBERT val més
// (no malgasta comentaris de l'entrenador) → es reté; un a mig descobrir ix abans.
// Mai per davall de l'objectiu. Torna els jugador_id a despatxar, en ordre.
export function ranquingEixida(juvenils, objectiu) {
  const excedent = juvenils.length - objectiu;
  if (excedent <= 0) return [];
  const candidats = juvenils.filter((j) => j.pipeline?.fora);       // només els confirmats fora
  if (!candidats.length) return [];
  // Menys revelats primer (menys útils de farciment), i a igualtat, menor sostre.
  const ord = candidats.slice().sort((a, b) =>
    (a.pipeline.revelats ?? 0) - (b.pipeline.revelats ?? 0)
    || (a.pipeline.principal_potencial ?? 0) - (b.pipeline.principal_potencial ?? 0));
  return ord.slice(0, Math.min(excedent, candidats.length)).map((j) => j.jugador_id);
}


// valor estimat supera el mínim → promocionar i vendre; si no (i és conegut) →
// despatx directe. Valor DESCONEGUT no despatxa (desconegut ≠ sense valor).
export function disposicioVenda(pipeline, valorEstimat, preuMin) {
  if (!pipeline?.fora || !pipeline.vendible) return pipeline?.proposta ?? null;
  if (valorEstimat != null && valorEstimat < preuMin) return 'cua_eixida';   // valor conegut i baix → despatx
  return 'promocionar_vendre';                                                // per damunt o desconegut → vendre
}
