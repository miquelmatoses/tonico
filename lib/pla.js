// Tonico — pla mestre (Fase 4). Estat del pla amb la realitat sobreposada:
// temporada actual, fase, i retards (eixides de fornada previstes que encara no
// s'han fet perquè els jugadors segueixen classificats com a entrenables).
export async function estatPla(db, usuariId) {
  const pla = await db.prepare('SELECT id, plantilla, fase_actual, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;

  const tempSetmanes = parseInt((await db.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = equip ? await db.prepare('SELECT temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first() : null;
  const temporadaActual = inst && inst.temporada != null
    ? inst.temporada + (inst.setmana_temporada >= tempSetmanes ? 1 : 0) : null;

  const { results: temporades } = await db.prepare(
    'SELECT temporada, divisio_prevista, mode, accions_previstes FROM plans_temporades WHERE pla_id=? ORDER BY temporada'
  ).bind(pla.id).all();

  // Entrenables per fornada (per detectar eixides pendents)
  const { results: entrenablesPerFornada } = await db.prepare(
    `SELECT f.lletra, COUNT(*) n FROM fornades f
       JOIN fornades_jugadors fj ON fj.fornada_id=f.id
       JOIN (SELECT cj.jugador_id, cj.categoria FROM categories_jugador cj
              JOIN (SELECT jugador_id, MAX(id) mid FROM categories_jugador GROUP BY jugador_id) m ON cj.id=m.mid) c
         ON c.jugador_id=fj.jugador_id
      WHERE f.usuari_id=? AND c.categoria='entrenable' GROUP BY f.lletra`
  ).bind(usuariId).all();
  const encaraEntrenen = new Map(entrenablesPerFornada.map((r) => [r.lletra, r.n]));

  const files = temporades.map((t) => {
    const accions = t.accions_previstes ? JSON.parse(t.accions_previstes) : {};
    const estat = temporadaActual == null ? 'futura'
      : t.temporada < temporadaActual ? 'passada'
        : t.temporada === temporadaActual ? 'actual' : 'futura';
    const retard = [];
    if (temporadaActual != null && t.temporada <= temporadaActual) {
      for (const lletra of accions.eixides_fornada || []) {
        const n = encaraEntrenen.get(lletra) || 0;
        if (n > 0) retard.push(`${lletra}: ${n} encara entrenen`);
      }
    }
    return { temporada: t.temporada, divisio_prevista: t.divisio_prevista, mode: t.mode, accions, estat, retard };
  });

  return {
    plantilla: pla.plantilla, fase_actual: pla.fase_actual,
    parametres: pla.parametres ? JSON.parse(pla.parametres) : {},
    temporadaActual, temporades: files,
  };
}
