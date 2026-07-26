// Tonico — BUCLE D'ESTOC (contracte v3.1, PAS 8). Només amb caixa COBRADA.
//
//   -- ESTADI: PRIORITAT ABSOLUTA (v3.1). No competix per eficiència.
//   admissible(estadi) = estadi_cost_obra ≤ caixa_disponible
//                        I flux − per_periode(Δmanteniment) ≥ reserva_flux
//   -- JUGADOR: només si l'estadi ja no demana res
//   guany(jugador) = mancança(lloc) × pes(lloc)
//   cost(jugador)  = preu de mercat del candidat REAL (mai estimat)
//   admissible     = preu ≤ caixa_disponible I sou ≤ pressupost_sou(lloc)
//
// PER QUÈ L'ESTADI VA PRIMER I NO COMPETIX: és l'única compra que MOU EL FLUX. Un fitxatge
// consumix el pressupost; l'estadi aixeca el pressupost mateix, i amb ell el nivell_objectiu
// de TOTS els llocs alhora. Optimitzar dins de la restricció i relaxar la restricció no són
// del mateix rang.
//
// AÇÒ ÉS EL QUE VA CAURE, i per què (v3.1): `guanyEstadi` i `deltaFlux` calculaven el guany
// de l'obra NOMÉS des de l'estalvi de manteniment. Ampliar afig seients i més seients costen
// més manteniment → Δflux < 0 → el pressupost baixa a tots els llocs → deltaNivell = 0 pertot
// → guany = 0 SEMPRE. L'estadi només podia «guanyar» la comparació encongint-se. Amb la
// prioritat absoluta la comparació no es fa mai, i tot eixe bloc sobra.
//
// I NO es projecta el que l'obra ingressarà (invariant 3): no fa falta predir-ho, s'OBSERVA
// al període següent quan es declara la taquilla nova.

export function guanyJugador(mancanca, pes) {
  if (mancanca == null || pes == null) return null;
  return Math.round(mancanca * pes * 10000) / 10000;
}

export function admissibleJugador(candidat, { caixa_disponible, pressupost_sou_lloc }) {
  if (caixa_disponible == null) return false;                 // sense estoc no es compra
  if (Number(candidat.preu ?? Infinity) > caixa_disponible) return false;
  if (pressupost_sou_lloc != null && Number(candidat.sou ?? 0) > pressupost_sou_lloc) return false;
  return true;
}

// Δmanteniment: el que l'obra afig (o lleva) de manteniment SETMANAL. Positiu = costa més.
export function deltaManteniment(mantenimentActual, mantenimentNou) {
  if (mantenimentActual == null || mantenimentNou == null) return null;
  return mantenimentNou - mantenimentActual;
}

// L'obra és admissible si es paga amb caixa cobrada I el flux la sosté deixant la reserva
// intacta. Conservador a posta: no compta cap ingrés futur, perquè no es projecta.
export function admissibleEstadi({ cost, caixa_disponible, flux, delta_manteniment,
  setmanes_periode = 1, reserva_flux = 0 }) {
  if (caixa_disponible == null || cost == null) return false;
  if (cost > caixa_disponible) return false;
  if (flux == null || delta_manteniment == null) return false;
  return flux - delta_manteniment * setmanes_periode >= reserva_flux;
}

// estadi_caduc: els números de la calculadora externa caduquen a `setmanes_caducitat_estadi`.
// Sense data declarada no són «caducs», és que falten — i qui ho consumix ho ha de dir.
export function estadiCaduc(estadiData, hui, setmanesCaducitat) {
  if (!estadiData || !hui || setmanesCaducitat == null) return false;
  const dies = (new Date(hui) - new Date(estadiData)) / 86400000;
  return Number.isFinite(dies) && dies > setmanesCaducitat * 7;
}

export function eficiencia(guany, cost) {
  if (guany == null || !cost) return null;
  return Math.round((guany / cost) * 1e8) / 1e8;
}

// La decisió del PAS 8. L'ESTADI VA PRIMER, sempre que siga admissible i els seus números no
// estiguen caducs. Només si l'estadi no demana res es mira cap jugador; entre jugadors manda
// l'eficiència si hi ha candidat amb preu real, i si no, el guany (mancança × pes).
export function decisioEstoc(opcions) {
  const estadi = opcions.find((o) => o.tipus === 'estadi' && o.admissible && !o.caduc);
  if (estadi) return estadi;
  const admissibles = opcions.filter((o) => o.tipus !== 'estadi' && o.admissible);
  if (!admissibles.length) return null;
  return [...admissibles].sort((a, b) => (b.eficiencia ?? -1) - (a.eficiencia ?? -1)
    || (b.guany ?? -1) - (a.guany ?? -1))[0];
}
