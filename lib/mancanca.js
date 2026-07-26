// Tonico — MANCANÇA, LA MÈTRICA ÚNICA (contracte v3, PAS 5).
//
//   mancança(lloc)  = MAX(0; nivell_objectiu(lloc) − nivell_actual(lloc))
//   excés(j)        = MAX(0; hab(j, habilitat_lloc) − nivell_objectiu(lloc))
//   sobrecost(j)    = MAX(0; sou(j) − taula_salaris(habilitat_lloc, nivell_objectiu))
//   prioritat(lloc) = mancança(lloc) × pes(lloc)
//
// `prioritat` és la unitat comuna amb què comprar (PAS 8), vendre (PAS 7), obrar l'estadi
// (PAS 8) i contractar personal (PAS 11) competixen pel mateix diner. Tot es mesura igual.

// nivell_actual(lloc) = l'habilitat de l'ocupant en l'habilitat del lloc; 0 si està buit.
export function nivellActual(ocupant, habilitat) {
  if (!ocupant) return 0;
  const v = ocupant[habilitat];
  return v == null ? 0 : Number(v);
}

export function mancanca(nivellObjectiu, nivellActual) {
  if (nivellObjectiu == null) return null;            // sense objectiu no hi ha mancança
  return Math.max(0, nivellObjectiu - nivellActual);
}

export function exces(jugador, habilitat, nivellObjectiu) {
  if (nivellObjectiu == null || !jugador) return null;
  return Math.max(0, nivellActual(jugador, habilitat) - nivellObjectiu);
}

// sobrecost = el que pagues de més respecte del que el lloc mereix segons el pressupost.
export function sobrecost(jugador, habilitat, nivellObjectiu, taulaSalaris) {
  if (!jugador || nivellObjectiu == null) return null;
  const escala = taulaSalaris?.[habilitat];
  if (!escala) return null;
  const souDelNivell = escala[String(nivellObjectiu)] ?? 0;   // nivell 0 → no es paga res
  return Math.max(0, (jugador.sou ?? 0) - souDelNivell);
}

export function prioritat(mancanca_, pes) {
  if (mancanca_ == null || pes == null) return null;
  return Math.round(mancanca_ * pes * 10000) / 10000;
}

// Tot el PAS 5 per a una formació ja avaluada (PAS 4) i una assignació d'ocupants.
// `nivells` = eixida de nivellsObjectiu(); `ocupants` = {lloc: jugador|null}.
export function mancances(nivells, ocupants = {}) {
  const out = {};
  for (const [lloc, n] of Object.entries(nivells)) {
    const ocupant = ocupants[lloc] ?? null;
    const actual = nivellActual(ocupant, n.habilitat);
    const m = mancanca(n.nivell_objectiu, actual);
    out[lloc] = {
      ...n,
      ocupant: ocupant?.jugador_id ?? null,
      nivell_actual: actual,
      mancanca: m,
      prioritat: prioritat(m, n.pes),
    };
  }
  return out;
}

// Els llocs ordenats per prioritat (mancança × pes): l'orde en què val la pena gastar.
export function perPrioritat(mancances_) {
  return Object.entries(mancances_)
    .filter(([, v]) => (v.prioritat ?? 0) > 0)
    .sort((a, b) => b[1].prioritat - a[1].prioritat)
    .map(([lloc, v]) => ({ lloc, ...v }));
}
