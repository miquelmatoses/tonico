// Tonico — què li falta a Paco per fer bé els números (Fase polit #2.3). Retorna
// les dades manuals que falten, amb l'àncora de la secció on s'introduïxen. Quan
// la dada entra, l'ítem desapareix sol.
export async function onRequestGet({ env, data }) {
  const u = data.usuari.id;
  const items = [];

  // Caixa: la font viva és finances.caixa (la caixa REAL declarada), no els moviments.
  const fin = await env.DB.prepare('SELECT caixa FROM finances WHERE usuari_id=?').bind(u).first();
  if (fin?.caixa == null) items.push({ clau: 'caixa', ancora: 'economia' });

  // Personal: la font viva és personal_membres (model ric), no personal_declarat.
  const nPers = (await env.DB.prepare('SELECT COUNT(*) n FROM personal_membres WHERE usuari_id=?').bind(u).first()).n;
  if (nPers === 0) items.push({ clau: 'personal', ancora: 'personal' });

  // El capital d'inflexió ja NO es demana en fred: si no és manual, Tonico l'estima
  // (secció Economia) i l'usuari confirma o edita. Res a reclamar ací.

  return json({ items });
}

const json = (obj) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } });
