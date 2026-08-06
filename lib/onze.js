// Tonico — L'ASSIGNACIÓ DE JUGADORS ALS LLOCS (PAS 9).
//
// L'alineació VELLA (`alineaOnzes`, `orquestra_alineacio`) se n'ha anat: repartia sobre les
// categories del PAS 6 —core, rotatiu, titular, cos— i ningú la cridava des de la pantalla des
// que els dos onzes es componen damunt de l'assignació d'estructura. Amb ella se'n va l'últim
// lector de `edat_pic_venda` fora de la classificació.

import { equivalent } from './pesos.js';

const num = (v) => (v == null ? 0 : Number(v));
// Arriba al nivell del lloc o no hi arriba. La vista només tria classe amb això.
export const senyalDif = (d) => (d == null ? null : d < 0 ? 'baix' : 'alt');

// ── QUÈ LI FALTA A ESTE LLOC PER A SER EL DE LA PLANTILLA IDEAL ──────────────────────────
// Hi ha una plantilla IDEAL —onze llocs, cada un amb el perfil que el seu pressupost paga— i
// una de REAL. L'única feina és acostar la segona a la primera, i això és el que es mesura ací.
//
// NOMÉS EL QUE FALTA, mai el que sobra. Un jugador millor que el perfil no deixa cap forat: el
// tapa del tot. Comptar l'excés com a distància tornaria a l'error del monocultiu al revés —
// Tonico donaria el lloc al mediocre que s'ajusta i enviaria el bo a venda.
//
// I l'excés no queda impune, però no es cobra ací: es cobra en EUROS (`sobrecost`), que és la
// unitat de veres. El sou és el que va dibuixar la plantilla ideal; si en gastes més del que
// este lloc tenia assignat, eixe diner li falta a un altre lloc i el forat es veu allí.
// Posar-ho als dos costats seria cobrar-ho dues vegades i inventar-se un canvi entre nivells i
// diners que la taula de salaris ja dona.
export function mancances(jugador, lloc) {
  const perfil = lloc?.perfil_objectiu;
  if (!jugador || !perfil) return null;
  const out = {};
  for (const [h, n] of Object.entries(perfil)) {
    const forat = n - num(jugador[h]);
    if (forat > 0) out[h] = forat;
  }
  return out;
}

// ARRIBA O NO ARRIBA, EN CONJUNT. El vector de mancances diu ON li falta, però no sap si el
// jugador va sobrat justament en la que importa.
//
// El cas real: perfil de porter PO4 DF8 (el pressupost no arriba ni al primer esglaó de
// porteria) contra un porter de casa PO6 DF4. Per habilitat li falten 4 de defensa i el sistema
// demanava fitxar — però el de casa APORTA MÉS que el perfil (0,831 contra 0,790). Si li fas
// cas, l'assignació es queda el de casa i el fitxatge se'n va al residu i d'allí a venda: pagar
// per empitjorar. El full ja ho deia («un lloc amb algú per damunt no genera distància: no es
// pot arreglar comprant»); era el codi qui no ho feia.
export function arribaAlPerfil(jugador, lloc) {
  const w = lloc?.pesos_habilitat, perfil = lloc?.perfil_objectiu;
  if (!jugador || !w || !perfil) return null;
  return (equivalent(jugador, w) ?? 0) >= (equivalent(perfil, w) ?? 0);
}

// El forat en UN número, per a ordenar les necessitats: els forats ponderats per quant importa
// cada habilitat en eixe lloc. Queda en nivells de Hattrick —la mateixa escala que abans, i que
// el propi perfil—, o siga que `distancia_min` seguix volent dir «dos nivells».
export function distanciaAlPerfil(mancances, lloc) {
  const w = lloc?.pesos_habilitat;
  if (!mancances || !w) return null;
  const suma = Object.values(w).reduce((a, b) => a + b, 0);
  if (!suma) return null;
  return Object.entries(mancances).reduce((a, [h, forat]) => a + (w[h] ?? 0) * forat, 0) / suma;
}
// ── L'ONZE D'ESTRUCTURA ────────────────────────────────────────────────────────────────
// No és l'alineació de la setmana: és QUI OCUPA CADA LLOC del pla. Serveix per a mesurar,
// i per això no mira lesions, sancions ni minuts jugats — si un MC es lesiona dos setmanes,
// el lloc no ha de quedar buit i fer que Tonico propose comprar-ne un.
//
// I NO PARTIX DE CATEGORIES. Es miren TOTS els jugadors i es col·loquen: els llocs es
// recorren per pes DESC (el que més aporta tria primer) i cada jugador ocupa un lloc només.
// Abans calia decidir abans qui es quedava (PAS 6) per a poder assignar, i mesurar-se feia
// amb «el millor del bucket» —o siga que amb tres llocs de MC només es mesurava el millor i
// MC2 i MC3 no existien—. Ara els ocupants ixen d'ací, lloc a lloc, i els que sobren són
// simplement els que no han entrat.
//
// Mateix criteri que el PAS 9: MAXIMITZACIÓ PURA, sense `compatible`. Un porter en un lloc de
// defensa hi val la seua defensa, i per tant el perd contra un defensa de veres.
// `plus(j, lloc)` és el que el jugador GUANYARÀ ocupant eixe lloc, en les mateixes unitats que
// l'equivalent. Als llocs que entrenen, un jove no val només el que aporta hui: val això més el
// que creixerà. Sense ell, l'assignació posava un de 32 anys al lloc d'extrem —millor hui— i es
// menjava una plaça d'entrenament que no li tornarà res.
export function assignaEstructura(jugadors, llocs, plus = null) {
  const id = (j) => j.id ?? j.jugador_id;
  // El que val un jugador en un lloc: l'equivalent de la seua contribució si el lloc porta els
  // pesos per habilitat, i si no, l'habilitat de sempre. Així un lloc sense matriu declarada no
  // es queda sense criteri. I si el lloc entrena, s'hi suma el que creixerà.
  const val = (j, l) => (l.pesos_habilitat ? (equivalent(j, l.pesos_habilitat) ?? 0) : num(j[l.habilitat]))
    + (plus ? (plus(j, l) ?? 0) : 0);

  // ── EL REPARTIMENT ÒPTIM, NO EL VORAÇ ──────────────────────────────────────────────
  // Es tria l'assignació que maximitza la SUMA de pes(lloc) × el que el jugador hi aporta,
  // mirant els onze llocs alhora (algorisme hongarés). No parella a parella.
  //
  // El voraç anterior —agafar la millor parella i tirar avant— ja va reparar un forat real: el
  // porter és el lloc que menys pesa, es triava l'últim i el millor porter se l'enduia el
  // davanter. Però en deixava un altre, i és el mateix error un pis més amunt: mirar una
  // parella no és mirar el conjunt.
  //
  // El cas que ho va destapar: un davanter de 33 anys que al mig centre val 6,51 i al davanter
  // 7,93. Com que el mig centre PESA més, la parella «mc × ell» valia més que «davanter × ell»
  // i se l'enduia el mig; quan li tocava al davanter ja només quedava un molt pitjor. Es
  // guanyaven 0,06 al mig i se'n perdien 1,93 al davant, i de retruc un jove prometedor queia
  // de l'onze i acabava a venda.
  //
  // A IGUALTAT MANA EL SOU (i després l'id). Els candidats entren ordenats per ahí, i quan dues
  // columnes empaten l'algorisme es queda amb la primera: així dos que rendixen igual no valen
  // igual, i l'onze no balla entre càrregues.
  const cand = [...jugadors].sort((a, b) => num(a.sou) - num(b.sou) || id(a) - id(b));
  // LES PRIMERES N COLUMNES SÓN «BUIT», una per lloc i totes de valor 0. Deixar un lloc sense
  // ningú ha de ser una opció de ple dret, i a més ha de guanyar l'empat contra un jugador que
  // allí no aporta res: eixe fa falta al residu. Com que a igualtat l'algorisme es queda amb la
  // primera columna, posar-les davant ho resol sense cap llindar inventat.
  const N = llocs.length, M = N + cand.length;
  const w = (i, j) => (j < N ? 0 : (llocs[i].pes ?? 0) * val(cand[j - N], llocs[i]));

  // Hongarés (variant Jonker-Volgenant amb potencials). Minimitza, així que es passa el negat.
  const u = new Float64Array(N + 1), v = new Float64Array(M + 1);
  const p = new Int32Array(M + 1), way = new Int32Array(M + 1);
  for (let i = 1; i <= N; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(M + 1).fill(Infinity);
    const usat = new Uint8Array(M + 1);
    do {
      usat[j0] = 1;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= M; j++) {
        if (usat[j]) continue;
        const cur = -w(i0 - 1, j - 1) - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= M; j++) {
        if (usat[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }

  const presos = new Set(), ocupats = new Map();
  for (let j = N + 1; j <= M; j++) {
    const i = p[j];
    if (!i) continue;                                   // jugador que no ha entrat a l'onze
    if (w(i - 1, j - 1) <= 0) continue;                 // ni ocupa un lloc on no aporta res
    const jug = cand[j - N - 1];
    ocupats.set(llocs[i - 1].lloc, jug);
    presos.add(id(jug));
  }

  const out = llocs.map((l) => {
    const tria = ocupats.get(l.lloc) ?? null;
    const man = mancances(tria, l);
    // Si l'ocupant arriba en conjunt, la distància és 0 encara que li falte alguna habilitat:
    // el que li falta no es pot arreglar comprant, perquè l'assignació tornaria a triar-lo a ell.
    const d = man == null ? null : (arribaAlPerfil(tria, l) ? 0 : distanciaAlPerfil(man, l));
    return { ...l, jugador: tria, mancances: man, distancia: d,
      senyal: d == null ? null : d > 0 ? 'baix' : 'alt' };
  });

  // Ja ix en l'ordre de la formació: la pantalla es llig per línies.
  return { onze: out, sobrants: jugadors.filter((j) => !presos.has(id(j))) };
}
