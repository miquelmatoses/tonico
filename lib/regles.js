// Tonico — motor de regles. Cada regla és un mòdul xicotet (mecanisme); els seus
// llindars són paràmetres de BD (política). Una regla mira el context i torna
// alertes. Els textos són claus i18n (veu de Paco Meseguer); ací només la lògica.
//
// context: { jugadors, juvenils, dataInstantania, any_dies }
//   jugadors: [{jugador_id, nom, posicio, edat_anys, edat_dies, porteria, sou, tsi,
//               data_ultim_partit, categoria}]
//   juvenils: [{jugador_id, nom, dies_restants_promocio}]
// params: els de regles_parametres d'eixa regla (ja convertits per tipus).

const ms = 86400000;
const diesDes = (dataA, dataB) => (dataA ? Math.round((Date.parse(dataB) - Date.parse(dataA)) / ms) : Infinity);
const alerta = (codi, jugador_id, clau, parametres, urgencia) => ({ regla_codi: codi, jugador_id, missatge_clau: clau, parametres, urgencia });

export const REGLES = {
  // Aniversari Hattrick a la vora (sou/valor). Per defecte, jugadors en venda.
  ALR_ANIVERSARI: (ctx, p) => ctx.jugadors
    .filter((j) => (p.categories ? String(p.categories).split(',') : ['venda']).includes(j.categoria))
    .map((j) => ({ j, dies: ctx.any_dies - j.edat_dies }))
    .filter((x) => x.dies >= 0 && x.dies <= p.dies_avis)
    .map((x) => alerta('ALR_ANIVERSARI', x.j.jugador_id, 'alerta.aniversari',
      { nom: x.j.nom, dies: x.dies, edat_nova: x.j.edat_anys + 1 }, p.urgencia)),

  // Porter notable+ en venda que no ha jugat → risc de retenció de la Junta.
  ALR_JUNTA_PORTER: (ctx, p) => ctx.jugadors
    .filter((j) => j.posicio === p.posicio_porter && j.categoria === 'venda'
      && j.porteria >= p.porteria_min && diesDes(j.data_ultim_partit, ctx.dataInstantania) > p.dies_sense_partit)
    .map((j) => alerta('ALR_JUNTA_PORTER', j.jugador_id, 'alerta.junta_porter', { nom: j.nom, minuts: p.minuts_min }, p.urgencia)),

  // Menys entrenables actius que l'objectiu.
  ALR_NUCLI_INCOMPLET: (ctx, p) => {
    const n = ctx.jugadors.filter((j) => j.categoria === 'entrenable').length;
    return n < p.objectiu ? [alerta('ALR_NUCLI_INCOMPLET', null, 'alerta.nucli_incomplet',
      { actuals: n, objectiu: p.objectiu, falten: p.objectiu - n }, p.urgencia)] : [];
  },

  // Entrenable sense partit recent → setmana d'entrenament en risc.
  ALR_ENTRENABLE_SENSE_MINUTS: (ctx, p) => ctx.jugadors
    .filter((j) => j.categoria === 'entrenable' && diesDes(j.data_ultim_partit, ctx.dataInstantania) > p.dies_sense_partit)
    .map((j) => alerta('ALR_ENTRENABLE_SENSE_MINUTS', j.jugador_id, 'alerta.entrenable_sense_minuts', { nom: j.nom }, p.urgencia)),

  // Juvenil promocionable a la vora.
  ALR_PROMOCIO_JUVENIL: (ctx, p) => ctx.juvenils
    .filter((j) => j.dies_restants_promocio != null && j.dies_restants_promocio <= p.dies_avis)
    .map((j) => alerta('ALR_PROMOCIO_JUVENIL', j.jugador_id, 'alerta.promocio_juvenil', { nom: j.nom, dies: j.dies_restants_promocio }, p.urgencia)),

  // Plantilla juvenil per davall del mínim → programar crida.
  ALR_PLANTILLA_JUVENIL_MINIMA: (ctx, p) => ctx.juvenils.length < p.minim
    ? [alerta('ALR_PLANTILLA_JUVENIL_MINIMA', null, 'alerta.plantilla_juvenil_minima', { actuals: ctx.juvenils.length, minim: p.minim }, p.urgencia)] : [],

  // Jugador sènior sense categoria (rar amb el classificador auto, però xarxa de seguretat).
  ALR_SENSE_CATEGORIA: (ctx, p) => ctx.jugadors
    .filter((j) => !j.categoria)
    .map((j) => alerta('ALR_SENSE_CATEGORIA', j.jugador_id, 'alerta.sense_categoria', { nom: j.nom }, p.urgencia)),
};

// Executa les regles actives i torna les alertes ordenades per urgència.
export function executaRegles(ctx, reglesActives) {
  const alertes = [];
  for (const { codi, params } of reglesActives) {
    const fn = REGLES[codi];
    if (fn) alertes.push(...fn(ctx, params));
  }
  return alertes.sort((a, b) => (b.urgencia ?? 0) - (a.urgencia ?? 0));
}
