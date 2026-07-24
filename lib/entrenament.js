// Tonico — entrenament de la fase (Àrea C). El tipus d'entrenament és contingut
// de la fase, no una constant: en deriven el pipeline (habilitat principal/
// secundària dels juvenils) i les habilitats vendibles per a l'excepció.
export async function entrenamentFase(db, plantilla, fase) {
  const row = await db.prepare('SELECT config FROM fases_config WHERE plantilla=? AND fase=?').bind(plantilla, fase).first();
  const cfg = row ? JSON.parse(row.config) : {};
  return cfg.entrenament || null;
}
