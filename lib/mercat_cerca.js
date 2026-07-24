// Tonico — generador de filtres de cerca (Fase 6.2). A partir dels buits de
// plantilla (places d'entrenable i cobertura de farciment) i dels poms de compra,
// proposa filtres per executar manualment a Hattrick. Universal: tot és config.
//
// config: eixida de carregaConfigPla (categories + params).
// squad: [{categoria, posicio}]. caixa: enter. compra: {edat_max, creativitat_min}.
export function filtresCompra(config, squad, caixa, compra) {
  const cats = new Map(config.categories.map((c) => [c.categoria, c]));
  const bucketDe = (p, mapa) => { for (const [b, pos] of Object.entries(mapa || {})) if (pos.includes(p.posicio)) return b; return null; };
  const filtres = [];

  const ent = cats.get('entrenable');
  if (ent?.parametres?.places) {                       // (compat.) entrenable amb buckets
    const mapa = ent.parametres.buckets || {};
    for (const [bucket, spec] of Object.entries(ent.parametres.places)) {
      const quota = typeof spec === 'number' ? spec : spec.n;
      const actuals = squad.filter((p) => p.categoria === 'entrenable' && bucketDe(p, mapa) === bucket).length;
      filtres.push({
        rol: 'entrenable', bucket, posicions: mapa[bucket] || [],
        edat_max: compra.edat_max, creativitat_min: compra.creativitat_min,
        pressupost: caixa, falten: Math.max(0, quota - actuals),
      });
    }
  } else if (ent?.aforament != null) {                 // entrenable amb aforament PLA
    const actuals = squad.filter((p) => p.categoria === 'entrenable').length;
    filtres.push({
      rol: 'entrenable', bucket: 'entrenable', posicions: compra.posicions || [],
      edat_max: compra.edat_max, creativitat_min: compra.creativitat_min,
      pressupost: caixa, falten: Math.max(0, ent.aforament - actuals),
    });
  }

  const SURT = new Set(['venda', 'alliberament']);   // categories que se'n van: no cobrixen a llarg
  const far = cats.get('farciment');
  if (far?.parametres?.places) {
    const mapa = far.parametres.buckets || {};
    const restaOcupacio = !!far.parametres.resta_ocupacio;
    for (const [bucket, spec] of Object.entries(far.parametres.places)) {
      const quota = typeof spec === 'number' ? spec : spec.n;
      const req = typeof spec === 'object' ? spec.requisit : null;
      const enPos = (p) => bucketDe(p, mapa) === bucket;
      const actuals = squad.filter((p) => p.categoria === 'farciment' && enPos(p)).length;
      // Cobertura complementària ESTABLE (com el classificador, però sense comptar els
      // que se'n van): un futur_entrenador cobrix davanter → quota 0.
      const estables = restaOcupacio ? squad.filter((p) => p.categoria !== 'farciment' && !SURT.has(p.categoria) && enPos(p)).length : 0;
      const falten = Math.max(0, quota - actuals - estables);
      if (falten <= 0) continue;
      // Si el buit només el «tapen» jugadors en venda, és previsió: el filtre ho diu.
      const sortint = restaOcupacio ? squad.filter((p) => SURT.has(p.categoria) && enPos(p)).map((p) => p.nom).filter(Boolean) : [];
      filtres.push({
        rol: 'farciment', bucket, posicions: mapa[bucket] || [],
        habilitat: req ? { camp: req.camp, op: req.op, valor: req.valor } : null,
        pressupost: Math.round(caixa * 0.1), falten,
        previsio_venda: sortint.length ? sortint : null,
      });
    }
  }
  return filtres;
}
