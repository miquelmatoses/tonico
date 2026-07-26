// Tonico — utilitats compartides del client. Cap text ací: tot ve del
// catàleg i18n. El DOM que generem ha de ser HTML semàntic, idèntic al que
// escriuríem a mà (principi 2 aplicat al DOM resultant). Res d'SPA: cada
// pàgina crida el seu init.
let CATALEG = {};

export const IDIOMES = { 'ca-valencia': 'Valencià', en: 'English' };

// Idioma vigent al client: la tria guardada localment (ràpid, sense round-trip);
// per defecte ca-valencia. La font de veritat del compte és usuaris.idioma, que
// es sincronitza a localStorage en entrar.
export function idiomaActual() {
  try { return localStorage.getItem('idioma') || 'ca-valencia'; } catch { return 'ca-valencia'; }
}

export async function carregaI18n(idioma) {
  const id = IDIOMES[idioma] ? idioma : idiomaActual();
  CATALEG = await (await fetch(`/i18n/${id}.json`)).json();
}

// Selector d'idioma reutilitzable. onCanvi(codi) opcional (p.ex. persistir al
// servidor); si no, recarrega la pàgina amb el nou idioma.
export function selectorIdioma(onCanvi) {
  const sel = el('select', { 'aria-label': t('comu.idioma') });
  for (const [codi, nom] of Object.entries(IDIOMES)) {
    const o = el('option', { value: codi, text: nom });
    if (codi === idiomaActual()) o.setAttribute('selected', '');
    sel.append(o);
  }
  sel.addEventListener('change', async () => {
    try { localStorage.setItem('idioma', sel.value); } catch { /* sense emmagatzematge */ }
    if (onCanvi) await onCanvi(sel.value);
    location.reload();
  });
  return sel;
}

export function t(clau, params = {}) {
  const brut = CATALEG[clau];
  if (brut == null) {                              // guard: clau que no resol (p.ex. alerta desada amb clau vella)
    console.error(`[i18n] clau sense traducció: ${clau}`);
    return CATALEG['comu.text_indisponible'] ?? '—';
  }
  let s = brut;
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') console.error(`[i18n] valor buit per «${k}» a «${clau}» (marcador buit)`);  // no sols {param}
    s = s.replaceAll(`{${k}}`, v);
  }
  // Guard d'interpolació AMPLIAT (v3 · 2a): cap text renderitzat pot dur un {parametre}
  // sense resoldre NI acabar en el·lipsi per un paràmetre no passat.
  if (/\{[a-zA-Z_][\w]*\}/.test(s)) {
    console.error(`[i18n] paràmetre sense resoldre a «${clau}»: ${s}`);
    s = s.replace(/\{[a-zA-Z_][\w]*\}/g, '…');
  }
  return s;
}

// Text amb PLURAL (punt 4): tria la clau `base_1` (n===1) o `base_n` segons el comptador.
// Evita «1 places»/«1 rotatius». El guardià exigix les dues formes per a cada base.
export function tp(base, n, params = {}) {
  return t(`${base}_${n === 1 ? '1' : 'n'}`, { ...params, n });
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

// Guarda de FILA (doctrina de degradació): construïx la fila o, si peta, una fila
// d'error ACOTADA (colspan) amb el detall al registre — mai tomba la taula sencera.
export function filaSegura(fn, ncols) {
  try { return fn(); }
  catch (err) {
    console.error('[fila] error acotat a la fila:', err);
    return el('tr', {}, el('td', { colspan: String(ncols || 1), text: t('comu.error_fila') }));
  }
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
    el('a', { href: '/esta-setmana.html', text: t('nav.esta_setmana') }),
    document.createTextNode(' · '),
    el('a', { href: '/alineacio.html', text: t('nav.alineacio') }),
    document.createTextNode(' · '),
    el('a', { href: '/pla.html', text: t('nav.pla') }),
    document.createTextNode(' · '),
    el('a', { href: '/economia.html', text: t('nav.economia') }),
    document.createTextNode(' · '),
    el('a', { href: '/mercat.html', text: t('nav.mercat') }),
    document.createTextNode(' · '),
    el('a', { href: '/fotrem.html', text: t('nav.fotrem') }),
    document.createTextNode(' · '),
    el('a', { href: '/personal.html', text: t('nav.personal') }),
    document.createTextNode(' · '),
    el('a', { href: '/plantilla.html', text: t('nav.plantilla') }),
    document.createTextNode(' · '),
    el('a', { href: '/comparador.html', text: t('nav.comparador') }),
    document.createTextNode(' · '),
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
