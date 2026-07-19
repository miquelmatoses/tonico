// Tonico — motor d'alineació setmanal (Fase 3). Universal: la formació, les
// posicions d'entrenament i els buckets són config (plantilla). Objectiu en
// fàbrica: maximitzar l'entrenament; el resultat NO és variable d'optimització.
//
// Doctrina (poms/config): MC entrenables repartits entre els dos partits (els
// més pròxims a la venda, a la lliga = aparador); extrems als dos partits;
// futur_entrenador de davanter als dos; obligació de minuts (Junta) en posició
// NO entrenable; farciment ompli la resta sense trepitjar posició entrenable.
//
// squad: [{jugador_id, nom, posicio, categoria, fornada_eixida, lesionat, suspes,
//          obligacio_minuts}]
// config: { partits:[...], slots:[{codi,bucket,entrena,pct}], buckets:{bucket:[pos]} }
// opts: { vetats:[jugador_id], fixats:[{partit, codi, jugador_id}] }

export function alinea(squad, config, opts = {}) {
  const { partits, slots, buckets } = config;
  const vetats = new Set(opts.vetats || []);
  const bucketDe = (p) => { for (const [b, pos] of Object.entries(buckets)) if (pos.includes(p.posicio)) return b; return null; };
  const perId = new Map(squad.map((p) => [p.jugador_id, p]));
  const disp = squad.filter((p) => !p.lesionat && !p.suspes && !vetats.has(p.jugador_id));

  const onze = {};
  for (const partit of partits) onze[partit] = slots.map((s) => ({ ...s, jugador: null }));
  const usat = new Set();                              // "partit:jugador_id"
  const posaEn = (partit, slot, p) => {
    if (!slot || slot.jugador || usat.has(`${partit}:${p.jugador_id}`)) return false;
    slot.jugador = { jugador_id: p.jugador_id, nom: p.nom };
    usat.add(`${partit}:${p.jugador_id}`);
    return true;
  };
  const posa = (partit, bucket, p) => posaEn(partit, onze[partit].find((s) => s.bucket === bucket && !s.jugador), p);
  const nSlots = (bucket) => slots.filter((s) => s.bucket === bucket).length;
  const entrenaBuckets = new Set(slots.filter((s) => s.entrena).map((s) => s.bucket));

  // 0. Fixats manuals (guanyen a tot)
  for (const f of opts.fixats || []) {
    const p = perId.get(f.jugador_id);
    if (p) posaEn(f.partit, onze[f.partit].find((s) => s.codi === f.codi), p);
  }

  // Entrenables (categoria plana): l'alineador decidix qui entrena d'extrem i qui
  // d'MC per donar-los a tots els seus minuts. 2 entrenen d'extrem (els dos partits,
  // 50%+50%); la resta d'MC (un partit, 100%), repartits per horitzó d'eixida.
  const entrenables = disp.filter((p) => p.categoria === 'entrenable');
  const extremPerMatch = slots.filter((s) => s.entrena && s.bucket === 'extrem').length;
  const mcPerMatch = slots.filter((s) => s.entrena && s.bucket === 'mc').length;
  // Prioritat d'extrem: posició natural d'extrem primer, després pròxims a la venda.
  const extremTrainees = [...entrenables]
    .sort((a, b) => (bucketDe(a) === 'extrem' ? 0 : 1) - (bucketDe(b) === 'extrem' ? 0 : 1)
      || (a.fornada_eixida ?? 99) - (b.fornada_eixida ?? 99))
    .slice(0, extremPerMatch);
  const esExtrem = new Set(extremTrainees.map((p) => p.jugador_id));
  const mcTrainees = entrenables.filter((p) => !esExtrem.has(p.jugador_id))
    .sort((a, b) => (a.fornada_eixida ?? 99) - (b.fornada_eixida ?? 99));  // pròxims a la venda → lliga

  for (const p of extremTrainees) for (const partit of partits) posa(partit, 'extrem', p);
  mcTrainees.forEach((p, i) => {
    const partit = i < mcPerMatch ? partits[0] : (i < mcPerMatch * 2 ? partits[1] : null);
    if (partit) posa(partit, 'mc', p);
  });

  // 3. futur_entrenador → davanter als dos partits
  disp.filter((p) => p.categoria === 'futur_entrenador')
    .forEach((p) => partits.forEach((partit) => posa(partit, 'davanter', p)));

  // 4. Obligació de minuts (Junta) → la seua posició (no entrenable) a la lliga
  disp.filter((p) => p.obligacio_minuts).forEach((p) => { const b = bucketDe(p); if (b) posa(partits[0], b, p); });

  // 5. Farciment → posicions NO entrenables restants (mai trepitja entrenable)
  // 6. Resta (venda, experiència...) ompli buits no entrenables si fan falta cossos
  for (const grup of [['farciment'], ['venda', 'experiencia', 'nucli_competitiu', 'alliberament']]) {
    for (const partit of partits) {
      for (const p of disp.filter((x) => grup.includes(x.categoria))) {
        const b = bucketDe(p);
        if (b && !entrenaBuckets.has(b)) posa(partit, b, p);
      }
    }
  }

  // Cap onze de 10: ompli els buits amb un cos COMPATIBLE posicionalment. Un
  // porter només a porteria; a la resta, mai un porter (Castelló no va a MC3).
  // Prefereix la posició exacta; si no, un cos de camp qualsevol. La cobertura
  // per un no-entrenable queda als avisos, no com a forat.
  for (const partit of partits) {
    for (const slot of onze[partit].filter((s) => !s.jugador)) {
      const volPorter = slot.bucket === 'porter';
      const compatibles = disp.filter((p) => !usat.has(`${partit}:${p.jugador_id}`) && p.categoria !== 'entrenable'
        && (bucketDe(p) === 'porter') === volPorter);
      const cos = compatibles.find((p) => bucketDe(p) === slot.bucket) || compatibles[0];
      if (cos) posaEn(partit, slot, cos);
    }
  }

  return { onze, comptabilitat: comptabilitat(onze, disp, partits), avisos: avisos(onze, squad, partits, vetats) };
}

// Per entrenable/futur_entrenador: en quins partits juga i % d'entrenament total.
function comptabilitat(onze, disp, partits) {
  const rel = disp.filter((p) => p.categoria === 'entrenable' || p.categoria === 'futur_entrenador');
  return rel.map((p) => {
    const files = [];
    for (const partit of partits) {
      const slot = onze[partit].find((s) => s.jugador?.jugador_id === p.jugador_id);
      if (slot) files.push({ partit, pct: slot.entrena ? slot.pct : 0 });
    }
    return { jugador_id: p.jugador_id, nom: p.nom, categoria: p.categoria, partits: files, total: files.reduce((n, f) => n + f.pct, 0) };
  });
}

// Cobertura sobre la plantilla SENCERA: quins entrenables no arriben al 100% i
// per què (lesionat/sancionat/vetat/banqueta), i slots buits per partit.
function avisos(onze, squad, partits, vetats) {
  const av = [];
  const totalEnt = (id) => partits.reduce((n, p) => {
    const s = onze[p].find((x) => x.jugador?.jugador_id === id);
    return n + (s && s.entrena ? s.pct : 0);
  }, 0);
  const entrenables = squad.filter((p) => p.categoria === 'entrenable');
  let entrenen = 0;
  for (const p of entrenables) {
    const total = totalEnt(p.jugador_id);
    if (total >= 100) { entrenen++; continue; }
    const motiu = p.lesionat ? 'lesionat' : p.suspes ? 'sancionat' : vetats.has(p.jugador_id) ? 'vetat' : 'banqueta';
    av.push({ tipus: 'entrenament_perdut', jugador_id: p.jugador_id, nom: p.nom, total, motiu });
  }
  if (entrenen < entrenables.length) av.unshift({ tipus: 'cobertura', entrenen, total: entrenables.length });
  for (const partit of partits) {
    const buits = onze[partit].filter((s) => !s.jugador).length;
    if (buits) av.push({ tipus: 'incomplet', partit, buits });
  }
  return av;
}
