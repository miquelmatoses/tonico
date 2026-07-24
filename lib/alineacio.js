// Tonico — motor d'alineació setmanal (Fase 3). Universal: la formació, les
// posicions d'entrenament, els buckets i els ROLS de partit són config (plantilla).
// Objectiu en fàbrica: maximitzar l'entrenament; el resultat NO és variable.
//
// DOCTRINA DE LIQUIDACIÓ, fase 2 — FORA L'APARADOR. No hi ha cap prioritat de
// «mostrar» jugadors a compradors. Tres regles i prou:
//   a) LLISTAT (Transferible=1 o fitxa llistada) → NO JUGA MAI (protecció de
//      l'actiu): ni apareix a l'alineació; la fitxa de venda ja diu que està llistat.
//   b) L'alineació = ENTRENABLES (pels seus blocs) + FUTUR ENTRENADOR (experiència)
//      + FARCIMENT per als llocs restants. Cap altra prioritat.
//   c) El doblatge de farciment es REPARTIX: cap cos juga els dos partits si n'hi
//      ha prou per a alternar (derivat de comptar partits, no d'una llista).
//
// squad: [{jugador_id, nom, posicio, categoria, fornada_eixida, lesionat, suspes,
//          llistat}]
// config: { rols:[{id, competitiu, nom_clau}], slots:[{codi,bucket,entrena,pct}], buckets:{bucket:[pos]} }
// opts: { vetats:[jugador_id], fixats:[{partit, codi, jugador_id}], rols_actius:[id] }
//   rols_actius: si esta setmana només se'n juga un subconjunt (p.ex. sense
//   amistós programat), l'alineador ho declara i recalcula (extrems al 50%).

export function alinea(squad, config, opts = {}) {
  const { slots, buckets } = config;
  const rolsDef = config.rols || [];
  const rolsActius = opts.rols_actius ? rolsDef.filter((r) => opts.rols_actius.includes(r.id)) : rolsDef;
  const partits = rolsActius.map((r) => r.id);                       // ids dels rols en joc esta setmana
  const competitiu = (rolsActius.find((r) => r.competitiu) ?? rolsActius[0])?.id;
  const unaAlineacio = partits.length < rolsDef.length;             // falta algun rol (p.ex. l'amistós)
  const vetats = new Set(opts.vetats || []);
  const bucketDe = (p) => { for (const [b, pos] of Object.entries(buckets)) if (pos.includes(p.posicio)) return b; return null; };
  const perId = new Map(squad.map((p) => [p.jugador_id, p]));
  // (a) El LLISTAT no juga mai: fora de la llista de disponibles (protecció de l'actiu).
  const disp = squad.filter((p) => !p.lesionat && !p.suspes && !p.llistat && !vetats.has(p.jugador_id));

  const onze = {};
  for (const partit of partits) onze[partit] = slots.map((s) => ({ ...s, jugador: null }));
  const usat = new Set();                              // "partit:jugador_id"
  const posaEn = (partit, slot, p) => {
    if (!slot || slot.jugador || usat.has(`${partit}:${p.jugador_id}`)) return false;
    slot.jugador = { jugador_id: p.jugador_id, nom: p.nom, categoria: p.categoria };
    usat.add(`${partit}:${p.jugador_id}`);
    return true;
  };
  const posa = (partit, bucket, p) => posaEn(partit, onze[partit].find((s) => s.bucket === bucket && !s.jugador), p);

  // 0. Fixats manuals (guanyen a tot)
  for (const f of opts.fixats || []) {
    const p = perId.get(f.jugador_id);
    if (p) posaEn(f.partit, onze[f.partit].find((s) => s.codi === f.codi), p);
  }

  // Entrenables (categoria plana): les places d'entrenament ixen del pct de cada slot
  // (derivat de l'entrenament triat, no de noms cablejats). Els buckets al 50% (efecte
  // baix, guia §6) s'omplin els DOS partits (50%+50%=100%); els del 100%, un sol partit.
  // Canviar l'entrenament canvia quins buckets són 100/50 i, per tant, tota esta repartició.
  const entrenables = disp.filter((p) => p.categoria === 'entrenable');
  const buckets50 = [...new Set(slots.filter((s) => s.entrena && (s.pct ?? 100) < 100).map((s) => s.bucket))];
  const buckets100 = [...new Set(slots.filter((s) => s.entrena && (s.pct ?? 100) >= 100).map((s) => s.bucket))];
  const perMatch = (bs) => slots.filter((s) => s.entrena && bs.includes(s.bucket)).length;
  const n50 = perMatch(buckets50), n100 = perMatch(buckets100);
  const posaAlgun = (partit, bs, p) => {
    const s = onze[partit].find((x) => x.entrena && bs.includes(x.bucket) && !x.jugador);
    return s ? posaEn(partit, s, p) : false;
  };
  // Els que DOBLEN (50%): posició natural del bucket 50% primer, després pròxims a la venda.
  const doblats = [...entrenables]
    .sort((a, b) => (buckets50.includes(bucketDe(a)) ? 0 : 1) - (buckets50.includes(bucketDe(b)) ? 0 : 1)
      || (a.fornada_eixida ?? 99) - (b.fornada_eixida ?? 99))
    .slice(0, n50);
  const setDoblats = new Set(doblats.map((p) => p.jugador_id));
  const simples = entrenables.filter((p) => !setDoblats.has(p.jugador_id))
    .sort((a, b) => (a.fornada_eixida ?? 99) - (b.fornada_eixida ?? 99));  // pròxims a la venda → competitiu

  const ordreRols = [competitiu, ...partits.filter((id) => id !== competitiu)];
  for (const p of doblats) for (const partit of partits) posaAlgun(partit, buckets50, p);
  simples.forEach((p, i) => {
    const partit = ordreRols[Math.floor(i / Math.max(1, n100))] ?? null;
    if (partit) posaAlgun(partit, buckets100, p);
  });

  // 3. futur_entrenador → davanter a tots els rols actius
  disp.filter((p) => p.categoria === 'futur_entrenador')
    .forEach((p) => partits.forEach((partit) => posa(partit, 'davanter', p)));

  // (b+c) FARCIMENT per als llocs restants, amb el DOBLATGE REPARTIT. Cap prioritat
  // d'aparador ni de venda: qui no entrena i no és el futur entrenador és cos, i punt.
  // Es recorren tots els buits dels dos onzes i cada un se l'emporta el cos COMPATIBLE
  // que MENYS partits porta (i que encara no juga eixe partit). Així, si hi ha prou
  // cossos per a alternar, ningú dobla; si no n'hi ha, el doblatge es repartix sol.
  // Compatibilitat posicional: un porter només a porteria, i mai un porter al camp.
  const nPartits = (id) => partits.reduce((n, pt) => n + (usat.has(`${pt}:${id}`) ? 1 : 0), 0);
  const cosPool = disp.filter((p) => p.categoria !== 'entrenable' && p.categoria !== 'futur_entrenador');
  for (const partit of partits) {
    for (const slot of onze[partit].filter((s) => !s.jugador)) {
      const volPorter = slot.bucket === 'porter';
      const compatibles = cosPool
        .filter((p) => !usat.has(`${partit}:${p.jugador_id}`) && (bucketDe(p) === 'porter') === volPorter)
        .sort((a, b) => nPartits(a.jugador_id) - nPartits(b.jugador_id));       // el que menys ha jugat primer
      const exacte = compatibles.find((p) => bucketDe(p) === slot.bucket);
      // Prefereix la posició exacta, però no a costa de fer doblar algú havent-hi
      // un cos de camp encara sense partit: mana qui menys porta.
      const cos = exacte && nPartits(exacte.jugador_id) <= (compatibles[0] ? nPartits(compatibles[0].jugador_id) : 0)
        ? exacte : (compatibles[0] || exacte);
      if (cos) posaEn(partit, slot, cos);
    }
  }

  return {
    onze,
    comptabilitat: comptabilitat(onze, disp, partits),
    experiencia: experiencia(onze, disp, partits),
    avisos: avisos(onze, squad, partits, vetats, unaAlineacio),
    rols: rolsActius.map((r) => ({ id: r.id, nom_clau: r.nom_clau, nom_clau_curt: r.nom_clau_curt, competitiu: !!r.competitiu })),
    copa: !!opts.copa,      // partit A de copa → doble experiència per al futur entrenador
  };
}

// Comptabilitat d'ENTRENAMENT: només entrenables. El futur_entrenador (p.ex.
// un futur_entrenador) juga per experiència, no entrena → va a `experiencia`, no ací.
function comptabilitat(onze, disp, partits) {
  return disp.filter((p) => p.categoria === 'entrenable').map((p) => {
    const files = [];
    for (const partit of partits) {
      const slot = onze[partit].find((s) => s.jugador?.jugador_id === p.jugador_id);
      if (slot) files.push({ partit, pct: slot.entrena ? slot.pct : 0 });
    }
    return { jugador_id: p.jugador_id, nom: p.nom, categoria: p.categoria, partits: files, total: files.reduce((n, f) => n + f.pct, 0) };
  });
}

// Juguen per experiència, no entrenen (futur_entrenador): nota pròpia, fora de la taula.
function experiencia(onze, disp, partits) {
  return disp.filter((p) => p.categoria === 'futur_entrenador')
    .filter((p) => partits.some((partit) => onze[partit].some((s) => s.jugador?.jugador_id === p.jugador_id)))
    .map((p) => ({ jugador_id: p.jugador_id, nom: p.nom }));
}

// Cobertura sobre la plantilla SENCERA: quins entrenables no arriben al 100% i
// per què (lesionat/sancionat/vetat/banqueta), i slots buits per partit. Si esta
// setmana falta un rol (una_alineacio), els extrems queden al 50% pel calendari,
// no per banqueta: es declara una volta i no es compta com a entrenament perdut.
function avisos(onze, squad, partits, vetats, unaAlineacio) {
  const av = [];
  const totalEnt = (id) => partits.reduce((n, p) => {
    const s = onze[p].find((x) => x.jugador?.jugador_id === id);
    return n + (s && s.entrena ? s.pct : 0);
  }, 0);
  const entrenaEnTots = (id) => partits.every((p) => { const s = onze[p].find((x) => x.jugador?.jugador_id === id); return s && s.entrena; });
  const entrenables = squad.filter((p) => p.categoria === 'entrenable');
  let entrenen = 0;
  for (const p of entrenables) {
    const total = totalEnt(p.jugador_id);
    if (total >= 100) { entrenen++; continue; }
    if (unaAlineacio && entrenaEnTots(p.jugador_id)) { entrenen++; continue; }   // limitat pel calendari, no per banqueta
    const motiu = p.lesionat ? 'lesionat' : p.suspes ? 'sancionat' : vetats.has(p.jugador_id) ? 'vetat' : 'banqueta';
    av.push({ tipus: 'entrenament_perdut', jugador_id: p.jugador_id, nom: p.nom, total, motiu });
  }
  if (unaAlineacio) av.unshift({ tipus: 'una_alineacio', partits: partits.length });
  if (entrenen < entrenables.length) av.unshift({ tipus: 'cobertura', entrenen, total: entrenables.length });
  for (const partit of partits) {
    const buits = onze[partit].filter((s) => !s.jugador).length;
    if (buits) av.push({ tipus: 'incomplet', partit, buits });
  }
  return av;
}
