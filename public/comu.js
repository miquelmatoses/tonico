// Tonico — utilitats compartides del client. Cap text ací: tot ve del
// catàleg i18n. El DOM que generem ha de ser HTML semàntic, idèntic al que
// escriuríem a mà (principi 2 aplicat al DOM resultant). Res d'SPA: cada
// pàgina crida el seu init.
let CATALEG = {};

export async function carregaI18n(idioma = 'ca-valencia') {
  CATALEG = await (await fetch(`/i18n/${idioma}.json`)).json();
}

export function t(clau, params = {}) {
  let s = CATALEG[clau] ?? clau;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Ompli els textos declaratius: <element data-i18n="clau">
export function aplicaI18n(arrel = document) {
  arrel.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.title = `${t('app.nom')} — ${t('app.descriptor')}`;
}

// Constructor mínim de DOM semàntic.
export function el(tag, attrs = {}, ...fills) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const f of fills) n.append(f);
  return n;
}

// Client API únic: JSON, cookies incloses, redirecció a l'entrada si 401.
export async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', ...opts });
  if (r.status === 401) { location.href = '/'; throw new Error('no_autenticat'); }
  const cos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cos.detall || cos.error || 'error');
  return cos;
}

// Navegació comuna (per a les pàgines internes).
export function pintaNav(activa) {
  const nav = document.querySelector('nav');
  if (!nav) return;
  nav.append(
    el('a', { href: '/pujada.html', text: t('nav.pujada') }),
    document.createTextNode(' · '),
    el('a', { href: '/instantanies.html', text: t('nav.instantanies') }),
    document.createTextNode(' · '),
    el('a', { href: '#', text: t('nav.eixir') }, ),
  );
  nav.querySelector('a:last-child').addEventListener('click', async (e) => {
    e.preventDefault();
    await api('/api/eixir', { method: 'POST' });
    location.href = '/';
  });
}
