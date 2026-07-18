// Tonico — personal i entrenament (Fase 8). Pur: compara el personal declarat
// amb l'esperat per la fase i llista els canvis (amb costos) d'un canvi de fase.
export function comparaPersonal(esperatPersonal, declarat) {
  const diffs = [];
  for (const [clau, val] of Object.entries(esperatPersonal || {})) {
    const dec = declarat[clau] ?? 0;                  // no declarat = 0
    if (dec !== val) diffs.push({ clau, esperat: val, declarat: dec });
  }
  return diffs;
}

// Checklist d'un canvi cap a una fase: personal a assolir + canvis amb import.
export function checklistCanviFase(configNova, declarat) {
  return {
    personal: comparaPersonal(configNova.personal, declarat),
    canvis: configNova.canvis || [],
    cost_total: (configNova.canvis || []).reduce((n, c) => n + (c.cost || 0), 0),
  };
}
