// Tonico — render de cada secció de la pàgina única. Les APIs no canvien: cada
// funció fa el seu fetch i pinta dins del seu contenidor. Els errors s'aïllen
// per secció (una que falla no tomba la pàgina). HTML semàntic, reset mínim.
import { api, el, t } from '/comu.js';

const SIGLA = { porteria: 'PO', defensa: 'DF', creativitat: 'CR', extrem: 'EX', passades: 'PA', anotacio: 'AN', pilota_aturada: 'PP' };
const opc = async (p) => { try { return await p; } catch { return null; } };

// ── 1. Esta setmana (parte de Paco) ──
export async function esta_setmana(main) {
  const { alertes, revisat, instantania } = await api('/api/alertes');
  if (!instantania) {
    main.append(el('p', { class: 'paco', text: t('esta_setmana.sense_dades') }),
      el('p', {}, el('a', { href: '#pujada', text: t('esta_setmana.a_pujar') })));
    return;
  }
  const pla = await opc(api('/api/pla'));
  if (pla && !pla.error && pla.temporadaActual != null) main.append(el('p', { class: 'paco', text: t('esta_setmana.estat_pla', { temporada: pla.temporadaActual, fase: pla.fase_actual }) }));
  main.append(el('p', { class: 'paco', text: t('esta_setmana.base', { data: instantania.data }) }));

  const regenera = async () => { await api('/api/alertes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accio: 'regenerar' }) }); location.reload(); };
  const boto = () => { const b = el('button', { type: 'button', text: t('esta_setmana.regenera') }); b.addEventListener('click', regenera); return b; };
  if (!revisat) { main.append(el('p', { class: 'paco', text: t('esta_setmana.no_revisat') }), boto()); return; }

  // Peticions manuals que li falten (punt 3)
  const falten = await opc(api('/api/falten'));
  if (falten && falten.items && falten.items.length) {
    const li = falten.items.map((it) => el('li', {}, el('a', { href: '#' + it.ancora, text: t('falten.' + it.clau) })));
    main.append(el('p', { class: 'paco', text: t('esta_setmana.falten') }), el('ul', {}, ...li));
  }

  if (!alertes.length) { main.append(el('p', { class: 'paco', text: t('esta_setmana.tot_be') }), el('p', { class: 'paco', text: t('esta_setmana.firma') }), boto()); return; }
  main.append(el('p', { class: 'paco', text: t('esta_setmana.salutacio') }));
  const ul = el('ul');
  for (const a of alertes) {
    const li = el('li', {}, el('span', { text: t(a.missatge_clau, a.parametres) + ' ' }));
    for (const [estatNou, clau] of [['vista', 'esta_setmana.vista'], ['ignorada', 'esta_setmana.ignora']]) {
      const b = el('button', { type: 'button', text: t(clau) });
      b.addEventListener('click', async () => { await api('/api/alertes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: a.id, estat: estatNou }) }); location.reload(); });
      li.append(' ', b);
    }
    ul.append(li);
  }
  main.append(ul, el('p', { class: 'paco', text: t('esta_setmana.firma') }), boto());
}

// ── 2. Decisions pendents (intercanvis + motius de baixa) ──
export async function decisions(main) {
  const { intercanvis } = await api('/api/intercanvis');
  const subI = el('div', {}, el('h3', { text: t('plantilla.intercanvis_titol') }));
  if (!intercanvis.length) subI.append(el('p', { text: t('decisions.sense_intercanvis') }));
  for (const x of intercanvis) {
    const clau = x.entrant ? 'plantilla.intercanvi' : 'plantilla.intercanvi_solitari';
    const p = el('p', {}, el('span', { text: t(clau, { entrant: x.entrant || '', eixent: x.eixent, categoria: t('categoria.' + x.categoria), diferencia: x.diferencia != null ? x.diferencia.toFixed(1) : '', desti: t('categoria.' + x.desti_eixent) }) + ' ' }));
    for (const [accio, clauB] of [['acceptar', 'plantilla.acceptar'], ['rebutjar', 'plantilla.rebutjar']]) {
      const b = el('button', { type: 'button', text: t('plantilla.' + accio) });
      b.addEventListener('click', async () => { await api('/api/intercanvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, accio }) }); location.reload(); });
      p.append(' ', b);
    }
    subI.append(p);
  }
  main.append(subI);

  // Motius de baixa (punt 4b)
  const motius = await opc(api('/api/motius'));
  const pendents = motius?.pendents || [];
  const subM = el('div', {}, el('h3', { text: t('decisions.motius_titol') }));
  if (!pendents.length) subM.append(el('p', { text: t('decisions.sense_motius') }));
  for (const j of pendents) {
    const sel = el('select', {}, ...['venda', 'alliberament', 'promocio', 'altres'].map((m) => el('option', { value: m, text: t('motiu_baixa.' + m) })));
    const imp = el('input', { type: 'number', size: '8', 'aria-label': t('decisions.import') });
    const origenSel = el('select', {}, el('option', { value: '', text: '—' }), ...(j.candidats_juvenils || []).map((c) => el('option', { value: c.id, text: c.nom })));
    const b = el('button', { type: 'button', text: t('decisions.desa') });
    b.addEventListener('click', async () => {
      await api('/api/motius', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, motiu: sel.value, import: imp.value ? Number(imp.value) : null, origen_juvenil_id: origenSel.value ? Number(origenSel.value) : null }) });
      location.reload();
    });
    subM.append(el('p', {}, el('span', { text: t('decisions.motiu_jugador', { nom: j.nom }) + ' ' }), sel, ' ', imp, ' ', origenSel, ' ', b));
  }
  main.append(subM);
}

// ── 3. Alineació ──
export async function alineacio(main) {
  const d = await api('/api/alineacio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (d.error) { main.append(el('p', { text: t('plantilla.buit') })); return; }
  for (const partit of Object.keys(d.onze)) {
    const tbody = el('tbody', {}, ...d.onze[partit].map((s) => el('tr', {},
      el('td', { text: `${s.codi}${s.entrena ? ' ·' + s.pct + '%' : ''}` }),
      el('td', { text: s.jugador ? s.jugador.nom : t('alineacio.buit') }))));
    main.append(el('section', {}, el('h3', { text: t('alineacio.' + partit) }),
      el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: t('alineacio.col_slot') }), el('th', { text: t('alineacio.col_jugador') }))), tbody)));
  }
  const cbody = el('tbody', {}, ...d.comptabilitat.map((c) => el('tr', {}, el('td', { text: c.nom }),
    el('td', { text: c.partits.map((p) => `${t('alineacio.' + p.partit)} ${p.pct}%`).join(' + ') || t('alineacio.buit') }), el('td', { text: c.total + '%' }))));
  main.append(el('section', {}, el('h3', { text: t('alineacio.comptabilitat_titol') },),
    el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: t('alineacio.col_jugador') }), el('th', { text: t('alineacio.col_partit') }), el('th', { text: t('alineacio.col_total') }))), cbody)));
  if (d.avisos.length) {
    const av = d.avisos.map((v) => v.tipus === 'cobertura' ? t('alineacio.cobertura', v)
      : v.tipus === 'entrenament_perdut' ? t('alineacio.perdut', { nom: v.nom, motiu: t('motiu.' + v.motiu) })
        : t('alineacio.incomplet', { partit: t('alineacio.' + v.partit), buits: v.buits }));
    main.append(el('section', {}, el('h3', { text: t('alineacio.avisos_titol') }), el('ul', {}, ...av.map((x) => el('li', { text: x })))));
  }
}

// ── 4. Plantilla sènior (amb override de categoria i fornada) ──
export async function plantilla(main) {
  const ORDRE = ['entrenable', 'futur_entrenador', 'experiencia', 'nucli_competitiu', 'farciment', 'venda', 'alliberament'];
  const CATS = ['entrenable', 'venda', 'alliberament', 'farciment', 'experiencia', 'futur_entrenador', 'nucli_competitiu'];
  const { instantania, jugadors } = await api('/api/plantilla');
  if (!instantania) { main.append(el('p', { text: t('plantilla.buit') })); return; }
  main.append(el('p', { text: t('plantilla.instantania', { temporada: instantania.temporada, setmana: instantania.setmana_temporada, data: instantania.data }) }));
  const hab = (j) => `PO${j.porteria} DF${j.defensa} CR${j.creativitat} EX${j.extrem} PA${j.passades} AN${j.anotacio} PP${j.pilota_aturada}`;
  for (const c of ORDRE) {
    const grup = jugadors.filter((j) => j.categoria === c);
    if (!grup.length) continue;
    const cols = ['col_jugador', 'col_posicio', 'col_edat', 'col_habilitats', 'col_tsi', 'col_puntuacio', 'col_categoria', 'col_fornada'];
    const tbody = el('tbody', {}, ...grup.map((j) => {
      // Override de categoria (punt 4a)
      const selCat = el('select', {}, ...CATS.map((x) => { const o = el('option', { value: x, text: t('categoria.' + x) }); if (x === j.categoria) o.setAttribute('selected', ''); return o; }));
      selCat.addEventListener('change', () => api('/api/categoria', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, categoria: selCat.value }) }).then(() => location.reload()).catch(() => {}));
      const cellaFornada = c === 'entrenable' ? (() => { const inp = el('input', { type: 'text', size: '3', value: j.fornada || '' }); inp.addEventListener('change', () => api('/api/fornada', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, lletra: inp.value.trim() }) }).catch(() => {})); return el('td', {}, inp); })() : el('td', { text: j.fornada || '' });
      return el('tr', {},
        el('td', {}, el('a', { href: `#fotrem`, text: j.nom }), j.origen === 'manual' ? ` ${t('plantilla.manual')}` : ''),
        el('td', { text: j.posicio || '' }), el('td', { text: `${j.edat_anys}a` }), el('td', { text: hab(j) }),
        el('td', { text: j.tsi ?? '' }), el('td', { text: j.puntuacio != null ? j.puntuacio.toFixed(1) : '' }),
        el('td', {}, selCat), cellaFornada);
    }));
    main.append(el('section', {}, el('h3', { text: `${t('categoria.' + c)} (${grup.length})` }),
      el('table', {}, el('thead', {}, el('tr', {}, ...cols.map((k) => el('th', { text: t('plantilla.' + k) })))), tbody)));
  }
}

// ── 5. Fotrem ──
export async function fotrem(main) {
  const ESTATS = ['seguiment', 'elegit', 'cua_eixida'];
  const val = (v) => (v == null ? '-' : v === 'desconegut' ? t('fotrem.desconegut') : v);
  const { juvenils } = await api('/api/fotrem');
  if (!juvenils.length) { main.append(el('p', { text: t('fotrem.buit') })); return; }
  const hab = (j) => j.habilitats.filter((h) => h.actual != null || h.potencial != null).map((h) => `${SIGLA[h.habilitat]} ${val(h.actual)}/${val(h.potencial)}`).join('  ');
  const cols = ['col_jugador', 'col_edat', 'col_habilitats', 'col_potencial', 'col_promocio', 'col_aterratge', 'col_estat'];
  const tbody = el('tbody', {}, ...juvenils.map((j) => {
    const sel = el('select', {}, ...ESTATS.map((e) => { const o = el('option', { value: e, text: t('fotrem.estat_' + e) }); if (e === j.estat) o.setAttribute('selected', ''); return o; }));
    sel.addEventListener('change', () => api('/api/fotrem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.jugador_id, estat: sel.value }) }).catch(() => {}));
    return el('tr', {}, el('td', { text: j.nom }), el('td', { text: `${j.edat_anys}a` }), el('td', { text: hab(j) }),
      el('td', { text: j.potencial_max ?? '—' }), el('td', { text: j.dies_restants_promocio != null ? t('fotrem.dies', { dies: j.dies_restants_promocio }) : '—' }),
      el('td', { text: j.aterratge ? t('fotrem.aterratge_val', j.aterratge) : '—' }), el('td', {}, sel));
  }));
  main.append(el('table', {}, el('thead', {}, el('tr', {}, ...cols.map((k) => el('th', { text: t('fotrem.' + k) })))), tbody));

  // Avaluador d'ofertes noves (punt 4d)
  const form = el('form', {}, el('h3', { text: t('fotrem.oferta_titol') }));
  const edat = el('input', { type: 'number', size: '3', 'aria-label': t('fotrem.edat') });
  const pot = el('input', { type: 'number', size: '3', 'aria-label': t('fotrem.col_potencial') });
  const comp = el('input', { type: 'number', size: '3', 'aria-label': t('fotrem.compost') });
  const res = el('span', {});
  const b = el('button', { type: 'button', text: t('fotrem.avalua') });
  b.addEventListener('click', async () => {
    const r = await opc(api('/api/oferta?' + new URLSearchParams({ edat: edat.value, potencial: pot.value, compost: comp.value })));
    res.textContent = r && r.veredicte ? (r.veredicte.accepta ? t('fotrem.crida_accepta', { motiu: t('motiu.' + r.veredicte.motiu) }) : t('fotrem.crida_rebutja', { motiu: t('motiu.' + r.veredicte.motiu) })) : '—';
  });
  form.append(t('fotrem.edat') + ' ', edat, ' ' + t('fotrem.col_potencial') + ' ', pot, ' ' + t('fotrem.compost') + ' ', comp, ' ', b, ' ', res);
  main.append(form);
}

// ── 6. Mercat ──
export async function mercat(main) {
  const { filtres, preus } = await api('/api/mercat');
  const pres = (v) => (v > 0 ? v : t('mercat.sense_pressupost'));
  const textFiltre = (f) => f.rol === 'entrenable'
    ? t('mercat.filtre_entrenable', { posicions: (f.posicions || []).join('/'), edat_max: f.edat_max, creativitat_min: f.creativitat_min, pressupost: pres(f.pressupost), falten: f.falten })
    : t('mercat.filtre_farciment', { bucket: f.bucket, posicions: (f.posicions || []).join('/'), habilitat: f.habilitat ? `${f.habilitat.camp} ${f.habilitat.op} ${f.habilitat.valor}` : '', pressupost: pres(f.pressupost), falten: f.falten });
  const utils = filtres.filter((f) => f.falten > 0);
  main.append(el('h3', { text: t('mercat.filtres_titol') }), utils.length ? el('ul', {}, ...utils.map((f) => el('li', { text: textFiltre(f) }))) : el('p', { text: t('mercat.sense_filtres') }));
  if (!preus.length) main.append(el('p', { text: t('mercat.buit') }));
  else main.append(el('table', {}, el('thead', {}, el('tr', {}, ...['col_posicio', 'col_edat', 'col_habilitat', 'col_preu', 'col_data'].map((k) => el('th', { text: t('mercat.' + k) })))),
    el('tbody', {}, ...preus.map((p) => el('tr', {}, el('td', { text: p.posicio || '' }), el('td', { text: p.edat ?? '' }), el('td', { text: p.habilitat ?? '' }), el('td', { text: p.preu }), el('td', { text: p.data }))))));
}

// ── 7. Economia ──
export async function economia(main) {
  const { transaccions, economia: e } = await api('/api/transaccions');
  main.append(el('p', { text: t('economia.caixa', { caixa: e.caixa }) }));
  main.append(el('p', { text: e.projeccio ? t('economia.projeccio', e.projeccio) : t('economia.sense_objectiu') }));
  if (e.nomina != null) main.append(el('p', { text: t('economia.nomina', { nomina: e.nomina }) }));
  if (e.margesFornada.length) main.append(el('table', {}, el('thead', {}, el('tr', {}, ...['col_fornada', 'col_compres', 'col_vendes', 'col_marge'].map((k) => el('th', { text: t('economia.' + k) })))),
    el('tbody', {}, ...e.margesFornada.map((m) => el('tr', {}, el('td', { text: m.fornada }), el('td', { text: m.compres }), el('td', { text: m.vendes }), el('td', { text: m.marge }))))));
  if (transaccions.length) main.append(el('table', {}, el('thead', {}, el('tr', {}, ...['col_data', 'col_tipus', 'col_import', 'col_jugador'].map((k) => el('th', { text: t('economia.' + k) })))),
    el('tbody', {}, ...transaccions.slice(0, 20).map((tr) => el('tr', {}, el('td', { text: tr.data }), el('td', { text: t('tipus.' + tr.tipus) }), el('td', { text: tr.import }), el('td', { text: tr.jugador || '' }))))));
}

// ── 8. Pla mestre ──
export async function pla(main) {
  const d = await api('/api/pla');
  if (d.error) { main.append(el('p', { text: t('pla.sense_pla') })); return; }
  main.append(el('p', { text: t('pla.fase_actual') + ': ' + (d.fase_actual || '—') + ' · ' + t('pla.temporada_actual') + ': ' + (d.temporadaActual != null ? 'T' + d.temporadaActual : '—') }));
  const cols = ['col_temporada', 'col_divisio', 'col_mode', 'col_accions', 'col_estat'];
  const tbody = el('tbody', {}, ...d.temporades.map((tp) => {
    const accions = [...(tp.accions.events || []), ...(tp.retard.length ? [t('pla.retard', { detall: tp.retard.join('; ') })] : [])];
    return el('tr', {}, el('td', { text: 'T' + tp.temporada }), el('td', { text: tp.divisio_prevista || '' }), el('td', { text: tp.mode || '' }),
      el('td', {}, el('ul', {}, ...accions.map((a) => el('li', { text: a })))), el('td', { text: t('pla.estat_' + tp.estat) }));
  }));
  main.append(el('table', {}, el('thead', {}, el('tr', {}, ...cols.map((k) => el('th', { text: t('pla.' + k) })))), tbody));
}

// ── 9. Personal ──
export async function personal(main) {
  const d = await api('/api/personal');
  if (d.error) { main.append(el('p', { text: t('pla.sense_pla') })); return; }
  main.append(el('p', { text: t('personal.fase_actual', { fase: d.fase_actual }) }));
  const secD = el('div', {}, el('h3', { text: t('personal.desquadres_titol') }));
  const lbl = (k) => (t('element.' + k) === 'element.' + k ? k : t('element.' + k));
  if (!d.desquadres.length) secD.append(el('p', { text: t('personal.tot_quadra') }));
  else secD.append(el('ul', {}, ...d.desquadres.map((x) => el('li', { text: t('personal.desquadre', { clau: lbl(x.clau), declarat: x.declarat, esperat: x.esperat }) }))));
  main.append(secD);
}

// ── 10a. Pujada de dades ──
export function pujada(main) {
  const form = el('form', {}, el('h3', { text: t('pujada.titol') }));
  const data = el('input', { type: 'date', name: 'data', required: 'true', 'aria-label': t('pujada.data') });
  data.value = new Date().toISOString().slice(0, 10);
  const senior = el('input', { type: 'file', name: 'senior', accept: '.csv', 'aria-label': t('pujada.fitxer_senior') });
  const juvenil = el('input', { type: 'file', name: 'juvenil', accept: '.csv', 'aria-label': t('pujada.fitxer_juvenil') });
  const estat = el('p', { role: 'status' });
  form.append(el('label', {}, t('pujada.data') + ' ', data), ' ', el('label', {}, t('pujada.fitxer_senior') + ' ', senior), ' ',
    el('label', {}, t('pujada.fitxer_juvenil') + ' ', juvenil), ' ', el('button', { type: 'submit', text: t('pujada.enviar') }), estat);
  const envia = async (reemplaça) => {
    estat.textContent = t('comu.carregant');
    const fd = new FormData(form);
    if (reemplaça) fd.set('reemplaça', 'true');
    const r = await fetch('/api/pujar', { method: 'POST', credentials: 'same-origin', body: fd });
    const cos = await r.json().catch(() => ({}));
    if (r.status === 409 && cos.error === 'instantania_existix') { if (confirm(t('pujada.confirma_reemplaça'))) return envia(true); estat.textContent = ''; return; }
    if (!r.ok) { estat.textContent = t('pujada.error', { detall: cos.detall || cos.error || '' }); return; }
    location.reload();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); envia(false); });
  main.append(form);
}

// ── 10b. Què ha canviat ──
export async function comparador(main) {
  const d = await api('/api/comparador');
  main.append(el('p', {}, el('a', { href: '#pujada', text: t('esta_setmana.a_pujar') })));
  if (!d.comparable) { main.append(el('p', { text: t('comparador.sense') })); return; }
  main.append(el('p', { text: t('comparador.parella', { b: d.b.data, a: d.a.data, dies: d.dies }) + (d.canvi_temporada ? ` (${t('comparador.canvi_temporada')})` : '') }));
  if (d.pops.length) main.append(el('section', {}, el('h3', { text: t('comparador.pops_titol') }),
    el('ul', {}, ...d.pops.map((p) => el('li', { text: `${p.nom}: ${p.habilitats.map((h) => SIGLA[h]).join(' ')}` })))));
  else main.append(el('p', { text: t('comparador.cap_pop') }));
}
