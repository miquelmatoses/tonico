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

// La clau d'un tipus de fitxatge: EL QUE ES BUSCA, no el lloc que ho demana. Els tres llocs de
// mig centre comparteixen perfil, o siga que són un sol fitxatge i un sol preu.
//
// I LA CLAU PORTA EL PERFIL SENCER, no un nivell. El preu no és el d'«un mig centre»: és el
// d'un mig centre amb estes habilitats. El dia que el pressupost puge, el perfil canvia, la
// clau canvia i el preu vell deixa de valdre — que és el correcte, perquè ja no busques el
// mateix jugador. Amb la clau vella («mc:9») el preu d'un jugador es reutilitzava per a un
// altre de més car.
//
// No obliga a redeclarar res cada setmana: el preu només es demana quan hi ha una necessitat
// de veres, i una necessitat no apareix fins que el forat passa `distancia_min`. Com a molt hi
// ha un preu per bucket de la formació, i normalment un o dos.
const detallClau = (d) => (d && typeof d === 'object'
  ? Object.keys(d).sort().map((h) => h.slice(0, 3) + d[h]).join('-') : d);
export const clauFitxatge = (tipus, bucket, detall) =>
  (tipus === 'porter_suplent' ? 'porter_suplent'
    // L'ENTRENABLE VA PER NIVELL, i és correcte: l'entrenament és d'UNA habilitat, o siga que
    // el que li demanes a un jove és un mínim en eixa i prou.
    : tipus === 'entrenable' ? `entrenable:${detallClau(detall)}`
      : `${bucket}:${detallClau(detall)}`);

// La llista de necessitats, ordenada. `est` és l'eixida d'`onzeEstructura`.
//
// L'ORDE ÉS LA DIFERÈNCIA I PROU: quants nivells li falten al lloc per a arribar al que el
// flux paga. Abans es multiplicava pel PES del lloc a la formació («mancança × pes») i el
// resultat era un número que no es pintava enlloc: l'únic que en veies era quina fitxa anava
// dalt, i per a decidir això no cal una mètrica composta que ningú pot comprovar d'un colp
// d'ull. Amb la diferència, l'ordre de la pantalla es llig sol.
export function necessitats(est, opts = {}) {
  const { entrenable_min = null, distancia_min = null } = opts;
  if (!est) return [];
  const out = [];

  // 1 · Les places buides, amb prioritat per damunt de tot.
  const jaEntrenen = est.entrenables?.length ?? 0;
  const buides = Math.max(0, (est.entrenables_max ?? 0) - jaEntrenen);
  if (buides > 0 && entrenable_min != null) {
    out.push({ tipus: 'entrenable', bucket: 'mc', nivell: entrenable_min, quants: buides,
      clau: clauFitxatge('entrenable', 'mc', entrenable_min), distancia: Infinity,
      motiu: 'placa_entrenament_buida' });
  }
  if (!est.porter_suplent) {
    out.push({ tipus: 'porter_suplent', bucket: 'porter', nivell: null, quants: 1,
      clau: clauFitxatge('porter_suplent'), distancia: Infinity, motiu: 'sense_porter_suplent' });
  }

  // 2 · Els llocs de l'onze que es queden CURTS respecte de l'objectiu. Menys de
  // `distancia_min` no compta: un nivell s'arregla entrenant o esperant.
  //
  // I NOMÉS PER BAIX. Un lloc amb algú per DAMUNT del que el flux paga està igual de fora de
  // lloc, però no es pot arreglar comprant: l'assignació tria per a cada lloc el millor de
  // l'habilitat, o siga que si fitxes algú al nivell prescrit, el que ja hi era —que és
  // millor— es torna a quedar el lloc i el nou se'n va al residu. L'única acció possible és
  // vendre el sobrat, i eixa ja la diu el `sobrecost` (PAS 7).
  //
  // S'agrupen per BUCKET i NIVELL: dos llocs de mig centre que demanen el mateix són el
  // mateix fitxatge.
  // SENSE LLINDAR DECLARAT no es filtra res per distància: el número és un pom (invariant 8) i
  // ací no se n'inventa cap. Vivia com a valor per defecte d'este paràmetre i ningú li'n
  // passava cap, o siga que el 2 del codi era l'únic que manava i no es podia tocar sense
  // desplegar.
  const perClau = new Map();
  for (const l of distancia_min == null ? [] : est.onze) {
    if (l.perfil_objectiu == null) continue;
    // UN LLOC SENSE NINGÚ va amb les places buides, per damunt de tot. El full ja ho deia
    // («buit → es juga amb un menys, i es diu») i ací es saltava: `diferencia` és null quan
    // no hi ha ocupant, i el `continue` el treia de la llista. O siga que el senyal més fort
    // que hi ha —ahí no juga ningú— era l'únic que no produïa res. Només passa amb la
    // plantilla per davall d'onze jugadors de camp, que és justament quan més falta fa.
    // Amb perfil declarat, `distancia` només és null si el lloc no té ocupant.
    const buit = l.distancia == null;
    if (!buit && l.distancia < distancia_min) continue;
    const clau = clauFitxatge('lloc', l.bucket, l.perfil_objectiu) + (buit ? ':buit' : '');
    const p = perClau.get(clau) ?? { tipus: 'lloc', bucket: l.bucket, perfil: l.perfil_objectiu,
      clau, quants: 0, distancia: buit ? Infinity : 0,
      motiu: buit ? 'lloc_buit' : 'distancia' };
    p.quants += 1;
    if (!buit) p.distancia = Math.max(p.distancia, l.distancia);     // el que pitjor està del grup
    perClau.set(clau, p);
  }
  out.push(...perClau.values());
  // Les places buides primer (`distancia` infinita): una plaça d'entrenament sense ningú és
  // entrenament perdut cada setmana i no es recupera. Després, qui més lluny està.
  return out.sort((a, b) => b.distancia - a.distancia);
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
  // UN LLOC DE L'ONZE es busca amb el PERFIL: mínim per habilitat. El cercador de Hattrick
  // ho admet, i és el mateix perfil que mesura l'ocupant — un sol càlcul, dos usos. Amb una
  // sola habilitat li demanaves «creativitat 9» a un lloc que en vol quatre.
  return { ...base, perfil: n.perfil };
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
