// Tonico — L'ASSIGNACIÓ DE JUGADORS ALS LLOCS (PAS 9).
//
// L'alineació VELLA (`alineaOnzes`, `orquestra_alineacio`) se n'ha anat: repartia sobre les
// categories del PAS 6 —core, rotatiu, titular, cos— i ningú la cridava des de la pantalla des
// que els dos onzes es componen damunt de l'assignació d'estructura. Amb ella se'n va l'últim
// lector de `edat_pic_venda` fora de la classificació.

const num = (v) => (v == null ? 0 : Number(v));
// Arriba al nivell del lloc o no hi arriba. La vista només tria classe amb això.
export const senyalDif = (d) => (d == null ? null : d < 0 ? 'baix' : 'alt');
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
