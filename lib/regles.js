// Tonico — motor de regles. Cada regla és un mòdul xicotet (mecanisme); els seus
// llindars són paràmetres de BD (política). Una regla mira el context i torna
// alertes. Els textos són claus i18n (veu de Paco Meseguer); ací només la lògica.
//
// context: { jugadors, juvenils, dataInstantania, any_dies }
//   jugadors: [{jugador_id, nom, posicio, edat_anys, edat_dies, porteria, sou, tsi,
//               data_ultim_partit, categoria}]
//   juvenils: [{jugador_id, nom, dies_restants_promocio}]
// params: els de regles_parametres d'eixa regla (ja convertits per tipus).

import { ranquingEixida, freSuplents } from './juvenil.js';
import { conjuntLiquidacio } from './liquidacio.js';
import { esLesionat, duradaLesio } from '../public/format.js';   // predicat i durada de lesió (servidor i client)

const ms = 86400000;
const diesDes = (dataA, dataB) => (dataA ? Math.round((Date.parse(dataB) - Date.parse(dataA)) / ms) : Infinity);

// Dia òptim de llistat i el seu tancament (subhasta = llistat + dies_subhasta).
// En depressió amb recuperació a la vora: TANCAMENT = primer dia de la finestra
// (vora de setmana + finsRecuperacio setmanes); LLISTAT = tancament − dies_subhasta.
// Sense depressió: llistar ja (hui). Compartit per l'aniversari i la depreciació.
function finestraLlistat(ctx, m) {
  const n = ctx.dies_subhasta ?? 3;
  const vora = ctx.setmana_inici_data ?? ctx.dataInstantania;
  const dt = (dies) => new Date(Date.parse(vora) + dies * ms).toISOString().slice(0, 10);
  if (m && m.depressio && m.finsRecuperacio != null && m.finsRecuperacio <= m.esperaMax) {
    return { data_llistat: dt(m.finsRecuperacio * 7 - n), data_tancament: dt(m.finsRecuperacio * 7) };
  }
  const avui = ctx.dataInstantania;
  return { data_llistat: avui, data_tancament: new Date(Date.parse(avui) + n * ms).toISOString().slice(0, 10) };
}
// dataAccio (opcional): dia en què l'acció és executable. Entra a la clau
// d'idempotència (0b) perquè el dia D es cree una alerta NOVA encara que
// l'anticipada del mateix jugador/regla estiguera vista.
// `diners`: quines claus de `parametres` són IMPORTS. Les DECLARA qui emet l'alerta, perquè
// la vista no ho haja d'endevinar pel nom — un «objectiu» de 8 JUGADORS no és un import.
const alerta = (codi, jugador_id, clau, parametres, urgencia, dataAccio = null, diners = null) =>
  ({ regla_codi: codi, jugador_id, missatge_clau: clau, parametres, urgencia, data_accio: dataAccio, diners });

// Ítem d'AGENDA (principi «l'informe és l'agenda de hui»): l'acció NO és executable
// hui sinó el dia `dataAccio` (futur). No és alerta: viu a la subsecció Agenda,
// agrupat per data. `clau` és una etiqueta curta ('agenda.llistar'…).
const agendaItem = (codi, jugador_id, clau, parametres, dataAccio) => ({ regla_codi: codi, jugador_id, missatge_clau: clau, parametres, urgencia: 0, data_accio: dataAccio, agenda: true });

export const REGLES = {
  // Aniversari Hattrick a la vora. Per a VENDA és una recomanació amb DOS
  // rellotges (jugador + mercat); per a ENTRENABLE és un FET (nota de sou/valor).
  // Aniversari d'un ENTRENABLE = FET (nota de sou/valor). La VENDA ja no espera aniversari:
  // la governa ALR_LLISTAR_VENDA (doctrina de liquidació, el valor no espera).
  ALR_ANIVERSARI: (ctx, p) => {
    const cats = p.categories ? String(p.categories).split(',') : ['core', 'rotatiu'];
    return ctx.jugadors
      .filter((j) => cats.includes(j.categoria) && j.categoria !== 'venda')
      .map((j) => ({ j, dies: ctx.any_dies - j.edat_dies }))
      .filter((x) => x.dies >= 0 && x.dies <= p.dies_avis)
      .map((x) => alerta('ALR_ANIVERSARI', x.j.jugador_id, 'alerta.aniversari_fet',
        { nom: x.j.nom, dies: x.dies, edat_nova: x.j.edat_anys + 1 }, p.urgencia));
  },

  // DOCTRINA DE LIQUIDACIÓ — EL VALOR NO ESPERA. Un jugador de VENDA (no entrena, no és
  // estructura) només es deprecia (sou + edat). Per defecte es LLISTA HUI. Únics
  // ajornaments (derivats, mecànics): (a) lesionat → llistar quan es recupere; (b) el
  // tancament cauria en depressió PROFUNDA i cap rellotge d'urgència (aniversari a la vora
  // o depreciació mecànica) apreta → esperar fins al primer tancament FORA de depressió.
  // En recuperació o mercat ple: MAI s'espera. Cap «finestra òptima» ni rotació de minuts.
  ALR_LLISTAR_VENDA: (ctx, p) => {
    const llistats = new Set((ctx.vendes_llistades || []).map((v) => v.jugador_id));
    const m = ctx.mercat;
    // 3a: un Transferible=1 ja ESTÀ llistat (l'acció ja existix) → mai dispara. La fitxa
    // el sincronitza (derivaLlistat), i ací a més el filtrem directament per robustesa.
    const venda = (ctx.jugadors || [])
      .filter((j) => j.categoria === 'venda' && j.transferible !== 1 && j.transferible !== true && !llistats.has(j.jugador_id));
    // UNA SOLA FONT (3): el mateix conjunt derivat que marca les fitxes de Vendes.
    // llistable ara = venda − llistats − lesionats − retinguts per cobertura.
    const { llistables, lesionats } = conjuntLiquidacio(venda, { ...(ctx.cobertura || {}), posicio_porter: p.posicio_porter || 'PO' });
    const out = [];
    for (const j of lesionats) {                                     // (a) ajornament per lesió (individual)
      out.push(alerta('ALR_LLISTAR_VENDA', j.jugador_id, 'alerta.llistar_lesionat', { nom: j.nom, setmanes: duradaLesio(j.lesio) ?? '?' }, p.urgencia_lesionat ?? 40));
    }
    const agregats = [];
    for (const j of llistables) {
      const diesAniv = j.edat_dies != null ? ctx.any_dies - j.edat_dies : Infinity;
      const urgAniv = diesAniv >= 0 && diesAniv <= (p.dies_urgencia ?? 14);
      // v3 (PAS 7): urgent(j) = NOMÉS l'aniversari. La clàusula de porter valuós era del
      // model retirat (la governava la Junta, que ja no existix) i el full no la contempla.
      const urgencia = urgAniv;
      if (!urgencia && m && m.depressio && m.modificador != null && m.modificador <= (p.depressio_profunda ?? -0.20)) {
        const { data_llistat, data_tancament } = finestraLlistat(ctx, m);   // (b) fins fora de depressió
        if (data_llistat > ctx.dataInstantania) {
          out.push(agendaItem('ALR_LLISTAR_VENDA', j.jugador_id, 'agenda.llistar', { nom: j.nom, data_tancament }, data_llistat));
          continue;
        }
      }
      // DIA D: l'urgent es destaca individualment, però SEGUIX dins de l'agregada.
      if (urgencia) out.push(alerta('ALR_LLISTAR_VENDA', j.jugador_id, 'alerta.llistar_ja', { nom: j.nom, sou: j.sou ?? 0 }, p.urgencia ?? 70, null, ['sou']));
      agregats.push(j);
    }
    // AGREGACIÓ (mateixa medicina que revelacions / fora-de-pipeline): TOT el conjunt
    // llistable en UNA alerta; el detall per jugador viu a Vendes, marcat amb el mateix
    // conjunt. Recompte i sou total coincidixen amb les files «llistable ara» (3).
    if (agregats.length) {
      const souTotal = agregats.reduce((s, j) => s + (j.sou ?? 0), 0);
      const clau = agregats.length === 1 ? 'alerta.llistar_agregat_1' : 'alerta.llistar_agregat_n';
      out.push(alerta('ALR_LLISTAR_VENDA', null, clau, { n: agregats.length, sou_total: souTotal }, p.urgencia_normal ?? 55, null, ['sou_total']));
    }
    return out;
  },

  // Un jugador LLISTAT que està LESIONAT: els compradors veuen la lesió → millor
  // esperar que es recupere abans de tindre'l al mercat.
  ALR_LESIO_VENDA: (ctx, p) => {
    const lesionats = new Map((ctx.jugadors || []).filter((j) => esLesionat(j.lesio)).map((j) => [j.jugador_id, j]));
    return (ctx.vendes_llistades || [])
      .filter((v) => v.jugador_id != null && lesionats.has(v.jugador_id))
      .map((v) => alerta('ALR_LESIO_VENDA', v.jugador_id, 'alerta.lesio_venda', { nom: v.nom, setmanes: duradaLesio(lesionats.get(v.jugador_id).lesio) ?? '?' }, p.urgencia));
  },

  // La subhasta d'un jugador LLISTAT tanca demà (no la perdes). Tancament = llistat
  // + dies_subhasta. Recorda el dia abans (o el mateix dia) del tancament.
  ALR_SUBHASTA_TANCA: (ctx, p) => {
    const n = ctx.dies_subhasta ?? 3;
    return (ctx.vendes_llistades || [])
      .map((v) => {
        const tancament = new Date(Date.parse(v.data_llistada) + n * ms).toISOString().slice(0, 10);
        return { v, tancament, dies: Math.round((Date.parse(tancament) - Date.parse(ctx.dataInstantania)) / ms) };
      })
      .filter((x) => x.dies >= 0 && x.dies <= 1)
      .map((x) => alerta('ALR_SUBHASTA_TANCA', x.v.jugador_id ?? null, 'alerta.subhasta_tanca', { nom: x.v.nom, data: x.tancament }, p.urgencia, x.tancament));
  },


  // Menys entrenables actius que l'objectiu. L'objectiu es DERIVA de l'entrenament
  // configurat (capacitat de places × règim de rotació/doblatge), no d'un pom escrit
  // a mà: canviar la formació o l'entrenament el mou sol. El pom queda de reserva.
  ALR_NUCLI_INCOMPLET: (ctx, p) => {
    const objectiu = ctx.cobertura?.entrenables_objectiu ?? p.objectiu;
    if (objectiu == null) return [];
    const n = ctx.jugadors.filter((j) => j.categoria === 'core' || j.categoria === 'rotatiu').length;
    return n < objectiu ? [alerta('ALR_NUCLI_INCOMPLET', null, 'alerta.nucli_incomplet',
      { actuals: n, objectiu, falten: objectiu - n }, p.urgencia)] : [];
  },

  // Entrenable sense partit recent → setmana d'entrenament en risc. No dispara per
  // a nouvinguts (setmanes_club < 1): no podien haver jugat encara amb l'equip.
  ALR_NUCLI_SENSE_MINUTS: (ctx, p) => ctx.jugadors
    .filter((j) => (j.categoria === 'core' || j.categoria === 'rotatiu') && !(j.setmanes_club < 1)
      && diesDes(j.data_ultim_partit, ctx.dataInstantania) > p.dies_sense_partit)
    .map((j) => alerta('ALR_NUCLI_SENSE_MINUTS', j.jugador_id, 'alerta.nucli_sense_minuts', { nom: j.nom }, p.urgencia)),

  // Juvenil promocionable a la vora.
  ALR_PROMOCIO_JUVENIL: (ctx, p) => ctx.juvenils
    .filter((j) => j.dies_restants_promocio != null && j.dies_restants_promocio <= p.dies_avis)
    .map((j) => alerta('ALR_PROMOCIO_JUVENIL', j.jugador_id, 'alerta.promocio_juvenil', { nom: j.nom, dies: j.dies_restants_promocio }, p.urgencia)),

  // Plantilla juvenil per davall del mínim → programar crida.
  ALR_PLANTILLA_JUVENIL_MINIMA: (ctx, p) => ctx.juvenils.length < p.minim
    ? [alerta('ALR_PLANTILLA_JUVENIL_MINIMA', null, 'alerta.plantilla_juvenil_minima', { actuals: ctx.juvenils.length, minim: p.minim }, p.urgencia)] : [],

  // Predictiva: la plantilla juvenil baixarà del mínim per promocions previstes.
  ALR_CRIDA_JUVENIL: (ctx, p) => {
    const total = ctx.juvenils.length;
    const promocionen = ctx.juvenils.filter((j) => j.dies_restants_promocio != null && j.dies_restants_promocio <= p.dies_avis).length;
    const futur = total - promocionen;
    return (promocionen > 0 && futur < p.minim)
      ? [alerta('ALR_CRIDA_JUVENIL', null, 'alerta.crida_juvenil', { futur, minim: p.minim, promocionen }, p.urgencia)] : [];
  },

  // F.11: juvenils FORA de pipeline → UNA línia agregada (com l'allau de revelacions);
  // el detall per jugador viu a la taula de Fotrem. Es resol amb la pròxima crida.
  ALR_JOVE_FORA_PIPELINE: (ctx, p) => {
    const fora = (ctx.juvenils || []).filter((j) => j.pipeline?.fora && j.estat !== 'cua_eixida' && j.estat !== 'elegit');
    if (!fora.length) return [];
    // 3c: només ACCIONABLE HUI si la crida al cercapromeses està DISPONIBLE i acceptar
    // el nou passaria de l'objectiu (cal fer lloc traient els de fora). Si no, res: la
    // taula de Fotrem ja ho mostra.
    const obj = ctx.juvenil_objectiu ?? 10;
    if (!(ctx.crida?.disponible && (ctx.juvenils || []).length + 1 > obj)) return [];
    return [alerta('ALR_JOVE_FORA_PIPELINE', null, 'alerta.jove_fora_agregat', { n: fora.length }, p.urgencia)];
  },

  // G.14: juvenil amb especialitat descoberta → valor a protegir en decidir eixides.
  // 3d: només si és CANDIDAT REAL a eixida (fora de pipeline o a la cua d'eixida);
  // protegir algú que ningú pensa despatxar no és una alerta.
  ALR_JOVE_ESPECIALITAT: (ctx, p) => (ctx.juvenils || [])
    .filter((j) => j.especialitat && (j.pipeline?.fora || j.estat === 'cua_eixida'))
    .map((j) => alerta('ALR_JOVE_ESPECIALITAT', j.jugador_id, 'alerta.jove_especialitat',
      { nom: j.nom, especialitat: j.especialitat }, p.urgencia)),

  // F.12: validació de l'entrenament juvenil declarat contra la guia i el pipeline.
  ALR_ENTRENAMENT_JUVENIL: (ctx, p) => {
    const ej = ctx.entrenament_juvenil, pipe = ctx.entrenament;      // pipe = pipeline sènior prescrit
    if (!ej || !ej.principal || !pipe) return [];
    const parells = pipe.parells_permesos || [];
    if (ej.principal === ej.secundari && !parells.includes(ej.principal)) {
      return [alerta('ALR_ENTRENAMENT_JUVENIL', null, 'alerta.entrenament_juvenil_igual', { habilitat: ej.principal }, p.urgencia)];
    }
    const servix = [ej.principal, ej.secundari].some((h) => h === pipe.principal || h === pipe.secundari);
    if (!servix) {
      return [alerta('ALR_ENTRENAMENT_JUVENIL', null, 'alerta.entrenament_juvenil_fora',
        { principal: ej.principal, secundari: ej.secundari || '?', pipeline: `${pipe.principal}/${pipe.secundari}` }, p.urgencia)];
    }
    return [];
  },

  // Rellotge de crida (reinici setmanal global): dispara NOMÉS amb la crida disponible
  // i NO gastada esta finestra, i diu quan caduca. Finestra gastada o no oberta: res al
  // parte (línia informativa a Fotrem). Mai una recomanació inexecutable.
  ALR_CRIDA_DISPONIBLE: (ctx, p) => {
    const c = ctx.crida;
    if (!c || !c.disponible) return [];
    return [alerta('ALR_CRIDA_DISPONIBLE', null, 'alerta.crida_disponible', { caduca: c.caducitat }, p.urgencia)];
  },

  // (ALR_CRIDA_SETMANAL desactivada a la migració 032: substituïda pel rellotge de finestra.)
  ALR_CRIDA_SETMANAL: (ctx, p) => {
    const obj = ctx.juvenil_objectiu;
    if (obj == null) return [];
    return (ctx.juvenils || []).length <= obj
      ? [alerta('ALR_CRIDA_SETMANAL', null, 'alerta.crida_setmanal', { actuals: (ctx.juvenils || []).length, objectiu: obj }, p.urgencia)] : [];
  },

  // 3b: si en són més de l'objectiu, rànquing d'eixida dels sobrants (mai per davall).
  ALR_JUVENIL_SOBRANT: (ctx, p) => {
    const obj = ctx.juvenil_objectiu;
    if (obj == null) return [];
    const ids = ranquingEixida(ctx.juvenils || [], obj);
    if (!ids.length) return [];
    const noms = ids.map((id) => ctx.juvenils.find((j) => j.jugador_id === id)?.nom).filter(Boolean).join(', ');
    return [alerta('ALR_JUVENIL_SOBRANT', null, 'alerta.juvenil_sobrant', { sobren: ids.length, objectiu: obj, noms }, p.urgencia)];
  },

  // Punt 2c: REVELACIÓ d'una habilitat com a FET del món (no és instrucció
  // d'alineació): Paco ho celebra al parte. Ho detecta el comparador juvenil.
  ALR_REVELACIO_JUVENIL: (ctx, p) => (ctx.revelacions || [])
    .map((r) => alerta('ALR_REVELACIO_JUVENIL', r.jugador_id, 'alerta.revelacio_juvenil',
      { nom: r.nom, habilitat: r.habilitat, valor: r.valor }, p.urgencia)),

  // NOTA (principi «el parte no parla de l'alineació», polit): ALR_NUCLI_SENSE_MINUTS,
  // ALR_JUVENIL_SUPLENTS i ALR_REVELA_JUVENIL s'han DESACTIVAT (migració 029): allò
  // que es resol alineant viu a les seccions d'alineació (sènior i onze juvenil) amb
  // el motiu visible. La lògica del fre de suplents la usa la secció (freSuplents).
  ALR_JUVENIL_SUPLENTS: (ctx, p) => {
    const js = ctx.juvenils || [];
    if (!js.length) return [];
    const f = freSuplents(js);
    return f.ok ? [] : [alerta('ALR_JUVENIL_SUPLENTS', null, 'alerta.juvenil_suplents', { jugarien: f.jugarien, disponibles: f.disponibles }, p.urgencia)];
  },

  // Jugador sènior sense categoria (rar amb el classificador auto, però xarxa de seguretat).
  ALR_SENSE_CATEGORIA: (ctx, p) => ctx.jugadors
    .filter((j) => !j.categoria)
    .map((j) => alerta('ALR_SENSE_CATEGORIA', j.jugador_id, 'alerta.sense_categoria', { nom: j.nom }, p.urgencia)),



  // Compra accionable: buit d'entrenable amb el filtre concret i el pressupost màxim.
  ALR_COMPRA_ENTRENABLE: (ctx, p) => {
    const c = ctx.compra;
    if (!c) return [];
    const gaps = (c.filtres || []).filter((f) => f.rol === 'core' && f.falten > 0);
    if (!gaps.length) return [];
    return gaps.map((f) => {
      // P3/P8: el que es pot gastar és caixa_disponible. El full NO reparteix el
      // pressupost entre buits ni n'aparta un percentatge.
      const pressupost = c.caixa_disponible != null && c.caixa_disponible > 0 ? c.caixa_disponible : null;
      const base = { falten: f.falten, posicions: (f.posicions || []).join('/'), edat_max: f.edat_max, creativitat_min: f.creativitat_min, pressupost };
      return alerta('ALR_COMPRA_ENTRENABLE', null,
        pressupost != null ? 'alerta.compra_core' : 'alerta.compra_core_sense_caixa', base, p.urgencia,
        null, ['pressupost']);
    });
  },

  // Moviment pendent d'apuntar: jugador que ha eixit sense transacció registrada.
  ALR_TRANSACCIO_PENDENT: (ctx, p) => (ctx.pendents_transaccio || [])
    .map((j) => alerta('ALR_TRANSACCIO_PENDENT', j.jugador_id, 'alerta.transaccio_pendent', { nom: j.nom }, p.urgencia)),

  // A un contracte de personal li queden poques setmanes (renovar o buscar).
  ALR_CONTRACTE_PERSONAL: (ctx, p) => (ctx.personal?.membres || [])
    .filter((m) => m.setmanes_contracte != null && m.setmanes_contracte <= p.setmanes_avis)
    .map((m) => alerta('ALR_CONTRACTE_PERSONAL', null, 'alerta.contracte_personal',
      { nom: m.tipus || m.rol, setmanes: m.setmanes_contracte }, p.urgencia)),

  // L'entrenament configurat a HT (confirmat) no coincidix amb el que prescriu la fase.
  ALR_ENTRENAMENT_DESQUADRE: (ctx, p) => {
    const pr = ctx.entrenament, co = ctx.entrenament_confirmat;
    if (!pr || !co) return [];
    const difs = ['tipus', 'intensitat', 'resistencia'].filter((k) => co[k] != null && String(co[k]) !== String(pr[k]));
    if (!difs.length) return [];
    return [alerta('ALR_ENTRENAMENT_DESQUADRE', null, 'alerta.entrenament_desquadre',
      { prescrit: `${pr.tipus} ${pr.intensitat}% (res ${pr.resistencia}%)`,
        teu: `${co.tipus || '?'} ${co.intensitat ?? '?'}% (res ${co.resistencia ?? '?'}%)` }, p.urgencia)];
  },



  // Finestra de compra: depressió de mercat (preus baixos) amb el nucli incomplet.
  // v3: la compra la governa el bucle d'estoc (PAS 8, caixa cobrada); ací només queda
  // el senyal de mercat barat quan encara falten jugadors.
  ALR_FINESTRA_MERCAT: (ctx, p) => {
    const m = ctx.mercat;
    if (!m) return [];
    const nucliPle = !!ctx.compra?.nucli_ple;
    if (nucliPle) return [];                                       // nucli ple → res a comprar
    // Nucli amb BUIT real: immediatesa (comprar ja a la depressió = acció de HUI).
    if (m.depressio) return [alerta('ALR_FINESTRA_MERCAT', null, 'alerta.finestra_mercat_ara', {}, p.urgencia)];
    // 3e: «depressió d'ací a N setmanes» és informatiu (ves fent caixa) → fora de
    // l'informe; viu a Mercat. No es dispara abans d'hora.
    return [];
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
