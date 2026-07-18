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
  // Aniversari Hattrick a la vora. Per a VENDA és una recomanació amb DOS
  // rellotges (jugador + mercat); per a ENTRENABLE és un FET (nota de sou/valor).
  ALR_ANIVERSARI: (ctx, p) => {
    const cats = p.categories ? String(p.categories).split(',') : ['venda'];
    return ctx.jugadors
      .filter((j) => cats.includes(j.categoria))
      .map((j) => ({ j, dies: ctx.any_dies - j.edat_dies }))
      .filter((x) => x.dies >= 0 && x.dies <= p.dies_avis)
      .map((x) => {
        const base = { nom: x.j.nom, dies: x.dies, edat_nova: x.j.edat_anys + 1 };
        if (x.j.categoria !== 'venda') {
          return alerta('ALR_ANIVERSARI', x.j.jugador_id, 'alerta.aniversari_fet', base, p.urgencia);
        }
        const m = ctx.mercat;
        if (m && m.depressio && m.finsRecuperacio != null && m.finsRecuperacio <= m.esperaMax) {
          return alerta('ALR_ANIVERSARI', x.j.jugador_id, 'alerta.aniversari_espera',
            { ...base, setmana_recuperacio: m.setmanaRecuperacio }, p.urgencia);
        }
        return alerta('ALR_ANIVERSARI', x.j.jugador_id, 'alerta.aniversari', base, p.urgencia);
      });
  },

  // Porter notable+ en venda → recordatori de retenció de la Junta (cal fer-lo
  // jugar els minuts). No es mesuren minuts des del CSV: recordatori permanent.
  ALR_JUNTA_PORTER: (ctx, p) => ctx.jugadors
    .filter((j) => j.posicio === p.posicio_porter && j.categoria === 'venda' && j.porteria >= p.porteria_min)
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

  // Finestra de venda d'una fornada: el seu horitzó d'eixida s'acosta.
  ALR_FINESTRA_VENDA_FORNADA: (ctx, p) => {
    if (!ctx.pla) return [];
    return (ctx.pla.fornades || [])
      .filter((f) => f.temporada_eixida != null && f.temporada_eixida - ctx.pla.temporadaActual >= 0
        && f.temporada_eixida - ctx.pla.temporadaActual <= p.temporades_avis)
      .map((f) => alerta('ALR_FINESTRA_VENDA_FORNADA', null, 'alerta.finestra_venda_fornada',
        { fornada: f.lletra, temporada: f.temporada_eixida }, p.urgencia));
  },

  // Canvi de fase del pla a la vora (p.ex. l'inflexió): paquet de canvis.
  ALR_CANVI_FASE: (ctx, p) => {
    if (!ctx.pla || ctx.pla.temporadaInflexio == null) return [];
    const dif = ctx.pla.temporadaInflexio - ctx.pla.temporadaActual;
    return (dif > 0 && dif <= p.temporades_avis)
      ? [alerta('ALR_CANVI_FASE', null, 'alerta.canvi_fase', { temporada: ctx.pla.temporadaInflexio }, p.urgencia)] : [];
  },
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
