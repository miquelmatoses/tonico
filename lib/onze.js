// Tonico — ALINEACIONS (contracte v3, PAS 9). Greedy per fórmula, sense excepcions
// cablejades:
//
//   llocs ordenats per pes DESC, partit ASC
//   disponible(j,lloc) = j ∈ retinguts I ¬llistat I ¬lesionat
//                      I ¬(sancionat I partit = lliga)
//                      I partits_assignats(j) < max_partits(j)
//   valor(j,lloc) = SI(entrenable(lloc) I j ∈ core ∪ rotatius; `pes_entrenament`;
//                      hab(j, habilitat_lloc(lloc)))
//   jugador(lloc) = PRIMER(ORDENA(FILTRA(retinguts; disponible);
//                                 valor DESC, partits_assignats ASC, sou ASC))
//   buit(lloc)    = ∅ → es juga amb un menys
//   comptabilitat(j) = SUMA(pct dels llocs assignats)
//
// L'11A ix primer (el rol competitiu) perquè els llocs de més pes es cobrixen abans; l'11B
// queda com a onze d'entrenament, que és el que garantix els minuts del nucli.
import { maxPartits } from './plantilla.js';

const num = (v) => (v == null ? 0 : Number(v));
// Arriba al nivell del lloc o no hi arriba. La vista només tria classe amb això.
export const senyalDif = (d) => (d == null ? null : d < 0 ? 'baix' : 'alt');
const NUCLI = new Set(['core', 'rotatiu']);
// «j ∈ retinguts» (PAS 9): només els rols del PAS 6 s'alineen. Sense este filtre, qualsevol
// del sobrant entrava a l'onze — i un porter en venda acabava ocupant un lloc de camp.
const RETINGUTS = new Set(['core', 'rotatiu', 'titular', 'porter', 'cos', 'futur_entrenador']);

// valor(j, lloc): en un lloc que entrena, el que val és ENTRENAR (per això el nucli hi va
// amb un pes propi); en un lloc que no entrena, el que val és l'habilitat del lloc.
export function valorEn(jugador, lloc, pesEntrenament) {
  if (lloc.entrena && NUCLI.has(jugador.categoria)) return pesEntrenament;
  return num(jugador[lloc.habilitat]);
}

// PAS 9. `retinguts` porten {jugador_id, categoria, habilitats, sou, llistat, lesionat,
// sancionat}; `llocs` porten {lloc, entrena, pct, habilitat, pes}; `partits` són els rols.
export function alineaOnzes(retinguts, llocs, partits, opts = {}) {
  const { pes_entrenament = 1000,
    partit_lliga = partits[0]?.id ?? null, vetats = [], fixats = {} } = opts;
  const vetat = new Set(vetats);
  const assignats = {};                 // jugador_id → [{partit, lloc, pct}]
  const nAssignats = (id) => (assignats[id] || []).length;
  const onze = {};
  partits.forEach((p) => { onze[p.id] = []; });

  // Els llocs de tots els partits, ordenats per pes DESC i partit ASC: primer es cobrix el
  // que més aporta, i entre iguals el partit competitiu.
  const totsElsLlocs = [];
  partits.forEach((p, iPartit) => {
    llocs.forEach((l) => totsElsLlocs.push({ ...l, partit: p.id, iPartit }));
  });
  totsElsLlocs.sort((a, b) => (b.pes ?? 0) - (a.pes ?? 0) || a.iPartit - b.iPartit);

  const pctDe = (l) => (l.entrena ? (l.pct ?? 100) : 0);
  // max_partits(j) depén del LLOC QUE OCUPA, no del lloc candidat: qui ja està en un lloc
  // que entrena al 100% no pot doblar en cap altre (la seua setmana ja està feta ahí).
  // Un lloc que NO entrena té pct 0, i 0 < 100: qui l'ocupa POT jugar els dos partits (no
  // hi ha entrenament que diluir). Els qui no poden doblar són els d'un lloc al 100%, perquè
  // el mateix lloc de l'altre partit ha d'anar a un rotatiu, que també ha d'entrenar.
  const maxDe = (j, candidat) => {
    const seus = assignats[j.jugador_id] || [];
    const pcts = [...seus.map((a) => a.pct), candidat.entrena ? (candidat.pct ?? 100) : 0];
    return Math.min(...pcts.map((pct) => maxPartits(j.categoria, pct)));
  };
  // L'ANELL de la plaça: quant d'entrenament hi ha en joc. El calcula l'avaluador perquè
  // la vista no haja de comparar percentatges (invariant 12).
  const anellDe = (l, j) => {
    if (!j) return 'buit';
    if (!l.entrena) return '';
    return (l.pct ?? 100) >= 100 ? 'ple' : 'mig';
  };
  const posa = (j, l) => {
    (assignats[j.jugador_id] ||= []).push({ partit: l.partit, lloc: l.lloc, pct: pctDe(l) });
    onze[l.partit].push({ ...l, jugador: j, anell: anellDe(l, j) });
  };

  // Els FIXATS manuals van primer (invariant 5: els overrides són sagrats).
  for (const l of totsElsLlocs) {
    const idFixat = fixats[`${l.partit}|${l.lloc}`];
    const j = idFixat != null ? retinguts.find((x) => x.jugador_id === idFixat) : null;
    if (j) posa(j, l);
  }

  for (const l of totsElsLlocs) {
    if (onze[l.partit].some((x) => x.lloc === l.lloc)) continue;      // ja ocupat (fixat)
    const disponible = (j) => RETINGUTS.has(j.categoria)      // «j ∈ retinguts» del full
      && !vetat.has(j.jugador_id)
      && !j.llistat && !j.lesionat
      && !(j.sancionat && l.partit === partit_lliga)
      && nAssignats(j.jugador_id) < maxDe(j, l)
      && !(assignats[j.jugador_id] || []).some((a) => a.partit === l.partit);
    const candidats = retinguts.filter(disponible).sort((a, b) =>
      valorEn(b, l, pes_entrenament) - valorEn(a, l, pes_entrenament)
      || nAssignats(a.jugador_id) - nAssignats(b.jugador_id)
      || num(a.sou) - num(b.sou));
    if (candidats.length) posa(candidats[0], l);
    else onze[l.partit].push({ ...l, jugador: null, anell: 'buit' });               // buit: es juga amb un menys
  }

  // comptabilitat(j) = SUMA(pct dels llocs assignats). És el que diu si un del nucli ha
  // completat la setmana d'entrenament.
  const comptabilitat = retinguts
    .filter((j) => NUCLI.has(j.categoria))
    .map((j) => ({
      jugador_id: j.jugador_id, nom: j.nom, categoria: j.categoria,
      partits: assignats[j.jugador_id] || [],
      total: (assignats[j.jugador_id] || []).reduce((a, x) => a + x.pct, 0),
    }));

  const buits = totsElsLlocs.filter((l) => onze[l.partit].some((x) => x.lloc === l.lloc && !x.jugador));
  return { onze, comptabilitat, assignats, buits: buits.map((l) => ({ partit: l.partit, lloc: l.lloc })) };
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
export function assignaEstructura(jugadors, llocs) {
  const id = (j) => j.id ?? j.jugador_id;
  const lliures = new Set(jugadors.map(id));
  const ordenats = [...llocs].sort((a, b) => (b.pes ?? 0) - (a.pes ?? 0));
  const out = [];
  for (const l of ordenats) {
    let tria = null;
    for (const j of jugadors) {
      if (!lliures.has(id(j))) continue;
      if (tria == null) { tria = j; continue; }
      const h = num(j[l.habilitat]), hb = num(tria[l.habilitat]);
      // Habilitat DESC; a igualtat, el més barat (com al PAS 9) i després l'id, per a que
      // l'assignació siga la mateixa cada volta i no balle entre pujades.
      if (h > hb || (h === hb && (num(j.sou) < num(tria.sou)
        || (num(j.sou) === num(tria.sou) && id(j) < id(tria))))) tria = j;
    }
    if (tria) lliures.delete(id(tria));
    // LA DIFERÈNCIA entre el que té i el que el lloc demana, en l'escala de Hattrick. Signada:
    // negativa vol dir que no arriba, positiva que va sobrat. Es calcula ací i no a la vista
    // (invariant 12), i sense objectiu no se n'inventa cap.
    const dif = tria == null || l.nivell_objectiu == null
      ? null : num(tria[l.habilitat]) - l.nivell_objectiu;
    // El SENYAL el tria l'avaluador, no la vista: la vista no compara res (invariant 12).
    out.push({ ...l, jugador: tria ?? null, diferencia: dif, senyal: senyalDif(dif) });
  }
  // Es torna en l'ordre de la formació, no en el de tria: la pantalla es llig per línies.
  const posicio = new Map(llocs.map((l, i) => [l.lloc, i]));
  out.sort((a, b) => posicio.get(a.lloc) - posicio.get(b.lloc));
  return { onze: out, sobrants: jugadors.filter((j) => lliures.has(id(j))) };
}
