// Tonico — render de cada secció de la pàgina única. Les APIs no canvien: cada
// funció fa el seu fetch i pinta dins del seu contenidor. Els errors s'aïllen
// per secció (una que falla no tomba la pàgina). HTML semàntic, reset mínim.
import { api, el, t, tp, filaSegura } from '/comu.js';
import { diners, milers, decimal, percent, edat, notes, esLesionat, duradaLesio } from '/format.js';

const SIGLA = { porteria: 'PO', defensa: 'DF', creativitat: 'CR', extrem: 'EX', passades: 'PA', anotacio: 'AN', pilota_aturada: 'PP' };
const opc = async (p) => { try { return await p; } catch { return null; } };

// Capçalera de secció del disseny: número + títol + subtítol.
export function capcalera(main, num, clau) {
  main.append(el('div', { class: 'sec-cap' },
    el('span', { class: 'sec-num', text: String(num).padStart(2, '0') }),
    el('h2', { text: t(clau + '.titol') })));
  main.append(el('p', { class: 'sub', text: t(clau + '.sub') }));
}

// Targeta amb capçalera (patró de contenidor del disseny).
const card = (titol, compte, variant) => {
  const c = el('section', { class: 'card' });
  if (titol != null) {
    const cap = el('div', { class: 'card-cap' + (variant ? ' ' + variant : '') }, el('h3', { class: 'card-titol', text: titol }));
    if (compte != null) cap.append(el('span', { class: 'card-compte', text: String(compte) }));
    c.append(cap);
  }
  return c;
};
const cos = (...fills) => el('div', { class: 'card-cos' }, ...fills);
// Sigla de posició → classe de color del xip.
const posCls = (p) => 'pos ' + String(p || '').toLowerCase().slice(0, 2);
const nivellUrgencia = (u) => (u >= 70 ? 'urgent' : u >= 55 ? 'mitja' : 'baixa');

// ── CAMP DE JOC (compartit sènior/juvenil) ──
// Coordenades per posició calcades de la proposta de disseny (formació 3-3-2-2);
// per a altres formacions, els slots d'un bucket es reparteixen en x sobre la seua línia.
const CAMP = {
  porter:   { y: 88, cls: 'po', xs: { 1: [50] } },
  defensa:  { y: 71, cls: 'dc', xs: { 2: [34, 66], 3: [26, 50, 74], 4: [18, 39, 61, 82], 5: [15, 32, 50, 68, 85] } },
  mc:       { y: 51, cls: 'mc', xs: { 2: [34, 66], 3: [28, 50, 72], 4: [18, 39, 61, 82] } },
  extrem:   { y: 40, cls: 'ex', xs: { 1: [50], 2: [20, 80] } },
  davanter: { y: 27, cls: 'dv', xs: { 1: [50], 2: [38, 62], 3: [28, 50, 72] } },
};
const BUCKET_SIGLA = { porter: 'POR', defensa: 'DC', mc: 'MC', extrem: 'EX', davanter: 'DV' };
// slots: [{bucket, jugador?/nom}]; opts.anell(s)→''|'ple'|'mig'|'doble'|'descobriment'|'buit',
// opts.nom(s), opts.titol(s). El color del xip és la POSICIÓ; l'ANELL és l'entrenament.
function campDeJoc(slots, opts) {
  const c = el('div', { class: 'camp' });
  const perBucket = new Map();
  for (const s of slots) { if (!perBucket.has(s.bucket)) perBucket.set(s.bucket, []); perBucket.get(s.bucket).push(s); }
  for (const [bucket, ss] of perBucket) {
    const conf = CAMP[bucket] || { y: 50, cls: '' };
    const xs = (conf.xs && conf.xs[ss.length]) || ss.map((_, i) => ((i + 1) / (ss.length + 1)) * 100);
    ss.forEach((s, i) => {
      const xip = el('div', { class: 'jug' },
        el('div', { class: `jug-chip ${conf.cls} ${opts.anell(s)}`, text: BUCKET_SIGLA[bucket] || bucket }),
        el('div', { class: 'jug-nom', text: opts.nom(s) }));
      xip.style.left = xs[i] + '%'; xip.style.top = conf.y + '%';
      xip.title = opts.titol(s);
      c.append(xip);
    });
  }
  return c;
}
// SÈNIOR (§6): un sol entrenament, però per posició arriba al 100% o al 50% en este partit.
const anellSenior = (s) => (!s.jugador ? 'buit' : s.entrena ? ((s.pct ?? 0) >= 100 ? 'ple' : 'mig') : '');
// JUVENIL (§26): dos entrenaments. L'anell diu el NIVELL D'ENTRENAMENT de la plaça,
// no si es descobrix: entrena els DOS components (ab→doble), només el principal (a→ple,
// 100%) o només el secundari (b→mig, 66%). Passades entrena mc I davanter per igual: un
// davanter és 'b' (secundari), i ha d'eixir com a secundari encara que l'habilitat siga
// desconeguda (llavors, a més, la descobrix — això ho diu el TEXT del motiu, no l'anell).
const anellJuvenil = (s) => {
  if (s.motiu === 'estructura') return '';
  if (s.valor_placa === 'ab') return 'doble';
  if (s.valor_placa === 'a') return 'ple';
  if (s.valor_placa === 'b') return 'mig';
  return '';
};
// Cognom (el que mostra Hattrick): l'última paraula del nom.
const cognom = (nom) => (String(nom || '').trim().split(/\s+/).pop() || '');
// Llegenda de l'anell, segons el motor (els estats possibles no són els mateixos).
function campLlegenda(mode) {
  const items = mode === 'juvenil'
    ? [['ple', 'principal'], ['mig', 'secundari'], ['doble', 'els_dos']]
    : [['ple', 'cent'], ['mig', 'mig']];
  const l = el('div', { class: 'camp-llegenda' });
  for (const [cls, clau] of items) l.append(el('span', {}, el('i', { class: cls }), el('span', { text: t('camp.' + clau) })));
  return l;
}

// ── 1. Esta setmana (parte de Paco) ──
export async function esta_setmana(main) {
  const { alertes, agenda, revisat, instantania } = await api('/api/alertes');
  const hero = (meta) => {
    const cap = el('div', { class: 'hero' },
      el('div', {},
        el('span', { class: 'kicker', text: '● ' + t('esta_setmana.titol') }),
        el('h1', { text: t('esta_setmana.head') }),
        meta ? el('p', { class: 'hero-meta', text: meta }) : el('p', { class: 'hero-meta' })));
    return cap;
  };
  if (!instantania) {
    main.append(hero(null), el('div', { class: 'briefing' },
      el('div', { class: 'briefing-cap' }, el('div', { class: 'avatar', text: 'PM' }),
        el('div', {}, el('div', { class: 'briefing-nom', text: t('esta_setmana.sense_dades') }))),
      el('p', {}, el('a', { href: '#pujada', text: t('esta_setmana.a_pujar') }))));
    return;
  }
  const pla = await opc(api('/api/pla'));
  const trossos = [`${t('esta_setmana.base', { data: instantania.data })}`];
  if (pla && !pla.error && pla.temporadaActual != null) trossos.push(t('esta_setmana.estat_pla', { temporada: pla.temporadaActual, fase: t('fase.' + pla.fase_actual) }));
  const capçalera = hero(trossos.join(' · '));

  // KPIs derivats (res decoratiu): accions de hui i línies d'agenda.
  const kpis = el('div', { class: 'kpis' });
  const kpi = (n, clau, alerta) => el('div', { class: 'kpi' + (alerta ? ' alerta' : '') },
    el('div', { class: 'kpi-xifra', text: String(n) }), el('div', { class: 'kpi-etiqueta', text: t(clau) }));
  kpis.append(kpi(alertes.length, 'esta_setmana.kpi_urgents', alertes.length > 0));
  kpis.append(kpi((agenda || []).length, 'esta_setmana.kpi_agenda'));
  capçalera.append(el('div', { class: 'hdr-buit' }), kpis);
  main.append(capçalera);

  const regenera = async () => { await api('/api/alertes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accio: 'regenerar' }) }); location.reload(); };
  const boto = () => { const b = el('button', { type: 'button', class: 'b-prim', text: t('esta_setmana.regenera') }); b.addEventListener('click', regenera); return b; };

  // Banner de Paco: la veu, sempre en el mateix lloc.
  const brief = el('div', { class: 'briefing' },
    el('div', { class: 'briefing-cap' }, el('div', { class: 'avatar', text: 'PM' }),
      el('div', {}, el('div', { class: 'briefing-nom', text: t(revisat ? (alertes.length ? 'esta_setmana.salutacio' : 'esta_setmana.tot_be') : 'esta_setmana.no_revisat') }),
        el('div', { class: 'briefing-rol', text: t('esta_setmana.firma') }))));
  // Resum d'una línia de l'onze juvenil (2d): el detall viu a Fotrem, no al parte.
  const fot = await opc(api('/api/fotrem'));
  if (fot && fot.onze_juvenil) brief.append(el('p', {}, el('a', { href: '#fotrem', text: tp('esta_setmana.resum_juvenil', fot.onze_juvenil.descobriments) })));
  // Peticions manuals que li falten (punt 3)
  const falten = revisat ? await opc(api('/api/falten')) : null;
  if (falten && falten.items && falten.items.length) {
    brief.append(el('p', { text: t('esta_setmana.falten') }));
    const u = el('ul', { class: 'net' });
    for (const it of falten.items) u.append(el('li', {}, el('a', { href: '#' + it.ancora, text: t('falten.' + it.clau) })));
    brief.append(u);
  }
  main.append(brief);
  if (!revisat) { main.append(boto()); return; }

  // Els paràmetres monetaris de les alertes (números crus des de les regles) es
  // formaten ací, al render — les regles no barregen presentació amb lògica.
  const DINERS_ALERTA = new Set(['pressupost', 'objectiu', 'projectada', 'falta', 'ingres', 'sou', 'sou_total']);
  const ambDiners = (par) => { const o = { ...par }; for (const k of DINERS_ALERTA) if (typeof o[k] === 'number') o[k] = diners(o[k]); return o; };
  if (alertes.length) {
    const graella = el('ul', { class: 'targetes' });
    for (const a of alertes) {
      const niv = nivellUrgencia(a.urgencia ?? 0);
      const par = a.parametres || {};
      const li = el('li', { class: 'targeta ' + niv },
        el('div', { class: 'targeta-cap' },
          el('span', { class: 'tag', text: t('urgencia.' + niv) }),
          el('span', { class: 'targeta-nom', text: par.nom || t('esta_setmana.accio') })),
        el('p', { text: t(a.missatge_clau, ambDiners(par)) }));
      const accions = el('div', { class: 'targeta-accions' });
      for (const [estatNou, clau, cls] of [['vista', 'esta_setmana.vista', 'b-prim'], ['ignorada', 'esta_setmana.ignora', 'b-sec']]) {
        const b = el('button', { type: 'button', class: cls, text: t(clau) });
        b.addEventListener('click', async () => { await api('/api/alertes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: a.id, estat: estatNou }) }); location.reload(); });
        accions.append(b);
      }
      li.append(accions);
      graella.append(li);
    }
    main.append(graella);
  }
  pintaAgenda(main, agenda);
  main.append(boto());
}

// AGENDA (principi «l'informe és l'agenda de hui»): una línia per data futura,
// «dia N: acció · acció». Les accions del mateix tipus s'agrupen per noms.
function pintaAgenda(main, agenda) {
  if (!agenda || !agenda.length) return;
  const diaAmbNom = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return `${t('dia.' + d.getUTCDay())} ${d.getUTCDate()}`; };
  const linia = (g) => {
    const perClau = new Map();
    for (const a of g.accions) { if (!perClau.has(a.clau)) perClau.set(a.clau, []); perClau.get(a.clau).push(a.parametres?.nom); }
    return [...perClau].map(([k, noms]) => t(k, { nom: noms.filter(Boolean).join(', ') })).join(' · ');
  };
  const c = card(t('agenda.titol'), agenda.length);
  const u = el('ul', { class: 'agenda' });
  for (const g of agenda) {
    u.append(el('li', {}, el('span', { class: 'agenda-dia', text: diaAmbNom(g.data) }), el('span', { text: linia(g) })));
  }
  c.append(cos(u));
  main.append(c);
}

// ── 2. Moviments (fets automàticament amb Desfés + preguntes d'overrides + motius) ──
export async function decisions(main) {
  capcalera(main, 2, 'decisions');
  const boto = (id, accio, text) => { const b = el('button', { type: 'button', class: 'b-xic neutre', text }); b.addEventListener('click', async () => { await api('/api/intercanvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, accio }) }); location.reload(); }); return b; };
  const { moviments, historial = [], preguntes } = await api('/api/intercanvis');
  const liniaMov = (x) => {
    const dif = decimal(x.diferencia);
    const txt = x.entrant ? t('moviments.mov', { entrant: x.entrant, eixent: x.eixent, desti: t('categoria.' + x.desti_eixent), diferencia: dif })
      : t('moviments.mov_solo', { eixent: x.eixent, categoria: t('categoria.' + x.categoria), desti: t('categoria.' + x.desti_eixent) });
    return el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: txt }), boto(x.id, 'desfer', t('moviments.desfes')));
  };

  const duo = el('div', { class: 'duo' });
  // Fets automàticament (informa + Desfés) — només els RECENTS.
  const subF = card(t('moviments.fets_titol'), moviments.length, 'llima');
  const cosF = el('div', { class: 'card-cos' });
  if (!moviments.length) cosF.append(el('p', { class: 'nota-peu', text: t('moviments.cap_fet') }));
  for (const x of moviments) cosF.append(liniaMov(x));
  subF.append(cosF);
  // Historial plegable: caducats per temps o per la pujada següent; el Desfés hi és mentres siga reversible.
  if (historial.length) {
    const det = el('details', {}, el('summary', { text: t('moviments.historial', { n: historial.length }) }));
    for (const x of historial) det.append(liniaMov(x));
    cosF.append(det);
  }
  duo.append(subF);

  // Preguntes prèvies (només overrides manuals)
  const subP = card(t('moviments.preguntes_titol'), preguntes.length);
  const cosP = el('div', { class: 'card-cos' });
  if (!preguntes.length) cosP.append(el('p', { class: 'nota-peu', text: t('moviments.cap_pregunta') }));
  for (const x of preguntes) {
    const dif = decimal(x.diferencia);
    const p = el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: t('moviments.pregunta', { entrant: x.entrant, eixent: x.eixent, categoria: t('categoria.' + x.categoria), desti: t('categoria.' + x.desti_eixent), diferencia: dif }) }));
    p.append(boto(x.id, 'acceptar', t('plantilla.acceptar')), boto(x.id, 'rebutjar', t('plantilla.rebutjar')));
    cosP.append(p);
  }
  subP.append(cosP);
  duo.append(subP);

  // Motius de baixa (punt 4b)
  const motius = await opc(api('/api/motius'));
  const pendents = motius?.pendents || [];
  const subM = card(t('decisions.motius_titol'), pendents.length);
  const cosM = el('div', { class: 'card-cos' });
  if (!pendents.length) cosM.append(el('p', { class: 'nota-peu', text: t('decisions.sense_motius') }));
  for (const j of pendents) {
    const sel = el('select', {}, ...['venda', 'alliberament', 'promocio', 'altres'].map((m) => el('option', { value: m, text: t('motiu_baixa.' + m) })));
    const imp = el('input', { type: 'number', size: '8', 'aria-label': t('decisions.import') });
    const origenSel = el('select', {}, el('option', { value: '', text: '—' }), ...(j.candidats_juvenils || []).map((c) => el('option', { value: c.id, text: c.nom })));
    const b = el('button', { type: 'button', class: 'b-xic', text: t('decisions.desa') });
    b.addEventListener('click', async () => {
      await api('/api/motius', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, motiu: sel.value, import: imp.value ? Number(imp.value) : null, origen_juvenil_id: origenSel.value ? Number(origenSel.value) : null }) });
      location.reload();
    });
    cosM.append(el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: t('decisions.motiu_jugador', { nom: j.nom }) }), sel, imp, origenSel, b));
  }
  subM.append(cosM);
  duo.append(subM);
  main.append(duo);
}

// ── 3. Alineació ──
export async function alineacio(main) {
  capcalera(main, 3, 'alineacio');
  const d = await api('/api/alineacio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (d.error) { main.append(el('p', { text: t('plantilla.buit') })); return; }
  const rolNom = new Map((d.rols || []).map((r) => [r.id, r.nom_clau]));
  const rolCurt = new Map((d.rols || []).map((r) => [r.id, r.nom_clau_curt || r.nom_clau]));
  const nom = (id) => t(rolNom.get(id) || 'alineacio.buit');            // nom complet: NOMÉS títols de taula
  const curt = (id) => t(rolCurt.get(id) || 'alineacio.buit');         // nom curt: comptabilitat i avisos
  // Motiu per fila (com la juvenil): derivat de la categoria i del rol del partit.
  const motiu = (s) => {
    if (!s.jugador) return '';
    const c = s.jugador.categoria;
    if (c === 'venda') return t('alineacio.motiu_venda');            // cos en venda (sense llistar: el llistat no juga)
    if (s.bucket === 'porter') return t('alineacio.motiu_porteria');
    if (c === 'entrenable' && s.entrena) return t('alineacio.motiu_entrena', { pos: s.codi, pct: s.pct });
    if (c === 'futur_entrenador') return t('alineacio.motiu_experiencia');
    if (c === 'farciment') return t('alineacio.motiu_farciment');
    return t('alineacio.motiu_cos');
  };
  const camp = (slots) => campDeJoc(slots, {
    anell: anellSenior,
    nom: (s) => (s.jugador ? cognom(s.jugador.nom) : t('alineacio.buit')),
    titol: (s) => `${s.codi} · ${s.jugador ? s.jugador.nom : t('alineacio.buit')}${motiu(s) ? ' · ' + motiu(s) : ''}`,
  });
  const onzes = el('div', { class: 'onzes' });
  const ids = Object.keys(d.onze);
  ids.forEach((partit, i) => {
    const entrenen = d.onze[partit].filter((s) => s.entrena && s.jugador).length;
    onzes.append(el('div', { class: 'onze' },
      el('div', { class: 'onze-cap' + (i ? ' b' : '') },
        el('div', { class: 'onze-titol', text: nom(partit) }),
        el('div', { class: 'onze-sub', text: t('alineacio.onze_sub', { n: entrenen }) })),
      camp(d.onze[partit]), campLlegenda('senior')));
  });
  main.append(onzes);

  const c = card(t('alineacio.comptabilitat_titol'), d.comptabilitat.length);
  const g = el('div', { class: 'graella' });
  for (const x of d.comptabilitat) {
    g.append(el('div', { class: 'graella-fila' },
      el('b', { text: x.nom }),
      el('span', { text: x.partits.map((p) => `${curt(p.partit)} ${p.pct}%`).join(' + ') || t('alineacio.buit') }),
      el('span', { class: 'graella-val', text: x.total + '%' })));
  }
  c.append(cos(g));
  main.append(c);
  // Juguen per experiència, no entrenen (futur_entrenador): nota pròpia, fora de la taula.
  for (const e of d.experiencia || []) main.append(el('p', { text: t('alineacio.experiencia_nota', { nom: e.nom }) }));
  if (d.copa) main.append(el('p', { text: t('alineacio.copa_nota') }));
  if (d.avisos.length) {
    const av = d.avisos.map((v) => v.tipus === 'cobertura' ? t('alineacio.cobertura', v)
      : v.tipus === 'una_alineacio' ? t('alineacio.una_alineacio', { partits: v.partits })
        : v.tipus === 'entrenament_perdut' ? t('alineacio.perdut', { nom: v.nom, motiu: t('motiu.' + v.motiu) })
          : t('alineacio.incomplet', { partit: curt(v.partit), buits: v.buits }));
    main.append(el('section', {}, el('h3', { text: t('alineacio.avisos_titol') }), el('ul', {}, ...av.map((x) => el('li', { text: x })))));
  }
}

// ── 4. Plantilla sènior (amb override de categoria) ──
export async function plantilla(main) {
  capcalera(main, 4, 'plantilla');
  const ORDRE = ['entrenable', 'futur_entrenador', 'experiencia', 'nucli_competitiu', 'farciment', 'venda', 'alliberament'];
  const CATS = ['entrenable', 'venda', 'alliberament', 'farciment', 'experiencia', 'futur_entrenador', 'nucli_competitiu'];
  const { instantania, jugadors, valor_especialitats: valorEsp = [] } = await api('/api/plantilla');
  if (!instantania) { main.append(el('p', { text: t('plantilla.buit') })); return; }
  main.append(el('p', { text: t('plantilla.instantania', { temporada: instantania.temporada, setmana: instantania.setmana_temporada, data: instantania.data }) }));
  const hab = (j) => `PO${j.porteria} DF${j.defensa} CR${j.creativitat} EX${j.extrem} PA${j.passades} AN${j.anotacio} PP${j.pilota_aturada}`;
  // Especialitat + prima de mercat (G.14): a Venda, si l'especialitat és valuosa.
  const cellaEsp = (j, c) => el('td', { text: (j.especialitat || '—') + (j.especialitat && c === 'venda' && valorEsp.includes(j.especialitat) ? ' ' + t('plantilla.prima') : '') });
  // Una targeta per categoria, amb files denses (el disseny: xip de posició, nom,
  // meta amb píndoles, punts, TSI i habilitats en monoespai).
  for (const c of ORDRE) {
    const grup = jugadors.filter((j) => j.categoria === c);
    if (!grup.length) continue;
    const tarja = card(t('categoria.' + c), grup.length, c === 'entrenable' ? 'llima' : c === 'alliberament' ? 'roig' : null);
    for (const j of grup) tarja.append(filaSegura(() => {
      // Override de categoria (punt 4a)
      const selCat = el('select', { 'aria-label': t('plantilla.col_categoria') }, ...CATS.map((x) => { const o = el('option', { value: x, text: t('categoria.' + x) }); if (x === j.categoria) o.setAttribute('selected', ''); return o; }));
      selCat.addEventListener('change', () => api('/api/categoria', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, categoria: selCat.value }) }).then(() => location.reload()).catch(() => {}));
      const meta = el('div', { class: 'fila-meta' },
        el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` }));
      if (j.especialitat && c === 'venda' && valorEsp.includes(j.especialitat)) meta.append(el('span', { class: 'pill ok', text: t('plantilla.prima') }));
      if (esLesionat(j.lesio)) meta.append(el('span', { class: 'pill perill', text: t('comu.lesionat_durada', { n: duradaLesio(j.lesio) ?? '?' }) }));
      if (j.origen === 'manual') meta.append(el('span', { class: 'pill info', text: t('plantilla.manual') }));
      return el('div', { class: 'fila' },
        el('div', { class: 'fila-qui' },
          el('div', { class: posCls(j.posicio), text: j.posicio || '—' }),
          el('div', {}, el('div', { class: 'fila-nom', text: j.nom }), meta)),
        el('div', { class: 'punts', text: decimal(j.puntuacio) }),
        el('div', { class: 'tsi', text: 'TSI ' + (j.tsi ?? '—') }),
        el('div', { class: 'skills', text: hab(j) }),
        el('div', { class: 'cel-cat' }, selCat));
    }, 1));
    main.append(tarja);
  }
}

// ── 5. Fotrem ──
const HABS_ENTREN = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];
export async function fotrem(main) {
  capcalera(main, 5, 'fotrem');
  const ESTATS = ['seguiment', 'elegit', 'cua_eixida'];
  const val = (v) => (v == null ? '-' : v === 'desconegut' ? t('fotrem.desconegut') : v);
  const d = await api('/api/fotrem');
  const juvenils = d.juvenils;
  // Recordatori permanent de tàctica (punt 15) + entrenament juvenil (punt 12)
  main.append(el('div', { class: 'tip', text: '⚡ ' + t('fotrem.tactica_reminder') }));
  const rell = card(t('fotrem.rellotges_titol'));
  const rc = el('div', { class: 'card-cos' });
  if (d.crida) cridaSetmanal(rc, d.crida);
  // 4a: proposta de promoció setmanal (millor nivell elegible); cua → despatx/vendre.
  if (d.promocio) {
    const p = d.promocio.proposta;
    rc.append(el('p', { text: !p ? t('fotrem.promocio_cap')
      : p.cua ? t('fotrem.promocio_cua', { nom: p.nom, nivell: decimal(p.nivell) })
        : t('fotrem.promocio_proposta', { nom: p.nom, nivell: decimal(p.nivell) }) }));
  }
  rell.append(rc);
  const duoDalt = el('div', { class: 'duo' }, rell);
  formEntrenamentJuvenil(duoDalt, d);
  main.append(duoDalt);
  if (!juvenils.length) { main.append(el('p', { text: t('fotrem.buit') })); return; }
  const hab = (j) => j.habilitats.filter((h) => h.actual != null || h.potencial != null).map((h) => `${SIGLA[h.habilitat]} ${val(h.actual)}/${val(h.potencial)}`).join('  ');
  // Pipeline en llenguatge pla (punt 2). Desconegut ≠ dolent: destí «per determinar».
  const pipeTxt = (j) => {
    const p = j.pipeline; if (!p) return '';
    if (p.motiu === 'per_determinar') return t('fotrem.pipe_per_determinar', { habilitat: p.principal });
    if (p.fora) {
      const base = p.motiu === 'topat' ? t('fotrem.pipe_topat', { habilitat: p.principal, actual: p.principal_actual, potencial: p.principal_potencial })
        : t('fotrem.pipe_sostre', { potencial: p.principal_potencial });
      return `${base} → ${t(p.proposta === 'promocionar_vendre' ? 'fotrem.prop_vendre' : 'fotrem.prop_cua')}`;
    }
    return `${t('fotrem.pipe_creix', { habilitat: p.principal, actual: p.principal_actual, potencial: p.principal_potencial })} · ${t(p.desti_promocio === 'fabrica' ? 'fotrem.desti_fabrica' : 'fotrem.desti_venda')}`;
  };
  // Taules netes: NIVELL numèric (una dada per columna); el PERQUÈ (raonament) viu al
  // títol de la cel·la (detall per fila), no a la graella. Aterratge = només la data (5b).
  // Rànquing per NIVELL: insígnia de nivell, qui és, i el rellotge de promoció.
  // El PERQUÈ (pipeline) viu al títol de la fila, no dins la graella.
  const duo = el('div', { class: 'duo' });
  const rank = card(t('fotrem.titol'), juvenils.length, 'llima');
  juvenils.forEach((j, i) => rank.append(filaSegura(() => {
    const sel = el('select', { 'aria-label': t('fotrem.col_estat') }, ...ESTATS.map((e) => { const o = el('option', { value: e, text: t('fotrem.estat_' + e) }); if (e === j.estat) o.setAttribute('selected', ''); return o; }));
    sel.addEventListener('change', () => api('/api/fotrem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.jugador_id, estat: sel.value }) }).catch(() => {}));
    const fila = el('div', { class: 'rank-fila' },
      el('div', { class: 'nivell' + (i === 0 ? ' top' : ''), text: j.nivell != null ? decimal(j.nivell) : '—' }),
      el('div', {}, el('div', { class: 'fila-nom', text: j.nom }),
        el('div', { class: 'fila-meta' },
          el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` }),
          el('span', { class: 'skills', text: hab(j) }))),
      el('div', { class: 'rank-dreta' },
        el('b', { text: j.dies_restants_promocio != null ? t('fotrem.dies', { dies: j.dies_restants_promocio }) : '—' }),
        el('span', { text: j.aterratge?.data || (typeof j.aterratge === 'string' ? j.aterratge : '—') }), ' ', sel));
    const perque = pipeTxt(j); if (perque) fila.setAttribute('title', perque);   // detall per fila
    return fila;
  }, 1)));
  duo.append(rank);
  if (d.onze_juvenil) onzeJuvenil(duo, d.onze_juvenil);
  main.append(duo);

  // Avaluador d'ofertes noves (punt 4d)
  const cOf = card(t('fotrem.oferta_titol'));
  const form = el('form', { class: 'card-cos' });
  const edatInp = el('input', { type: 'number', size: '3', 'aria-label': t('fotrem.edat') });   // NO ombrejar el formatador edat()
  const pot = el('input', { type: 'number', size: '3', 'aria-label': t('fotrem.col_potencial') });
  const comp = el('input', { type: 'number', size: '3', 'aria-label': t('fotrem.compost') });
  const res = el('span', {});
  const b = el('button', { type: 'button', class: 'b-prim', text: t('fotrem.avalua') });
  b.addEventListener('click', async () => {
    const r = await opc(api('/api/oferta?' + new URLSearchParams({ edat: edatInp.value, potencial: pot.value, compost: comp.value })));
    res.textContent = r && r.veredicte ? (r.veredicte.accepta ? t('fotrem.crida_accepta', { motiu: t('motiu.' + r.veredicte.motiu) }) : t('fotrem.crida_rebutja', { motiu: t('motiu.' + r.veredicte.motiu) })) : '—';
  });
  form.append(el('div', { class: 'form-graella' },
    el('label', {}, t('fotrem.edat'), edatInp), el('label', {}, t('fotrem.col_potencial'), pot),
    el('label', {}, t('fotrem.compost'), comp)), b, ' ', res);
  cOf.append(form); main.append(cOf);
}

// Rellotge de crida (reinici setmanal global): disponible → acció «he fet la crida»
// (data + resultat); gastada o tancada → línia informativa amb la pròxima.
function cridaSetmanal(main, c) {
  if (!c.disponible) { main.append(el('p', { class: 'nota-peu', text: t('fotrem.crida_proxima', { proxima: c.proxima }) })); return; }
  const fer = (resultat) => api('/api/crides', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resultat }) }).then(() => location.reload());
  const acc = el('button', { type: 'button', class: 'b-xic', text: t('fotrem.crida_feta_accepta') });
  acc.addEventListener('click', () => fer('acceptat'));
  const reb = el('button', { type: 'button', class: 'b-xic neutre', text: t('fotrem.crida_feta_rebutja') });
  reb.addEventListener('click', () => fer('rebutjat'));
  main.append(el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
    el('span', { class: 'mov-text', text: t('fotrem.crida_disponible', { caduca: c.caducitat }) }), acc, reb));
}

// Onze juvenil proposat (2b): descobriment probabilístic + fre de suplents.
function onzeJuvenil(main, o) {
  const sec = card(t('fotrem.onze_titol'), o.en_camp);
  const info = el('div', { class: 'card-cos' });
  if (o.no_viable) info.append(el('p', { text: t('fotrem.onze_no_viable', { en_camp: o.en_camp, minim: o.minim }) }));
  // 2c: capçalera derivada del repartiment REAL; si no hi ha descobriment, en positiu.
  info.append(el('p', { text: o.descobriments > 0
    ? t('fotrem.onze_repartiment', { descobriments: o.descobriments, entrenen: o.entrenen, estructura: o.estructura })
    : tp('fotrem.onze_tot_entrena', o.entrenen) }));
  if (o.descobriments > 0) info.append(el('p', { class: 'nota-peu', text: t('fotrem.onze_mecanica', { minuts: o.revelacio_minuts }) }));
  if (o.sense_marge) info.append(el('p', { class: 'nota-peu', text: t('fotrem.onze_sense_marge') }));
  sec.append(info);
  // El descobriment porta el seu propi text (amb plural i dies); el MIXT els encadena:
  // «entrena X · descobriment de Y» — les dues coses passen a la mateixa plaça.
  const txtDescobriment = (s, hab) => tp('fotrem.onze_m_descobriment', (hab || '').split(' i ').length, { principal: hab, dies: s.dies_restants_promocio ?? '?' });
  const motiuSlot = (s) => s.motiu === 'descobriment'
    ? txtDescobriment(s, s.habilitat)
    : s.motiu === 'mixt'
      ? `${t('fotrem.onze_m_entrena', { principal: s.habilitat_entrena })} · ${txtDescobriment(s, s.habilitat_descobrix)}`
      : s.motiu === 'entrena'
        ? t('fotrem.onze_m_entrena', { principal: s.habilitat })
        : t('fotrem.onze_m_' + s.motiu);
  // El mateix camp que la sènior: xip acolorit per posició, motiu al títol (detall per fila).
  sec.append(campDeJoc(o.onze, {
    anell: anellJuvenil,
    nom: (s) => cognom(s.nom),
    titol: (s) => `${s.nom} · ${motiuSlot(s)}`,
  }), campLlegenda('juvenil'));
  if (o.banqueta.length) {
    sec.append(el('div', { class: 'graella-fila' },
      el('b', { text: t('fotrem.onze_banqueta') }),
      el('span', { text: o.banqueta.map((s) => s.nom).join(', ') })));
  }
  main.append(sec);
}

// Entrenament juvenil declarable (F.12): principal + secundari, amb el pipeline sènior a la vora.
function formEntrenamentJuvenil(main, d) {
  const ej = d.entrenament_juvenil || {};
  const pipe = d.pipeline ? `${d.pipeline.principal}/${d.pipeline.secundari}` : '—';
  const sec = card(t('fotrem.entrenament_titol'), null, 'llima');
  const sc = el('div', { class: 'card-cos' });
  if (ej.principal) sc.append(el('p', { class: 'nota-peu', text: t('fotrem.entrenament_actual', { principal: ej.principal, secundari: ej.secundari || '?', pipeline: pipe }) }));
  sec.append(sc);
  // Punt 4: si no hi ha res declarat, preselecciona el pipeline de la fase (no alfabètic).
  const defPrin = ej.principal ?? d.pipeline?.principal ?? null;
  const defSec = ej.secundari ?? d.pipeline?.secundari ?? null;
  const opcs = (sel) => HABS_ENTREN.map((h) => { const o = el('option', { value: h, text: h }); if (sel === h) o.setAttribute('selected', ''); return o; });
  const principal = el('select', { 'aria-label': t('fotrem.entrenament_principal') }, ...opcs(defPrin));
  const secundari = el('select', { 'aria-label': t('fotrem.entrenament_secundari') }, el('option', { value: '', text: '—' }), ...opcs(defSec));
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('fotrem.entrenament_desa') });
  const f = el('form', { class: 'card-cos' }, el('div', { class: 'form-graella' },
    el('label', {}, t('fotrem.entrenament_principal'), principal),
    el('label', {}, t('fotrem.entrenament_secundari'), secundari)), b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/pla', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entrenament_juvenil: { principal: principal.value, secundari: secundari.value || null } }) });
    location.reload();
  });
  sec.append(f);
  main.append(sec);
}

// ── 6. Mercat ──
export async function mercat(main) {
  capcalera(main, 6, 'mercat');
  const { filtres, preus } = await api('/api/mercat');
  const pres = (v) => (v > 0 ? diners(v) : t('mercat.sense_pressupost'));
  const textFiltre = (f) => f.rol === 'entrenable'
    ? t('mercat.filtre_entrenable', { posicions: (f.posicions || []).join('/'), edat_max: f.edat_max, creativitat_min: f.creativitat_min, pressupost: pres(f.pressupost), falten: f.falten })
    : t('mercat.filtre_farciment', { bucket: f.bucket, posicions: (f.posicions || []).join('/'), habilitat: f.habilitat ? `${f.habilitat.camp} ${f.habilitat.op} ${f.habilitat.valor}` : '', pressupost: pres(f.pressupost), falten: f.falten })
      + (f.previsio_venda ? t('mercat.filtre_previsio', { noms: f.previsio_venda.join(', ') }) : '');
  const utils = filtres.filter((f) => f.falten > 0);
  const cf = card(t('mercat.filtres_titol'), utils.length, 'llima');
  const cfc = el('div', { class: 'card-cos' });
  if (utils.length) for (const f of utils) cfc.append(el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }), el('span', { class: 'mov-text', text: textFiltre(f) })));
  else cfc.append(el('p', { class: 'nota-peu', text: t('mercat.sense_filtres') }));
  cf.append(cfc); main.append(cf);
  const cp = card(t('mercat.preus_titol'), preus.length);
  if (!preus.length) cp.append(cos(el('p', { class: 'nota-peu', text: t('mercat.buit') })));
  else {
    const g = el('div', { class: 'graella' });
    for (const p of preus) g.append(el('div', { class: 'graella-fila' },
      el('b', { text: `${p.posicio || '—'} · ${p.edat ?? '—'}` }),
      el('span', { text: `${p.habilitat ?? '—'} · ${p.data}` }),
      el('span', { class: 'graella-val', text: diners(p.preu) })));
    cp.append(cos(g));
  }
  main.append(cp);
  await fitxesVenda(main);
}

// ── Fitxes de venda (Àrea E) ──
const ESTATS_VENDA = ['pendent', 'llistat', 'venut', 'desert', 'despatxat'];
async function fitxesVenda(main) {
  const { jugadors, cobertura: cobMin } = await api('/api/vendes');
  const sec = card(t('vendes.titol'), jugadors.length);
  if (!jugadors.length) { sec.append(cos(el('p', { text: t('vendes.buit') }))); main.append(sec); return; }
  const nota = notes();   // qualificadors repetits (estimació…) → asterisc + llegenda única
  // UNA SOLA FONT: la retenció per cobertura, amb el mínim derivat visible.
  if (cobMin && (cobMin.retinguts_camp || cobMin.retinguts_porters)) {
    sec.append(el('div', { class: 'card-cos' }, el('p', { class: 'nota-peu', text: t('vendes.retencio_resum', {
      n: (cobMin.retinguts_camp || 0) + (cobMin.retinguts_porters || 0),
      camp: cobMin.retinguts_camp || 0, porters: cobMin.retinguts_porters || 0, minim: cobMin.total }) })));
  }
  sec.append(el('div', { class: 'graella-cap c-venda' },
    ...['col_jugador', 'col_proposat', 'col_preu', 'col_data', 'col_tancament', 'col_estat'].map((k) => el('span', { text: t('vendes.' + k) }))));
  for (const j of jugadors) sec.append(filaSegura(() => {
    const preu = el('input', { type: 'number', size: '8', 'aria-label': t('vendes.col_preu') }); if (j.preu_eixida != null) preu.value = j.preu_eixida;
    const dataL = el('input', { type: 'date', 'aria-label': t('vendes.col_data') }); if (j.data_llistada) dataL.value = j.data_llistada;
    const estat = el('select', { 'aria-label': t('vendes.col_estat') }, ...ESTATS_VENDA.map((e) => { const o = el('option', { value: e, text: t('vendes.estat_' + e) }); if (e === j.estat) o.setAttribute('selected', ''); return o; }));
    const venut = el('input', { type: 'number', size: '8', 'aria-label': t('vendes.col_venut') }); if (j.preu_venut != null) venut.value = j.preu_venut;
    const desar = () => api('/api/vendes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      jugador_id: j.jugador_id, preu_eixida: preu.value || null, data_llistada: dataL.value || null, estat: estat.value, preu_venut: venut.value || null }) }).catch(() => {});
    for (const c of [preu, dataL, estat, venut]) c.addEventListener('change', desar);
    const propTxt = j.preu_proposat != null
      ? diners(j.preu_proposat) + (j.preu_estimacio_grossa ? nota.marca(t('vendes.estimacio_grossa')) : '')
      : '—';
    // 6: valor net < llindar → llistar és tirar diners → despatxar, amb el càlcul visible.
    const propCell = el('div', {}, el('span', { text: propTxt }));
    if (j.despatxar) propCell.append(el('div', { class: 'despatxar', text: t('vendes.despatxar', { net: diners(j.valor_net) }) }));
    // La porta de calibratge bloqueja el càlcul econòmic → la fila HO DIU, mai cel·la buida.
    else if (!j.calibrat) propCell.append(el('div', { class: 'nota-peu', text: t('vendes.pendent_calibratge') }));
    // La subhasta d'un llistat ha acabat sense venda apuntada → pregunta el resultat (tria a Estat).
    if (j.resultat_pendent) propCell.append(el('div', { class: 'nota-peu', text: t('vendes.resultat_pregunta') }));
    // Estat de liquidació (mateixa font que l'alerta agregada): llistat / retingut per
    // cobertura (amb el càlcul) / lesionat (llistable en recuperar) / llistable ara.
    // Fora les marques de buffer: amb la liquidació, «ven-lo l'últim» ja no existix.
    propCell.append(el('div', { class: 'cobertura', text: j.estat_liquidacio === 'retingut'
      ? t('vendes.retingut_cobertura', { n: cobMin?.camp_minim ?? '?' })
      : t('vendes.estat_liq_' + (j.estat_liquidacio || 'llistable')) }));
    return el('div', { class: 'graella-fila-d c-venda' },
      el('div', { class: 'fila-qui' },
        el('div', { class: posCls(j.posicio), text: j.posicio || '—' }),
        el('div', {}, el('div', { class: 'fila-nom', text: j.nom }),
          el('div', { class: 'fila-meta' }, el('span', { text: j.especialitat || '—' }),
            ...(j.lesionat ? [el('span', { class: 'pill perill', text: t('comu.lesionat_durada', { n: duradaLesio(j.lesio) ?? '?' }) })] : [])))),
      propCell, preu, dataL,
      el('span', { text: j.tancament_previst || '—' }),
      el('div', { class: 'cel-controls' }, estat, venut));
  }, 1));
  for (const ll of nota.llegendes()) sec.append(cos(el('p', { class: 'nota-peu', text: ll })));
  main.append(sec);
}

// ── 7. Economia ──
const TIPUS_MOV = ['compra', 'venda', 'sou_setmanal', 'ingres_patrocini', 'taquilla', 'personal', 'estadi', 'taxa_llistat', 'altres'];
// Formata en «diners» les claus monetàries d'un objecte de paràmetres (la resta
// intacta): així cap plantilla econòmica interpola un número cru.
const eur = (obj, ...keys) => { const o = { ...obj }; for (const k of keys) if (o[k] != null) o[k] = diners(o[k]); return o; };
export async function economia(main) {
  capcalera(main, 7, 'economia');
  const { transaccions, economia: e } = await api('/api/transaccions');
  // Tres xifres grans (el disseny): caixa, objectiu amb barra de progrés, i balanç.
  const kpis = el('div', { class: 'eco-kpis' });
  kpis.append(el('div', { class: 'eco-card fosc' },
    el('div', { class: 'eco-et', text: t('economia.caixa_et') }),
    el('div', { class: 'eco-xifra', text: diners(e.caixa) }),
    el('div', { class: 'eco-nota', text: e.caixaReal && e.caixa_data ? e.caixa_data : t('economia.caixa_derivada') })));
  const pr = e.projeccio;
  if (pr) {
    const pct = Math.max(0, Math.min(100, pr.percentatge ?? 0));
    const barra = el('div', { class: 'barra' }, el('i'));
    barra.firstChild.style.width = pct + '%';
    kpis.append(el('div', { class: 'eco-card' },
      el('div', { class: 'eco-et', text: t('economia.objectiu_et') }),
      el('div', { class: 'eco-xifra', text: diners(pr.objectiu) }), barra,
      el('div', { class: 'eco-nota', text: t('economia.falta_nota', { falta: diners(pr.falta), pct }) })));
  }
  if (e.balanc_setmanal != null) {
    kpis.append(el('div', { class: 'eco-card' },
      el('div', { class: 'eco-et', text: t('economia.balanc_et') }),
      el('div', { class: 'eco-xifra' + (e.balanc_setmanal < 0 ? ' neg' : ''), text: diners(e.balanc_setmanal) }),
      el('div', { class: 'eco-nota', text: t('economia.despeses_detall', eur({ ...e.despeses, ingres: e.ingres_setmanal }, 'nomina', 'planter', 'estadi', 'personal', 'ingres')) })));
  }
  main.append(kpis);
  if (pr && pr.estimat) capitalEstimat(main, pr);
  else if (!pr) main.append(el('p', { class: 'nota-peu', text: t('economia.sense_objectiu') }));
  if (pr && pr.sense_dades_venda) main.append(el('p', { class: 'nota-peu', text: t('economia.trajectoria_informativa', eur(pr, 'objectiu')) }));
  else if (pr && pr.arriba != null) main.append(el('p', { class: 'nota-peu', text: t(pr.arriba ? 'economia.trajectoria_arriba' : 'economia.trajectoria_no', eur(pr, 'caixa_projectada', 'ingres_estimat')) }));

  // Dues targetes de treball: declarar les xifres reals i apuntar moviments.
  const duo = el('div', { class: 'duo' });
  const cFin = card(t('economia.finances_titol'));
  formFinances(cFin, e);
  duo.append(cFin);

  const cMov = card(t('economia.moviments_titol'), transaccions.length);
  const llista = el('div', { class: 'card-cos' });
  if (transaccions.length) {
    for (const tr of transaccions.slice(0, 30)) {
      const b = el('button', { type: 'button', class: 'b-xic neutre', text: t('economia.esborra') });
      b.addEventListener('click', () => api('/api/transaccions', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: tr.id }) }).then(() => location.reload()));
      llista.append(el('div', { class: 'mov-fila' },
        el('span', { class: 'mov-punt' }),
        el('span', { class: 'mov-text', text: `${tr.data} · ${t('tipus.' + tr.tipus)}${tr.jugador ? ' · ' + tr.jugador : ''}` }),
        el('b', { text: diners(tr.import) }), b));
    }
  } else llista.append(el('p', { class: 'nota-peu', text: t('economia.buit') }));
  cMov.append(llista);
  formMoviment(cMov);
  duo.append(cMov);
  main.append(duo);

}

function formFinances(main, e) {
  const f = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const camp = (clau, val, type = 'number') => { const i = el('input', { type, 'aria-label': t('economia.' + clau) }); if (val != null) i.value = val; return el('label', {}, t('economia.' + clau), i); };
  const caixa = camp('caixa_real', e.caixaReal ? e.caixa : null);
  const caixaData = camp('caixa_data', e.caixa_data, 'date');
  const planter = camp('despesa_planter', e.despeses?.planter || null);
  const estadi = camp('despesa_estadi', e.despeses?.estadi || null);
  const ingres = camp('ingres_setmanal', e.ingres_setmanal);
  graella.append(caixa, caixaData, planter, estadi, ingres);
  f.append(graella, el('button', { type: 'submit', class: 'b-prim', text: t('economia.finances_desa') }));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (l) => { const x = l.querySelector('input').value; return x === '' ? null : x; };
    await api('/api/finances', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      caixa: v(caixa), caixa_data: v(caixaData), despesa_planter: v(planter), despesa_estadi: v(estadi), ingres_setmanal: v(ingres) }) });
    location.reload();
  });
  main.append(f);
}

function formMoviment(main) {
  const f = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const tipus = el('select', { 'aria-label': t('economia.tipus') }, ...TIPUS_MOV.map((x) => el('option', { value: x, text: t('tipus.' + x) })));
  const imp = el('input', { type: 'number', 'aria-label': t('economia.import') });
  const jug = el('input', { type: 'number', 'aria-label': t('economia.jugador_id') });
  const data = el('input', { type: 'date', 'aria-label': t('economia.data') });
  const nota = el('input', { type: 'text', 'aria-label': t('economia.nota') });
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('economia.afig') });
  graella.append(el('label', {}, t('economia.tipus'), tipus), el('label', {}, t('economia.import'), imp),
    el('label', {}, t('economia.jugador_id'), jug), el('label', {}, t('economia.data'), data),
    el('label', {}, t('economia.nota'), nota));
  f.append(graella, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (imp.value === '') return;
    await api('/api/transaccions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      tipus: tipus.value, import: Number(imp.value), jugador_id: jug.value ? Number(jug.value) : null, data: data.value || null, nota: nota.value || null }) });
    location.reload();
  });
  main.append(f);
}

// Capital d'inflexió estimat (desglossat): Paco el proposa; un clic l'accepta o
// s'edita (i aleshores passa a manual). No es pregunta en fred.
function capitalEstimat(main, pr) {
  main.append(el('p', { text: t('economia.capital_estimat', eur(pr, 'objectiu', 'caixa', 'falta')) }));
  const ul = el('ul');
  for (const d of pr.desglossament || []) {
    const clau = d.concepte === 'fitxatges'
      ? t('economia.capital_fitxatges', eur({ ...d, font: t('font.' + d.font) }, 'sostre', 'import'))
      : t('economia.capital_' + d.concepte, eur(d, 'import', 'nomina'));
    ul.append(el('li', { text: clau }));
  }
  main.append(ul);
  const fixa = async (valor) => { await api('/api/pla', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ capital_objectiu: valor }) }); location.reload(); };
  const accepta = el('button', { type: 'button', text: t('economia.capital_accepta') });
  accepta.addEventListener('click', () => fixa(pr.objectiu));
  const inp = el('input', { type: 'number', value: pr.objectiu, min: '0' });
  const desa = el('button', { type: 'button', text: t('economia.capital_desa') });
  desa.addEventListener('click', () => fixa(parseInt(inp.value, 10)));
  main.append(el('p', {}, accepta), el('p', {}, el('label', { text: t('economia.capital_edita') + ' ' }, inp), ' ', desa));
}

// ── 8. Pla mestre ──
export async function pla(main) {
  capcalera(main, 8, 'pla');
  const d = await api('/api/pla');
  if (d.error) { main.append(el('p', { text: t('pla.sense_pla') })); return; }
  main.append(el('p', { class: 'nota-peu', text: `${t('pla.fase_actual')}: ${d.fase_actual ? t('fase.' + d.fase_actual) : '—'} · ${t('pla.temporada_actual')}: ${d.temporadaActual != null ? 'T' + d.temporadaActual : '—'}` }));
  const c = card(t('pla.titol'), d.temporades.length);
  c.append(el('div', { class: 'graella-cap c-pla' },
    ...['col_temporada', 'col_mode', 'col_accions', 'col_estat'].map((k) => el('span', { text: t('pla.' + k) }))));
  for (const tp of d.temporades) {
    const accions = [...(tp.accions.events || []), ...(tp.retard.length ? [t('pla.retard', { detall: tp.retard.join('; ') })] : [])];
    c.append(el('div', { class: 'graella-fila-d c-pla' },
      el('div', { class: 'nivell' + (tp.estat === 'actual' ? ' top' : ''), text: 'T' + tp.temporada }),
      el('span', { class: 'pill', text: tp.divisio_prevista || '—' }),
      el('div', {}, el('div', { class: 'fila-nom', text: tp.mode || '—' }),
        el('div', { class: 'fila-meta' }, el('span', { text: accions.join(' · ') || '—' }))),
      el('span', { class: 'pill ' + (tp.estat === 'actual' ? 'ok' : tp.estat === 'passada' ? '' : 'info'), text: t('pla.estat_' + tp.estat) })));
  }
  main.append(c);
  formEstructura(main, d.parametres || {});
  // Punt 3a: activar l'acadèmia després si no en tens.
  const eq = await opc(api('/api/equips'));
  if (eq && eq.equips && !eq.equips.some((e) => e.tipus === 'juvenil')) formActivaAcademia(main);
}

function formActivaAcademia(main) {
  const nom = el('input', { type: 'text', 'aria-label': t('pla.academia_nom') });
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('pla.academia_desa') });
  const c = card(t('pla.activa_academia'));
  const f = el('form', { class: 'card-cos' }, el('label', {}, t('pla.academia_nom'), nom), b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!nom.value.trim()) return;
    await api('/api/equips', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ juvenil: { nom: nom.value.trim() } }) });
    location.reload();
  });
  c.append(f); main.append(c);
}

// Estructura i calendari: divisió actual, tipus de setmana de partits, Supporter.
function formEstructura(main, params) {
  const c = card(t('pla.estructura_titol'));
  const f = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const divisio = el('input', { type: 'text', 'aria-label': t('pla.divisio_actual') });
  if (params.divisio_actual) divisio.value = params.divisio_actual;
  const setmana = el('select', { 'aria-label': t('pla.tipus_setmana') }, ...['ab', 'un', 'copa'].map((x) => {
    const o = el('option', { value: x, text: t('pla.setmana_' + x) }); if ((params.tipus_setmana || 'ab') === x) o.setAttribute('selected', ''); return o; }));
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('pla.desa') });
  graella.append(el('label', {}, t('pla.divisio_actual'), divisio), el('label', {}, t('pla.tipus_setmana'), setmana));
  f.append(graella, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/pla', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      divisio_actual: divisio.value || '', tipus_setmana: setmana.value }) });
    location.reload();
  });
  c.append(f); main.append(c);
}

// ── 9. Personal ──
const ESPECIALISTES = ['assistents', 'metge', 'psicoleg'];
const lblElement = (k) => { const v = t('element.' + k); return v === t('comu.text_indisponible') ? k : v; };
export async function personal(main) {
  capcalera(main, 9, 'personal');
  const d = await api('/api/personal');
  if (d.error) { main.append(el('p', { text: t('pla.sense_pla') })); return; }
  main.append(el('p', { class: 'nota-peu', text: t('personal.fase_actual', { fase: t('fase.' + d.fase_actual) }) }));

  const duo = el('div', { class: 'duo' });
  // Entrenament sènior: prescrit per la fase + confirmació del que hi ha a HT
  if (d.entrenament?.prescrit) formEntrenament(duo, d.entrenament);

  // Membres declarats (rol, tipus, nivell, sou, setmanes de contracte)
  const secM = card(t('personal.membres_titol'), d.membres.length);
  if (d.desquadres.length) {
    const av = el('div', { class: 'card-cos' });
    for (const x of d.desquadres) av.append(el('p', { class: 'nota-peu', text: t('personal.desquadre', { clau: lblElement(x.clau), declarat: x.declarat, esperat: x.esperat }) }));
    secM.append(av);
  }
  if (d.membres.length) {
    for (const m of d.membres) {
      const b = el('button', { type: 'button', class: 'b-xic neutre', text: t('personal.esborra') });
      b.addEventListener('click', () => api('/api/personal', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: m.id }) }).then(() => location.reload()));
      secM.append(el('div', { class: 'graella-fila-d c-staff' },
        el('div', {}, el('span', { class: 'tag', text: t('personal.rol_' + m.rol) }), ' ',
          el('b', { text: m.tipus ? lblElement(m.tipus) : '—' })),
        el('span', { class: 'pill', text: t('personal.nivell') + ' ' + (m.nivell ?? '—') }),
        el('b', { text: m.sou != null ? diners(m.sou) : '—' }), b));
    }
  } else secM.append(cos(el('p', { class: 'nota-peu', text: t('personal.cap_membre') })));
  formMembre(secM);
  duo.append(secM);
  main.append(duo);
}

function formEntrenament(main, ent) {
  const pr = ent.prescrit, co = ent.confirmat || {};
  const sec = card(t('personal.entrenament_titol'), null, 'llima');

  // ENTRENAMENT SÈNIOR TRIABLE: en canviar-lo, es deriven de nou les places que
  // entrenen, els %, la cobertura, les alineacions i els anells del camp (guia §6).
  if (ent.opcions && ent.opcions.length) {
    const selT = el('select', { 'aria-label': t('personal.entrenament_senior') },
      ...ent.opcions.map((h) => { const o = el('option', { value: h, text: t('habilitat.' + h) }); if (h === ent.senior) o.setAttribute('selected', ''); return o; }));
    selT.addEventListener('change', async () => {
      await api('/api/pla', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entrenament_senior: selT.value }) });
      location.reload();   // recalcula alineació, cobertura i anells amb el nou entrenament
    });
    sec.append(el('div', { class: 'card-cos' },
      el('label', {}, t('personal.entrenament_senior'), selT),
      el('p', { class: 'nota-peu', text: t('personal.entrenament_senior_nota') })));
  }

  const f = el('form', { class: 'card-cos' },
    el('p', { class: 'nota-peu', text: t('personal.entrenament_prescrit', pr) }),
    el('p', { class: 'nota-peu', text: t('personal.entrenament_confirma') }));
  const graella = el('div', { class: 'form-graella' });
  const tipus = el('input', { type: 'text', 'aria-label': t('personal.ent_tipus'), value: co.tipus ?? '' });
  const inten = el('input', { type: 'number', 'aria-label': t('personal.ent_intensitat') }); if (co.intensitat != null) inten.value = co.intensitat;
  const resis = el('input', { type: 'number', 'aria-label': t('personal.ent_resistencia') }); if (co.resistencia != null) resis.value = co.resistencia;
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('personal.entrenament_desa') });
  graella.append(el('label', {}, t('personal.ent_tipus'), tipus), el('label', {}, t('personal.ent_intensitat'), inten),
    el('label', {}, t('personal.ent_resistencia'), resis));
  f.append(graella, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/pla', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      entrenament_confirmat: { tipus: tipus.value || null, intensitat: inten.value ? Number(inten.value) : null, resistencia: resis.value ? Number(resis.value) : null } }) });
    location.reload();
  });
  sec.append(f);
  main.append(sec);
}

function formMembre(main) {
  const f = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const rol = el('select', { 'aria-label': t('personal.rol') }, ...['entrenador', 'especialista'].map((r) => el('option', { value: r, text: t('personal.rol_' + r) })));
  const tipus = el('select', { 'aria-label': t('personal.tipus') }, ...ESPECIALISTES.map((x) => el('option', { value: x, text: lblElement(x) })));
  const nivell = el('input', { type: 'number', 'aria-label': t('personal.nivell') });
  const sou = el('input', { type: 'number', 'aria-label': t('personal.sou') });
  const setm = el('input', { type: 'number', 'aria-label': t('personal.setmanes_contracte') });
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('personal.afig') });
  graella.append(el('label', {}, t('personal.rol'), rol), el('label', {}, t('personal.tipus'), tipus),
    el('label', {}, t('personal.nivell'), nivell), el('label', {}, t('personal.sou'), sou),
    el('label', {}, t('personal.setmanes_contracte'), setm));
  f.append(graella, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/personal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      rol: rol.value, tipus: rol.value === 'especialista' ? tipus.value : null,
      nivell: nivell.value || null, sou: sou.value || null, setmanes_contracte: setm.value || null }) });
    location.reload();
  });
  main.append(f);
}

// ── 10a. Pujada de dades ──
export function pujada(main, teAcademia = true) {
  capcalera(main, 10, 'comparador');
  const c = card(t('pujada.titol'), null, 'llima');
  const form = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const data = el('input', { type: 'date', name: 'data', required: 'true', 'aria-label': t('pujada.data') });
  data.value = new Date().toISOString().slice(0, 10);
  const senior = el('input', { type: 'file', name: 'senior', accept: '.csv', 'aria-label': t('pujada.fitxer_senior') });
  const estat = el('p', { role: 'status' });
  graella.append(el('label', {}, t('pujada.data'), data), el('label', {}, t('pujada.fitxer_senior'), senior));
  if (teAcademia) {   // punt 3b: sense acadèmia, només CSV sènior
    const juvenil = el('input', { type: 'file', name: 'juvenil', accept: '.csv', 'aria-label': t('pujada.fitxer_juvenil') });
    graella.append(el('label', {}, t('pujada.fitxer_juvenil'), juvenil));
  }
  form.append(el('p', { class: 'nota-peu', text: t('pujada.descripcio') }), graella,
    el('button', { type: 'submit', class: 'b-prim', text: t('pujada.enviar') }), estat);
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
  c.append(form); main.append(c);
}

// ── 10b. Què ha canviat ──
export async function comparador(main) {
  const d = await api('/api/comparador');
  const c = card(t('comparador.canvis_titol'));
  const cs = el('div', { class: 'card-cos' });
  if (!d.comparable) { cs.append(el('p', { class: 'nota-peu', text: t('comparador.sense') })); c.append(cs); main.append(c); return; }
  cs.append(el('p', { class: 'nota-peu', text: t('comparador.parella', { b: d.b.data, a: d.a.data, dies: d.dies }) + (d.canvi_temporada ? ` (${t('comparador.canvi_temporada')})` : '') }));
  if (d.pops.length) {
    for (const p of d.pops) cs.append(el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: p.nom }), el('span', { class: 'skills', text: p.habilitats.map((h) => SIGLA[h]).join(' ') })));
  } else cs.append(el('p', { class: 'nota-peu', text: t('comparador.cap_pop') }));
  c.append(cs);
  // Altes i baixes (punt #10.4): declarades en una línia. Les baixes tenen el flux de
  // motiu a «Moviments»; les altes només es declaren.
  const decl = (clau, fitxa) => t(clau, { nom: fitxa.nom, edat: edat(fitxa.edat_anys, fitxa.edat_dies), categoria: fitxa.categoria ? t('categoria.' + fitxa.categoria) : '—' });
  if ((d.nous && d.nous.length) || (d.desapareguts && d.desapareguts.length)) {
    const ab = el('div', { class: 'card-cos' }, el('h3', { text: t('comparador.altes_baixes_titol') }));
    for (const f of d.nous || []) ab.append(el('div', { class: 'mov-fila' }, el('span', { class: 'pill ok', text: '+' }), el('span', { class: 'mov-text', text: decl('comparador.alta', f) })));
    for (const f of d.desapareguts || []) ab.append(el('div', { class: 'mov-fila' }, el('span', { class: 'pill perill', text: '−' }), el('span', { class: 'mov-text', text: decl('comparador.baixa', f) })));
    c.append(ab);
  }
  main.append(c);
}
