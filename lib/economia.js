// Tonico — economia (Fase 5). Els imports es guarden SIGNATS (ingressos +,
// despeses −). Caixa, marges per fornada (compres vs vendes) i projecció cap al
// capital objectiu de la inflexió (pom del pla).
const INGRESSOS = ['venda', 'ingres_patrocini', 'taquilla'];

// Signe segons el tipus (l'API guarda ja l'import signat amb esta funció).
export function signa(tipus, import_) {
  const abs = Math.abs(import_);
  if (INGRESSOS.includes(tipus)) return abs;
  if (tipus === 'altres') return import_;             // l'usuari en tria el signe
  return -abs;                                        // compra, sou, personal, estadi...
}

export async function economia(db, usuariId) {
  const caixa = (await db.prepare('SELECT COALESCE(SUM(import),0) c FROM transaccions WHERE usuari_id=?').bind(usuariId).first()).c;

  const { results: marges } = await db.prepare(
    `SELECT f.lletra,
            COALESCE(SUM(CASE WHEN t.tipus='compra' THEN t.import ELSE 0 END),0) AS compres,
            COALESCE(SUM(CASE WHEN t.tipus='venda'  THEN t.import ELSE 0 END),0) AS vendes
       FROM transaccions t
       JOIN fornades_jugadors fj ON fj.jugador_id = t.jugador_id
       JOIN fornades f ON f.id = fj.fornada_id
      WHERE t.usuari_id = ? GROUP BY f.lletra ORDER BY f.lletra`
  ).bind(usuariId).all();
  const margesFornada = marges.map((m) => ({ fornada: m.lletra, compres: m.compres, vendes: m.vendes, marge: m.compres + m.vendes }));

  const pla = await db.prepare('SELECT parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  const objectiu = pla?.parametres ? (JSON.parse(pla.parametres).capital_objectiu ?? null) : null;
  const projeccio = objectiu != null ? { objectiu, caixa, falta: objectiu - caixa, percentatge: objectiu ? Math.round((caixa / objectiu) * 100) : null } : null;

  return { caixa, margesFornada, projeccio };
}
