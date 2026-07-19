// Tonico — què li falta a Paco per fer bé els números (Fase polit #2.3). Retorna
// les dades manuals que falten, amb l'àncora de la secció on s'introduïxen. Quan
// la dada entra, l'ítem desapareix sol.
export async function onRequestGet({ env, data }) {
  const u = data.usuari.id;
  const items = [];

  const nTx = (await env.DB.prepare('SELECT COUNT(*) n FROM transaccions WHERE usuari_id=?').bind(u).first()).n;
  if (nTx === 0) items.push({ clau: 'caixa', ancora: 'economia' });

  const nPers = (await env.DB.prepare('SELECT COUNT(*) n FROM personal_declarat WHERE usuari_id=?').bind(u).first()).n;
  if (nPers === 0) items.push({ clau: 'personal', ancora: 'personal' });

  const pla = await env.DB.prepare('SELECT parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(u).first();
  const params = pla?.parametres ? JSON.parse(pla.parametres) : {};
  if (params.capital_objectiu == null) items.push({ clau: 'capital_objectiu', ancora: 'pla' });

  return json({ items });
}

const json = (obj) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } });
