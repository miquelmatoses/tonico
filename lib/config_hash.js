// Tonico — hash de la configuració completa del pipeline derivat (classificació +
// fornades + regles). Generalitza el mecanisme de revisió de les alertes a TOT
// l'estat derivat: si el hash vigent ≠ el del derivat, cal regenerar.
export const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return String(h); };

export async function configHashComplet(db, plantilla) {
  const q = async (sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
  const cats = await q('SELECT categoria, es_funcio, aforament, parametres, ordre FROM plantilles_categories WHERE plantilla=? ORDER BY categoria', plantilla);
  const pars = await q('SELECT clau, valor, tipus FROM plantilles_parametres WHERE plantilla=? ORDER BY clau', plantilla);
  const regles = await q('SELECT codi, activa FROM regles ORDER BY codi');
  const rpars = await q('SELECT regla_id, clau, valor FROM regles_parametres ORDER BY regla_id, clau');
  return hash(JSON.stringify({ cats, pars, regles, rpars }));
}
