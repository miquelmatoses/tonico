// Tonico — carrega la config d'una plantilla des de BD i la converteix en
// l'objecte que espera el motor. És l'únic lloc que llig plantilles_*; el
// classificador rep dades ja parsejades. Reusable per D1 i pel shim de proves.
const converteix = (valor, tipus) => {
  switch (tipus) {
    case 'int': return parseInt(valor, 10);
    case 'float': return parseFloat(valor);
    case 'bool': return valor === 'true';
    case 'json': return JSON.parse(valor);
    default: return valor;
  }
};

export async function carregaConfigPla(db, plantilla) {
  const cats = (await db.prepare(
    `SELECT categoria, es_funcio, aforament, ordre, parametres
       FROM plantilles_categories WHERE plantilla = ? ORDER BY ordre`
  ).bind(plantilla).all()).results;
  const pars = (await db.prepare(
    `SELECT clau, valor, tipus FROM plantilles_parametres WHERE plantilla = ?`
  ).bind(plantilla).all()).results;

  return {
    categories: cats.map((c) => ({
      categoria: c.categoria,
      es_funcio: !!c.es_funcio,
      aforament: c.aforament,
      ordre: c.ordre,
      parametres: c.parametres ? JSON.parse(c.parametres) : {},
    })),
    params: Object.fromEntries(pars.map((p) => [p.clau, converteix(p.valor, p.tipus)])),
  };
}
