// Tonico — VENDRE (contracte v3.1, PAS 7). Allibera sou i genera caixa.
//
//   motiu_venda(j) = pic de valor | sou desproporcionat | sobrant
//   ordre_venda    = ORDENA(candidats; sobrecost DESC)
//   destí(j)       = lesionat → agenda · depressió profunda → agenda · si no → llista HUI
//   destí(deserta) = SI(j ∈ sobrants; despatxa'l; TRIA(eixides))
//
// SENSE ESTIMACIÓ DE PREU (v3.1). Abans hi havia `preu_esperat`, `valor_net` i un criteri de
// «despatxar» que comparava una previsió contra un llindar (tot això vivia a lib/preu.js, ara
// esborrat). No canviava cap decisió que no es puga prendre millor amb el fet real: l'orde el
// porta `sobrecost` —una xifra pròpia, no una previsió— i «es ven o s'acomiada» el decidix la
// SUBHASTA. Tonico no diu quant val un jugador perquè no ho sap: ho sap el mercat, i el
// resultat entra com a venda cobrada (estoc, PAS 8).

// LA SUBHASTA DESERTA NO ES PREGUNTA: ES DEDUÏX.
//
// Si un jugador estava `transferible` i ara ja no ho està, hi ha exactament dos casos, i el
// CSV els distingix sol:
//   · ja no és a la plantilla  → l'han comprat (i el motiu de baixa ja té el seu camí)
//   · seguix a la plantilla    → la subhasta va quedar DESERTA: ningú el vol al preu que fóra
//
// Preguntar-ho era demanar-li a Miquel una cosa que el sistema ja sap. El que sí que canvia és
// què fer amb ell: si sobra —no té lloc a cap dels dos onzes— passa a DESPATXABLE, i eixa
// marca viu a la plantilla, que és on es decidix qui es queda.
export function subhastaDeserta({ transferible_abans, transferible_ara, en_plantilla = true } = {}) {
  const eraLlistat = Number(transferible_abans) === 1;
  const jaNoHoEs = Number(transferible_ara) !== 1;       // buit, 0 o absent
  return eraLlistat && jaNoHoEs && en_plantilla;
}

// destí(desert): un SOBRANT desert es despatxa — no té lloc a cap dels dos onzes i cada
// rellistat torna a pagar la taxa. Un retingut, un rotatiu o un cos MAI: per a ells una
// subhasta deserta no és un veredicte sobre el jugador, és que el preu no era el bo.
export function despatxable({ es_sobrant = false, desert = false } = {}) {
  return !!(es_sobrant && desert);
}

// motiu_venda(j) (PAS 7): per què este jugador ix.
//
// EL STOPPER: sense `calibrat` no s'emet MAI «sou desproporcionat». Eixe motiu penja de
// `sobrecost`, que penja de `nivell_objectiu`, que penja del flux: mentre el flux siga la
// lectura d'un parell de setmanes és soroll, i desfer-se d'algú per soroll no es desfà.
// Els altres dos motius no en depenen —l'edat i l'estructura de plantilla— i seguixen vius.
export function motiuVenda(jugador, { esRotatiu = false, temporada, horitzo_eixida,
  sobrecost = 0, enVenda = false, calibrat = false } = {}) {
  if (esRotatiu && temporada != null && horitzo_eixida != null && temporada >= horitzo_eixida) return 'pic_de_valor';
  if (calibrat && sobrecost > 0) return 'sou_desproporcionat';
  if (enVenda) return 'sobrant';
  return null;
}

// ordre_venda: qui més sou desproporcionat porta ix primer. Abans hi havia un segon criteri
// (`preu_esperat DESC`) que ordenava per una xifra inventada; ara l'orde el porta una xifra
// pròpia i prou.
export function ordreVenda(candidats) {
  return [...candidats].sort((a, b) => (b.sobrecost ?? 0) - (a.sobrecost ?? 0));
}

// urgent(j): el v3 ho reduïx a l'aniversari. La clàusula de porter valuós era del model
// fàbrica (la governava la Junta, retirada a L0) i el full no la contempla.
export function urgent(diesAniversari, diesUrgencia) {
  if (diesAniversari == null || diesUrgencia == null) return false;
  return diesAniversari <= diesUrgencia;
}

// destí(j) (PAS 7). `depressio_profunda` va en FRACCIÓ, les mateixes unitats que el
// modificador de mercat: en enters (−20 contra −0,15) la branca no s'activava MAI.
// La branca de «despatxa per valor_net baix» ha caigut amb l'estimació de preu: ara TOT
// candidat es llista, i qui decidix si s'acomiada és la subhasta (destiDeserta).
export function desti(jugador, { lesionat = false, modificador_tancament, depressio_profunda,
  urgent: urg = false } = {}) {
  if (lesionat) return { accio: 'agenda_llistar_en_recuperar', motiu: 'lesionat' };
  if (modificador_tancament != null && depressio_profunda != null
    && modificador_tancament <= depressio_profunda && !urg) {
    return { accio: 'agenda_llistar', motiu: 'depressio_profunda' };
  }
  return { accio: 'llista_hui', motiu: urg ? 'urgent' : 'normal' };
}

// La millor habilitat d'un jugador. Es queda perquè és una lectura del CSV que fa servei fora
// del preu (ordenacions i vistes), no un càlcul de valor.
export const HABILITATS = ['porteria', 'defensa', 'creativitat', 'passades', 'extrem', 'anotacio', 'pilota_aturada'];

export function habilitatMax(jugador) {
  return Math.max(0, ...HABILITATS.map((h) => Number(jugador?.[h] ?? 0)));
}
