// Tonico — JUVENILS (contracte v3, PAS 10). Els juvenils són PROVEÏDORS DE ROTATIUS: la
// pregunta no és quant valen, sinó si arribaran al nivell que el lloc demana.
//
//   util(j)      = potencial(j, A) ≥ nivell_objectiu(MC)
//   destí(promo) = SI(util; PROMOCIONA (entra com a rotatiu de l'11B);
//                  SI(valor_net_promo > 0; PROMOCIONA_I_LLISTA; DESPATXA))
//   valor_net_promo(j) = preu_esperat(hab_visibles + `bonus_club_mare`)
//                        − `cost_promocio` − sou_estimat × 2
//   sobra = COMPTA(juvenils) − `objectiu_juvenil`   [`objectiu_juvenil` = onze legal + 1]
//   despatxa PRIMERS(sobra; ORDENA(juvenils; NIVELL ASC, n_revelacions ASC))

// util(j): ¿arribarà al nivell que el lloc que entrenem demana? Sense nivell objectiu
// (l'economia encara no el pot dir) no es pot respondre: null, i qui ho consumix ho diu.
export function util(juvenil, habilitatA, nivellObjectiuLloc) {
  if (nivellObjectiuLloc == null) return null;
  const pot = juvenil?.[`${habilitatA}_potencial`];
  if (pot == null || pot === 'desconegut') return null;
  return Number(pot) >= nivellObjectiuLloc;
}

// valor_net_promo: el que trauries de promocionar-lo i vendre'l, net del que costa.
export function valorNetPromo(preuEsperatAmbBonus, { cost_promocio = 0, sou_estimat = 0 } = {}) {
  if (preuEsperatAmbBonus == null) return null;
  return Math.round(preuEsperatAmbBonus - cost_promocio - sou_estimat * 2);
}

// destí(promo): les tres branques del full.
export function destiPromocio({ esUtil, valor_net_promo }) {
  if (esUtil) return 'PROMOCIONA';
  if (valor_net_promo != null && valor_net_promo > 0) return 'PROMOCIONA_I_LLISTA';
  return 'DESPATXA';
}

// objectiu_juvenil = l'onze legal + 1 (derivat, no un número escrit).
export function objectiuJuvenil(minimEnCamp) {
  return minimEnCamp == null ? null : minimEnCamp + 1;
}

// sobra + a qui despatxar: primer els de menys NIVELL i, entre iguals, els MENYS revelats
// (el descartat que ja s'ha descobert es reté: no consumix comentaris de l'entrenador).
export function sobrants(juvenils, objectiu) {
  if (objectiu == null) return [];
  const sobra = juvenils.length - objectiu;
  if (sobra <= 0) return [];
  return [...juvenils]
    .sort((a, b) => (a.nivell ?? 0) - (b.nivell ?? 0)
      || (a.n_revelacions ?? 0) - (b.n_revelacions ?? 0))
    .slice(0, sobra);
}

// reinici_crida = el pròxim (dia d'economia del país, hora + 1h). Sense país declarat no
// se suposa cap horari: torna null i el sistema el demana.
export function reiniciCrida(ara, hores) {
  if (!hores || hores.economia_dia == null || hores.economia_hora == null) return null;
  const d = new Date(ara);
  const objectiuHora = (Number(hores.economia_hora) + 1) % 24;
  const res = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), objectiuHora, 0, 0));
  const diesEndavant = (Number(hores.economia_dia) - res.getUTCDay() + 7) % 7;
  res.setUTCDate(res.getUTCDate() + diesEndavant);
  if (res <= d) res.setUTCDate(res.getUTCDate() + 7);
  return res.toISOString();
}
