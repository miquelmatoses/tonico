// Tonico — INFORME I AGENDA (contracte v3, PAS 12).
//
//   urgencia(acció) = BUSCA(`urgencia_tipus`; tipus(acció))   [pom; MAI a la vista]
//   nivell(acció)   = SI(urgencia ≥ `llindar_urgent`; 'urgent';
//                     SI(urgencia ≥ `llindar_aviat`; 'aviat'; 'normal'))
//   alertes = AGRUPA(ACCIONS amb data = HUI; tipus) ORDENA per urgencia DESC
//   agenda  = ORDENA(ACCIONS amb data > HUI; data)
//   res més és alerta; «de moment res» = informació de secció

// El nivell d'una acció. La vista NOMÉS tria classe amb això: no compara números.
export function nivellAccio(urgencia, { llindar_urgent, llindar_aviat }) {
  if (urgencia == null || llindar_urgent == null || llindar_aviat == null) return 'normal';
  if (urgencia >= llindar_urgent) return 'urgent';
  if (urgencia >= llindar_aviat) return 'aviat';
  return 'normal';
}

// alertes: una línia PER TIPUS (el detall viu a la secció), ordenades per urgència.
export function agrupaAlertes(accions, llindars) {
  const perTipus = new Map();
  for (const a of accions) {
    const t = a.tipus ?? a.regla_codi ?? a.missatge_clau;
    const g = perTipus.get(t) || { tipus: t, n: 0, urgencia: 0, exemples: [] };
    g.n += 1;
    g.urgencia = Math.max(g.urgencia, a.urgencia ?? 0);
    if (g.exemples.length < 3) g.exemples.push(a);
    perTipus.set(t, g);
  }
  return [...perTipus.values()]
    .map((g) => ({ ...g, nivell: nivellAccio(g.urgencia, llindars) }))
    .sort((a, b) => b.urgencia - a.urgencia);
}

// agenda: el que toca un altre dia, per data.
export function ordenaAgenda(accions) {
  return [...accions].sort((a, b) => String(a.data_accio ?? '').localeCompare(String(b.data_accio ?? '')));
}
