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

  const far = cats.get('farciment');
  if (far?.parametres?.places) {
    const mapa = far.parametres.buckets || {};
    for (const [bucket, spec] of Object.entries(far.parametres.places)) {
      const quota = typeof spec === 'number' ? spec : spec.n;
      const req = typeof spec === 'object' ? spec.requisit : null;
      const actuals = squad.filter((p) => p.categoria === 'farciment' && bucketDe(p, mapa) === bucket).length;
      const falten = Math.max(0, quota - actuals);
      if (falten > 0) filtres.push({
        rol: 'farciment', bucket, posicions: mapa[bucket] || [],
        habilitat: req ? { camp: req.camp, op: req.op, valor: req.valor } : null,
        pressupost: Math.round(caixa * 0.1), falten,
      });
    }
  }
  return filtres;
}
