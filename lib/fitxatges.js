// Tonico — QUÈ FA FALTA FITXAR, i què costa (PAS 8).
//
// Tres orígens, i el primer mana sempre:
//
//   1. PLACES BUIDES d'entrenament i de porter suplent. Una plaça d'entrenament buida és
//      entrenament perdut cada setmana i no es recupera; un porter suplent que falta vol dir
//      que el titular ha de doblar. Van primer siga quina siga la mancança de la resta.
//   2. LLOCS DE L'ONZE amb una distància de més d'un nivell respecte de l'objectiu. Un nivell
//      de diferència s'arregla entrenant o esperant; dos o més ja és un forat estructural.
//   3. I res més: qui arriba al seu nivell no es toca.
//
// El PREU no s'estima (vore migració 088): es declara per TIPUS de fitxatge, i mentre no hi
// siga, la necessitat es veu però no es pot decidir.

// La clau d'un tipus de fitxatge. Un «mig centre de nivell 9» és el mateix per als tres llocs
// de mig centre, o siga que la clau és el que es busca, no el lloc que el demana.
export const clauFitxatge = (tipus, bucket, nivell) =>
  (tipus === 'porter_suplent' ? 'porter_suplent'
    : tipus === 'entrenable' ? `entrenable:${nivell}`
      : `${bucket}:${nivell}`);

// La llista de necessitats, ordenada per prioritat. `est` és l'eixida d'`onzeEstructura` i
// `mancances` la del PAS 5 (per bucket).
export function necessitats(est, opts = {}) {
  const { entrenable_min = null, distancia_min = 2, pesos = {} } = opts;
  if (!est) return [];
  const out = [];

  // 1 · Les places buides, amb prioritat per damunt de tot.
  const jaEntrenen = est.entrenables?.length ?? 0;
  const buides = Math.max(0, (est.entrenables_max ?? 0) - jaEntrenen);
  if (buides > 0 && entrenable_min != null) {
    out.push({ tipus: 'entrenable', bucket: 'mc', nivell: entrenable_min, quants: buides,
      clau: clauFitxatge('entrenable', 'mc', entrenable_min), prioritat: Infinity,
      motiu: 'placa_entrenament_buida' });
  }
  if (!est.porter_suplent) {
    out.push({ tipus: 'porter_suplent', bucket: 'porter', nivell: null, quants: 1,
      clau: clauFitxatge('porter_suplent'), prioritat: Infinity, motiu: 'sense_porter_suplent' });
  }

  // 2 · Els llocs de l'onze que es queden a més d'un nivell de l'objectiu. S'agrupen per
  // BUCKET i NIVELL: dos llocs de mig centre que demanen el mateix són el mateix fitxatge.
  const perClau = new Map();
  for (const l of est.onze) {
    if (l.diferencia == null || l.nivell_objectiu == null) continue;
    if (-l.diferencia < distancia_min) continue;                 // arriba, o li falta un sol nivell
    const clau = clauFitxatge('lloc', l.bucket, l.nivell_objectiu);
    const p = perClau.get(clau) ?? { tipus: 'lloc', bucket: l.bucket, nivell: l.nivell_objectiu,
      clau, quants: 0, mancanca: 0, motiu: 'distancia' };
    p.quants += 1;
    p.mancanca = Math.max(p.mancanca, -l.diferencia);
    perClau.set(clau, p);
  }
  for (const p of perClau.values()) {
    p.prioritat = Math.round(p.mancanca * (pesos[p.bucket] ?? 0) * 10000) / 10000;
    out.push(p);
  }
  return out.sort((a, b) => b.prioritat - a.prioritat);
}

// ELS CRITERIS DE CERCA d'una necessitat. El filtre i la necessitat són la MATEIXA fitxa: el
// filtre diu què teclejar al cercador de Hattrick i la necessitat diu per què fa falta. Abans
// eren dues llistes que es derivaven per camins distints —una comptava categories del PAS 6 i
// l'altra mirava l'assignació— i podien discrepar sobre què falta.
//
// Cada tipus demana una cosa distinta:
//   · un lloc de l'onze → algú que ARRIBE al nivell objectiu; l'edat no importa
//   · un entrenable     → JOVE i per damunt del mínim, perquè el que es compra és el marge
//   · un porter suplent → només la posició: eixe lloc no compra res, es vol el més barat
export function cercaDe(n, opts = {}) {
  const { posicions = {}, habilitats = {}, edat_min = null, edat_max = null, caixa = null } = opts;
  // `sense_caixa` el decidix ACÍ: la vista no compara, només tria text (invariant 12).
  const base = { posicions: posicions[n.bucket] ?? [], pressupost: caixa,
    sense_caixa: !(caixa > 0) };
  if (n.tipus === 'porter_suplent') return { ...base, mes_barat: true };
  if (n.tipus === 'entrenable') {
    return { ...base, edat_min, edat_max, habilitat: { camp: habilitats[n.bucket], min: n.nivell } };
  }
  return { ...base, habilitat: { camp: habilitats[n.bucket], min: n.nivell } };
}

// Amb els preus declarats i la caixa: què es pot comprar hui i què no.
export function ambPreus(llista, preus, caixa, caducitat = null, hui = null) {
  return llista.map((n) => {
    const p = preus.get(n.clau) ?? null;
    const vell = p?.data && caducitat && hui
      ? (Date.parse(hui) - Date.parse(p.data)) / 604800000 > caducitat : false;
    const preu = p?.preu ?? null;
    return { ...n, preu, preu_data: p?.data ?? null, preu_vell: vell,
      // Sense preu no es decidix: es veu la necessitat i es demana el número.
      falta: preu == null ? 'preu' : (caixa != null && preu > caixa ? 'caixa' : null),
      admissible: preu != null && caixa != null && preu <= caixa };
  });
}
