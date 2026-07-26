// Tonico — render de cada secció de la pàgina única. Les APIs no canvien: cada
// funció fa el seu fetch i pinta dins del seu contenidor. Els errors s'aïllen
// per secció (una que falla no tomba la pàgina). HTML semàntic, reset mínim.
import { api, el, t, tp, filaSegura } from '/comu.js';
import { diners, milers, decimal, percent, edat, notes, esLesionat, duradaLesio, ambXifres, rendiment } from '/format.js';

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
const card = (titol, compte, variant, accio = null) => {
  const c = el('section', { class: 'card' });
  if (titol != null) {
    const cap = el('div', { class: 'card-cap' + (variant ? ' ' + variant : '') }, el('h3', { class: 'card-titol', text: titol }));
    if (compte != null) cap.append(el('span', { class: 'card-compte', text: String(compte) }));
    if (accio) cap.append(accio);                 // acció a la dreta: p. ex. el llapis d'editar
    c.append(cap);
  }
  return c;
};
const cos = (...fills) => el('div', { class: 'card-cos' }, ...fills);
// Sigla de posició → classe de color del xip.
const posCls = (p) => 'pos ' + String(p || '').toLowerCase().slice(0, 2);
// El NIVELL el calcula l'avaluador (PAS 12) amb llindes que són poms: ací només es tria
// la classe. La vista no compara números de domini (invariant 12).
const classeNivell = (n) => ({ urgent: 'urgent', aviat: 'mitja', normal: 'baixa' }[n] || 'baixa');

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
// SÈNIOR: l'anell (quant d'entrenament hi ha en joc) el calcula l'avaluador al PAS 9.
const anellSenior = (s) => s.anell ?? '';
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
  // El v3 no té «fase» del pla (va caure amb el pla per temporades): la capçalera diu la
  // temporada i l'estratègia activa, que és el que el contracte reconeix.
  const conf = await opc(api('/api/config'));
  const pla = await opc(api('/api/pla'));
  const trossos = [`${t('esta_setmana.base', { data: instantania.data })}`];
  if (pla && !pla.error && pla.temporadaActual != null) {
    trossos.push(t('esta_setmana.estat', { temporada: pla.temporadaActual,
      estrategia: conf?.config ? t('estrategia.' + conf.config.estrategia) : '—' }));
  }
  const capçalera = hero(trossos.join(' · '));

  // KPIs derivats (res decoratiu): accions de hui i línies d'agenda.
  const kpis = el('div', { class: 'kpis' });
  const kpi = (n, clau, alerta) => el('div', { class: 'kpi' + (alerta ? ' alerta' : '') },
    el('div', { class: 'kpi-xifra', text: milers(n) }), el('div', { class: 'kpi-etiqueta', text: t(clau) }));
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
  // Resum d'una línia de l'onze juvenil (2d): el detall viu a Juvenils, no al parte.
  const fot = await opc(api('/api/juvenils'));
  if (fot && fot.onze_juvenil) brief.append(el('p', {}, el('a', { href: '#juvenils', text: tp('esta_setmana.resum_juvenil', fot.onze_juvenil.descobriments) })));
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
  // Les unitats les DECLARA l'avaluador (`diners` a l'alerta), no les endevina la vista pel
  // nom del paràmetre. Endevinar-les formatava «objectiu: 8 jugadors» com si fóra un import.
  // La resta de números també passen pel formatador (enters amb milers, fraccionaris amb
  // coma): dins d'un text d'alerta una xifra crua es veu igual de mal que a una cel·la.
  // El text d'una alerta: si declara COMPTADOR, la clau és una base i la variant la tria el
  // nombre (`tp`); si no, és una clau directa. Les xifres sempre passen pel formatador.
  const textAlerta = (a, par) => (a.compte
    ? tp(a.missatge_clau, Number(par[a.compte]), ambXifres(par, a.diners))
    : t(a.missatge_clau, ambXifres(par, a.diners)));
  if (alertes.length) {
    const graella = el('ul', { class: 'targetes' });
    for (const a of alertes) {
      const niv = classeNivell(a.nivell);
      const par = a.parametres || {};
      const li = el('li', { class: 'targeta ' + niv },
        el('div', { class: 'targeta-cap' },
          el('span', { class: 'tag', text: t('urgencia.' + niv) }),
          el('span', { class: 'targeta-nom', text: par.nom || t('esta_setmana.accio') })),
        el('p', { text: textAlerta(a, par) }));
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
  const boto = (id, accio, text, cls = 'b-xic neutre') => { const b = el('button', { type: 'button', class: cls, text }); b.addEventListener('click', async () => { await api('/api/intercanvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, accio }) }); location.reload(); }); return b; };
  const { moviments, historial = [], preguntes } = await api('/api/intercanvis');
  const liniaMov = (x) => {
    const dif = decimal(x.diferencia);
    const txt = x.entrant ? t('moviments.mov', { entrant: x.entrant, eixent: x.eixent, desti: t('categoria.' + x.desti_eixent), diferencia: dif })
      : t('moviments.mov_solo', { eixent: x.eixent, categoria: t('categoria.' + x.categoria), desti: t('categoria.' + x.desti_eixent) });
    return el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: txt }), boto(x.id, 'desfer', t('moviments.desfes'), 'b-enllac'));
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

  // LES DUES COLUMNES DEL DISSENY. El que s'ha FET va a la targeta sòlida; el que ESPERA la
  // teua paraula —preguntes i motius— va junt a un panell discontinu. La jerarquia és la
  // vora: sòlida = passat, discontínua = pendent. Abans eren tres targetes iguals i les dues
  // pendents competien visualment amb el que ja estava resolt.
  const pend = el('div', { class: 'card-pendent' });

  // Preguntes prèvies (només overrides manuals)
  pend.append(el('h3', { class: 'pend-et', text: t('moviments.preguntes_titol') }));
  if (!preguntes.length) pend.append(el('p', { class: 'pend-buit', text: t('moviments.cap_pregunta') }));
  for (const x of preguntes) {
    const dif = decimal(x.diferencia);
    const p = el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: t('moviments.pregunta', { entrant: x.entrant, eixent: x.eixent, categoria: t('categoria.' + x.categoria), desti: t('categoria.' + x.desti_eixent), diferencia: dif }) }));
    p.append(boto(x.id, 'acceptar', t('plantilla.acceptar')), boto(x.id, 'rebutjar', t('plantilla.rebutjar')));
    pend.append(p);
  }

  // Motius de baixa (punt 4b)
  const motius = await opc(api('/api/motius'));
  const pendents = motius?.pendents || [];
  pend.append(el('h3', { class: 'pend-et', text: t('decisions.motius_titol') }));
  if (!pendents.length) pend.append(el('p', { class: 'pend-buit', text: t('decisions.sense_motius') }));
  for (const j of pendents) {
    const sel = el('select', {}, ...['venda', 'despatx', 'promocio', 'altres'].map((m) => el('option', { value: m, text: t('motiu_baixa.' + m) })));
    const origenSel = el('select', {}, el('option', { value: '', text: '—' }), ...(j.candidats_juvenils || []).map((c) => el('option', { value: c.id, text: c.nom })));
    const b = el('button', { type: 'button', class: 'b-xic', text: t('decisions.desa') });
    b.addEventListener('click', async () => {
      await api('/api/motius', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, motiu: sel.value, origen_juvenil_id: origenSel.value ? Number(origenSel.value) : null }) });
      location.reload();
    });
    // Sense casella d'IMPORT: la venda ja no s'apunta enlloc (no entra a cap fórmula) i
    // demanar-la era una porta oberta a un número que no anava a cap lloc.
    pend.append(el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
      el('span', { class: 'mov-text', text: t('decisions.motiu_jugador', { nom: j.nom }) }), sel, origenSel, b));
  }
  duo.append(pend);
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
    if ((c === 'core' || c === 'rotatiu') && s.entrena) return t('alineacio.motiu_entrena', { pos: s.codi, pct: s.pct });
    if (c === 'futur_entrenador') return t('alineacio.motiu_experiencia');
    if (c === 'titular') return t('alineacio.motiu_titular');
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
    const av = d.avisos.map((v) => v.tipus === 'cobertura' ? tp('alineacio.cobertura', v.entrenen, v)
      : v.tipus === 'una_alineacio' ? t('alineacio.una_alineacio')
        : v.tipus === 'entrenament_perdut' ? t('alineacio.perdut', { nom: v.nom, motiu: t('motiu.' + v.motiu) })
          : v.tipus === 'llocs_buits' ? tp('alineacio.llocs_buits', v.n)
            : '');
    main.append(el('section', {}, el('h3', { text: t('alineacio.avisos_titol') }), el('ul', {}, ...av.map((x) => el('li', { text: x })))));
  }
}

// ── 4. Plantilla sènior (amb override de categoria) ──
export async function plantilla(main) {
  capcalera(main, 4, 'plantilla');
  // Vocabulari del contracte v3 (invariant 14). No hi ha «entrenable» ni «farciment».
  const ORDRE = ['core', 'rotatiu', 'titular', 'porter', 'futur_entrenador', 'cos', 'venda'];
  const CATS = ['core', 'rotatiu', 'titular', 'porter', 'cos', 'venda', 'futur_entrenador'];
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
    const tarja = card(t('categoria.' + c), grup.length, c === 'core' ? 'llima' : c === 'venda' ? 'roig' : null);
    for (const j of grup) tarja.append(filaSegura(() => {
      // Override de categoria (punt 4a)
      const selCat = el('select', { 'aria-label': t('plantilla.col_categoria') }, ...CATS.map((x) => { const o = el('option', { value: x, text: t('categoria.' + x) }); if (x === j.categoria) o.setAttribute('selected', ''); return o; }));
      selCat.addEventListener('change', () => api('/api/categoria', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.id, categoria: selCat.value }) }).then(() => location.reload()).catch(() => {}));
      const meta = el('div', { class: 'fila-meta' },
        el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` }));
      if (j.especialitat && c === 'venda' && valorEsp.includes(j.especialitat)) meta.append(el('span', { class: 'pill ok', text: t('plantilla.prima') }));
      if (esLesionat(j.lesio)) meta.append(el('span', { class: 'pill perill', text: t('comu.lesionat_durada', { n: duradaLesio(j.lesio) ?? '?' }) }));
      if (j.origen === 'manual') meta.append(el('span', { class: 'pill info', text: t('plantilla.manual') }));
      // DESPATXABLE: sobrant que ha eixit a subhasta i ningú l'ha volgut. No té lloc a cap dels
      // dos onzes i cada setmana cobra: la decisió és de plantilla, no de mercat.
      if (j.despatxar) meta.append(el('span', { class: 'pill perill', text: t('plantilla.despatxable') }));
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

// ── 5. Juvenils ──
const HABS_ENTREN = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];
export async function juvenils(main) {
  capcalera(main, 5, 'juvenils');
  const ESTATS = ['seguiment', 'elegit', 'cua_eixida'];
  const val = (v) => (v == null ? '-' : v === 'desconegut' ? t('juvenils.desconegut') : v);
  const d = await api('/api/juvenils');
  const juvenils = d.juvenils;
  // Recordatori permanent de tàctica (punt 15) + entrenament juvenil (punt 12)
  main.append(el('div', { class: 'tip', text: '⚡ ' + t('juvenils.tactica_reminder') }));
  const rell = card(t('juvenils.rellotges_titol'));
  const rc = el('div', { class: 'card-cos' });
  if (d.crida) cridaSetmanal(rc, d.crida);
  // 4a: proposta de promoció setmanal (millor nivell elegible); cua → despatx/vendre.
  if (d.promocio) {
    const p = d.promocio.proposta;
    rc.append(el('p', { text: !p ? t('juvenils.promocio_cap')
      : p.cua ? t('juvenils.promocio_cua', { nom: p.nom, nivell: decimal(p.nivell) })
        : t('juvenils.promocio_proposta', { nom: p.nom, nivell: decimal(p.nivell) }) }));
  }
  rell.append(rc);
  const duoDalt = el('div', { class: 'duo' }, rell);
  formEntrenamentJuvenil(duoDalt, d);
  main.append(duoDalt);
  if (!juvenils.length) { main.append(el('p', { text: t('juvenils.buit') })); return; }
  const hab = (j) => j.habilitats.filter((h) => h.actual != null || h.potencial != null).map((h) => `${SIGLA[h.habilitat]} ${val(h.actual)}/${val(h.potencial)}`).join('  ');
  // Pipeline en llenguatge pla (punt 2). Desconegut ≠ dolent: destí «per determinar».
  const pipeTxt = (j) => {
    const p = j.pipeline; if (!p) return '';
    if (p.motiu === 'per_determinar') return t('juvenils.pipe_per_determinar', { habilitat: p.principal });
    if (p.fora) {
      const base = p.motiu === 'topat' ? t('juvenils.pipe_topat', { habilitat: p.principal, actual: p.principal_actual, potencial: p.principal_potencial })
        : t('juvenils.pipe_sostre', { potencial: p.principal_potencial });
      return `${base} → ${t(p.proposta === 'promocionar_vendre' ? 'juvenils.prop_vendre' : 'juvenils.prop_cua')}`;
    }
    return `${t('juvenils.pipe_creix', { habilitat: p.principal, actual: p.principal_actual, potencial: p.principal_potencial })} · ${t(p.desti_promocio === 'promociona' ? 'juvenils.desti_promociona' : 'juvenils.desti_venda')}`;
  };
  // Taules netes: NIVELL numèric (una dada per columna); el PERQUÈ (raonament) viu al
  // títol de la cel·la (detall per fila), no a la graella. Aterratge = només la data (5b).
  // Rànquing per NIVELL: insígnia de nivell, qui és, i el rellotge de promoció.
  // El PERQUÈ (pipeline) viu al títol de la fila, no dins la graella.
  const duo = el('div', { class: 'duo' });
  const rank = card(t('juvenils.titol'), juvenils.length, 'llima');
  juvenils.forEach((j, i) => rank.append(filaSegura(() => {
    const sel = el('select', { 'aria-label': t('juvenils.col_estat') }, ...ESTATS.map((e) => { const o = el('option', { value: e, text: t('juvenils.estat_' + e) }); if (e === j.estat) o.setAttribute('selected', ''); return o; }));
    sel.addEventListener('change', () => api('/api/juvenils', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jugador_id: j.jugador_id, estat: sel.value }) }).catch(() => {}));
    const fila = el('div', { class: 'rank-fila' },
      el('div', { class: 'nivell' + (i === 0 ? ' top' : ''), text: j.nivell != null ? decimal(j.nivell) : '—' }),
      el('div', {}, el('div', { class: 'fila-nom', text: j.nom }),
        el('div', { class: 'fila-meta' },
          el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` }),
          el('span', { class: 'skills', text: hab(j) }))),
      el('div', { class: 'rank-dreta' },
        el('b', { text: j.dies_restants_promocio != null ? tp('juvenils.dies', j.dies_restants_promocio, { dies: j.dies_restants_promocio }) : '—' }),
        el('span', { text: j.aterratge?.data || (typeof j.aterratge === 'string' ? j.aterratge : '—') }), ' ', sel));
    const perque = pipeTxt(j); if (perque) fila.setAttribute('title', perque);   // detall per fila
    return fila;
  }, 1)));
  duo.append(rank);
  if (d.onze_juvenil) onzeJuvenil(duo, d.onze_juvenil);
  main.append(duo);

  // Avaluador d'ofertes noves (punt 4d)
  const cOf = card(t('juvenils.oferta_titol'));
  const form = el('form', { class: 'card-cos' });
  const edatInp = el('input', { type: 'number', size: '3', 'aria-label': t('juvenils.edat') });   // NO ombrejar el formatador edat()   // crea
  const pot = el('input', { type: 'number', size: '3', 'aria-label': t('juvenils.col_potencial') });   // crea
  const comp = el('input', { type: 'number', size: '3', 'aria-label': t('juvenils.compost') });   // crea
  const res = el('span', {});
  const b = el('button', { type: 'button', class: 'b-prim', text: t('juvenils.avalua') });
  b.addEventListener('click', async () => {
    const r = await opc(api('/api/oferta?' + new URLSearchParams({ edat: edatInp.value, potencial: pot.value, compost: comp.value })));
    res.textContent = r && r.veredicte ? (r.veredicte.accepta ? t('juvenils.crida_accepta', { motiu: t('motiu.' + r.veredicte.motiu) }) : t('juvenils.crida_rebutja', { motiu: t('motiu.' + r.veredicte.motiu) })) : '—';
  });
  form.append(el('div', { class: 'form-graella' },
    el('label', {}, t('juvenils.edat'), edatInp), el('label', {}, t('juvenils.col_potencial'), pot),
    el('label', {}, t('juvenils.compost'), comp)), b, ' ', res);
  cOf.append(form); main.append(cOf);
}

// Rellotge de crida (reinici setmanal global): disponible → acció «he fet la crida»
// (data + resultat); gastada o tancada → línia informativa amb la pròxima.
function cridaSetmanal(main, c) {
  if (!c.disponible) { main.append(el('p', { class: 'nota-peu', text: t('juvenils.crida_proxima', { proxima: c.proxima }) })); return; }
  const fer = (resultat) => api('/api/crides', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resultat }) }).then(() => location.reload());
  const acc = el('button', { type: 'button', class: 'b-xic', text: t('juvenils.crida_feta_accepta') });
  acc.addEventListener('click', () => fer('acceptat'));
  const reb = el('button', { type: 'button', class: 'b-xic neutre', text: t('juvenils.crida_feta_rebutja') });
  reb.addEventListener('click', () => fer('rebutjat'));
  main.append(el('div', { class: 'mov-fila' }, el('span', { class: 'mov-punt' }),
    el('span', { class: 'mov-text', text: t('juvenils.crida_disponible', { caduca: c.caducitat }) }), acc, reb));
}

// Onze juvenil proposat (2b): descobriment probabilístic + fre de suplents.
function onzeJuvenil(main, o) {
  const sec = card(t('juvenils.onze_titol'), o.en_camp);
  const info = el('div', { class: 'card-cos' });
  if (o.no_viable) info.append(el('p', { text: t('juvenils.onze_no_viable', { en_camp: o.en_camp, minim: o.minim }) }));
  // 2c: capçalera derivada del repartiment REAL; si no hi ha descobriment, en positiu.
  info.append(el('p', { text: o.descobriments > 0
    ? t('juvenils.onze_repartiment', { descobriments: o.descobriments, entrenen: o.entrenen, estructura: o.estructura })
    : tp('juvenils.onze_tot_entrena', o.entrenen) }));
  if (o.descobriments > 0) info.append(el('p', { class: 'nota-peu', text: t('juvenils.onze_mecanica', { minuts: o.revelacio_minuts }) }));
  if (o.sense_marge) info.append(el('p', { class: 'nota-peu', text: t('juvenils.onze_sense_marge') }));
  sec.append(info);
  // El descobriment porta el seu propi text (amb plural i dies); el MIXT els encadena:
  // «entrena X · descobriment de Y» — les dues coses passen a la mateixa plaça.
  const txtDescobriment = (s, hab) => tp('juvenils.onze_m_descobriment', (hab || '').split(' i ').length, { principal: hab, dies: s.dies_restants_promocio ?? '?' });
  const motiuSlot = (s) => s.motiu === 'descobriment'
    ? txtDescobriment(s, s.habilitat)
    : s.motiu === 'mixt'
      ? `${t('juvenils.onze_m_entrena', { principal: s.habilitat_entrena })} · ${txtDescobriment(s, s.habilitat_descobrix)}`
      : s.motiu === 'entrena'
        ? t('juvenils.onze_m_entrena', { principal: s.habilitat })
        : t('juvenils.onze_m_' + s.motiu);
  // El mateix camp que la sènior: xip acolorit per posició, motiu al títol (detall per fila).
  sec.append(campDeJoc(o.onze, {
    anell: anellJuvenil,
    nom: (s) => cognom(s.nom),
    titol: (s) => `${s.nom} · ${motiuSlot(s)}`,
  }), campLlegenda('juvenil'));
  if (o.banqueta.length) {
    sec.append(el('div', { class: 'graella-fila' },
      el('b', { text: t('juvenils.onze_banqueta') }),
      el('span', { text: o.banqueta.map((s) => s.nom).join(', ') })));
  }
  main.append(sec);
}

// L'ENTRENAMENT JUVENIL ÉS PRESCRIT, no triable: ix del pipeline sènior (quines habilitats
// alimenten els llocs que entrenen). Ací només es confirma què hi ha posat a HT, que és el que
// pot no coincidir — i si no coincidix, ALR_ENTRENAMENT_JUVENIL ho diu.
function formEntrenamentJuvenil(main, d) {
  const ej = d.entrenament_juvenil || {};
  const pr = d.pipeline;
  const sec = card(t('juvenils.entrenament_titol'), null, 'llima');
  const sc = el('div', { class: 'card-cos' });
  sc.append(el('p', {}, el('b', { text: t('juvenils.entrenament_prescrit_et') }), ' ',
    el('span', { text: pr ? t('juvenils.entrenament_prescrit', { principal: t('habilitat.' + pr.principal), secundari: t('habilitat.' + pr.secundari) }) : t('juvenils.entrenament_sense_pipeline') })));
  if (ej.principal) {
    const quadra = pr && ej.principal === pr.principal && (ej.secundari || null) === (pr.secundari || null);
    sc.append(el('p', { class: quadra ? 'nota-peu' : 'desquadre' },
      t('juvenils.entrenament_actual', { principal: t('habilitat.' + ej.principal),
        secundari: ej.secundari ? t('habilitat.' + ej.secundari) : '—' })));
  }
  sec.append(sc);
  // CONFIRMAR el que hi ha posat a HT (no triar-lo): el prescrit ve precarregat, així que
  // desar sense tocar res és dir «ho tinc com toca».
  const opcs = (sel) => HABS_ENTREN.map((h) => { const o = el('option', { value: h, text: t('habilitat.' + h) }); if (sel === h) o.setAttribute('selected', ''); return o; });
  const principal = el('select', { 'aria-label': t('juvenils.entrenament_principal') }, ...opcs(ej.principal ?? pr?.principal ?? null));   // precarrega
  const secundari = el('select', { 'aria-label': t('juvenils.entrenament_secundari') }, el('option', { value: '', text: '—' }), ...opcs(ej.secundari ?? pr?.secundari ?? null));
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('juvenils.entrenament_desa') });
  const f = el('form', { class: 'card-cos' },
    el('p', { class: 'nota-peu', text: t('juvenils.entrenament_confirma') }),
    el('div', { class: 'form-graella' },
      el('label', {}, t('juvenils.entrenament_principal'), principal),
      el('label', {}, t('juvenils.entrenament_secundari'), secundari)), b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/pla', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entrenament_juvenil: { principal: principal.value, secundari: secundari.value || null } }) });
    location.reload();
  });
  sec.append(f);
  main.append(sec);
}

// ── 6. Mercat ──
// BUCLE D'ESTOC (PAS 8): què comprar i si l'obra d'estadi guanya, amb la seua eficiència.
// La vista no calcula res: interpola el que l'avaluador ja ha decidit.
function bucleEstoc(main, e) {
  const c = card(t('estoc.titol'), e.opcions.filter((o) => o.tipus === 'jugador').length);
  const cos = el('div', { class: 'card-cos' });
  if (e.caixa == null) {
    cos.append(el('p', { class: 'nota-peu', text: t('estoc.sense_caixa') }));
  } else {
    cos.append(el('p', { class: 'nota-peu', text: t('estoc.capçal', {
      // El sostenible es dona SETMANAL: és el que es compara amb el sou d'un jugador.
      disponible: diners(e.caixa),
      sostenible: e.sou_sostenible_setmanal == null ? '—' : diners(Math.round(e.sou_sostenible_setmanal)) }) }));
  }
  // L'ESTADI ES DIU EN PROSA, NO EN UNA FILA. No es puntua (té prioritat absoluta) i no té
  // lloc, nivell ni mancança: a la taula era una fila de quatre guions amb una capçalera que
  // s'esclafava en tres línies. I una obra ja COMENÇADA no és cap decisió pendent.
  const obra = e.opcions.find((o) => o.tipus === 'estadi');
  if (obra?.obra_en_curs) {
    cos.append(el('p', { class: 'obra-curs' },
      el('span', { class: 'pill ok', text: t('estoc.obra_en_curs') }), ' ',
      el('span', { text: t('estoc.obra_des_de', { data: obra.obra_inici }) })));
  } else if (e.recomanada) {
    cos.append(el('p', {}, el('b', { text: t('estoc.recomanada') }), ' ',
      el('span', { text: e.recomanada.tipus === 'estadi'
        // `delta_manteniment` és el que l'obra AFIG cada setmana, no el que allibera.
        ? t('estoc.opcio_estadi', ambXifres({ cost: e.recomanada.cost,
            manteniment: e.recomanada.delta_manteniment }, ['cost', 'manteniment']))
        : tp('estoc.opcio_jugador', e.recomanada.mancanca,
            ambXifres({ lloc: e.recomanada.lloc, habilitat: t('habilitat.' + e.recomanada.habilitat),
              // El nivell es diu pel seu NOM de Hattrick. Les claus van indexades pel nivell de
              // Tonico: fer «n + 4» ací seria aritmètica de domini a la vista (invariant 12).
              nivell: t('nivell_ht.' + e.recomanada.nivell_objectiu),
              mancanca: e.recomanada.mancanca, cost: e.recomanada.cost }, ['cost'])) })));
  } else {
    cos.append(el('p', { class: 'nota-peu', text: t('estoc.cap_opcio') }));
  }
  // La taula és NOMÉS de llocs: tres columnes que sempre tenen valor. Les de «cost» i
  // «rendiment» eren sempre buides (sense candidat de mercat no hi ha preu) i una taula de
  // guions no és informació. El que val és l'ORDRE de les mancances i el nivell que demanen.
  const g = graellaAmbFiles('c-estoc',
    ['col_opcio', 'col_nivell', 'col_mancanca', 'col_guany'].map((k) => t('estoc.' + k)),
    e.opcions.filter((o) => o.tipus === 'jugador').map((o) => el('div', { class: 'graella-fila-d c-estoc' },
      el('span', { text: t('estoc.lloc', { lloc: o.lloc }) }),
      el('span', { text: o.nivell_objectiu ? t('nivell_ht.' + o.nivell_objectiu) : '—' }),
      el('span', { text: o.mancanca == null ? '—' : decimal(o.mancanca) }),
      el('span', { class: 'graella-val', text: o.guany == null ? '—' : decimal(o.guany) }))));
  if (g) cos.append(g);
  if (!e.estadi_declarat) cos.append(el('p', { class: 'nota-peu', text: t('estoc.estadi_falta') }));
  c.append(cos); main.append(c);
}

export async function mercat(main) {
  capcalera(main, 6, 'mercat');
  const { filtres, estoc } = await api('/api/mercat');
  if (estoc) bucleEstoc(main, estoc);
  const pres = (v) => (v > 0 ? diners(v) : t('mercat.sense_pressupost'));
  // ELS FILTRES SÓN INSTRUCCIONS, no una llista. Miquel se'ls ha de copiar al cercador de HT,
  // així que cada camp va etiquetat i separat en compte d'amagat dins d'una frase.
  const utils = filtres.filter((f) => f.falten > 0);
  const cf = card(t('mercat.filtres_titol'), utils.length, 'llima');
  const cfc = el('div', { class: 'card-cos' });
  if (utils.length) {
    for (const f of utils) {
      const camps = el('div', { class: 'filtre-camps' });
      const camp = (clau, valor) => { if (valor == null || valor === '') return;
        camps.append(el('div', { class: 'filtre-camp' },
          el('span', { class: 'filtre-et', text: t('mercat.camp_' + clau) }),
          el('b', { text: String(valor) }))); };
      camp('posicions', (f.posicions || []).join(' / '));
      if (f.rol === 'core') {
        // L'edat és un RANG: el cercador de HT demana els dos extrems, no un sostre.
        camp('edat', f.edat_min == null || f.edat_max == null ? (f.edat_max ?? f.edat_min)
          : t('mercat.rang', { min: f.edat_min, max: f.edat_max }));
        camp('creativitat_min', f.creativitat_min);
      } else if (f.habilitat) {
        camp('habilitat', `${t('habilitat.' + f.habilitat.camp)} ${f.habilitat.op} ${f.habilitat.valor}`);
      }
      camp('pressupost', pres(f.pressupost));
      cfc.append(el('div', { class: 'filtre' },
        el('div', { class: 'filtre-cap' },
          el('b', { text: t('mercat.filtre_rol_' + f.rol) }),
          el('span', { class: 'filtre-falten', text: tp('mercat.filtre_falten', f.falten, { n: f.falten }) })),
        camps,
        ...(f.previsio_venda ? [el('p', { class: 'nota-peu', text: t('mercat.filtre_previsio', { noms: f.previsio_venda.join(', ') }) })] : [])));
    }
  } else cfc.append(el('p', { class: 'nota-peu', text: t('mercat.sense_filtres') }));
  cf.append(cfc); main.append(cf);
  // FORA la targeta de «comparables apuntats». Amb l'estimació de preu retirada (v3.1) cap
  // fórmula llig `preus_observats`: era una taula que es demanava omplir i que no decidia res.
  await fitxesVenda(main);
}

// ── Fitxes de venda (Àrea E) ──
const ESTATS_VENDA = ['pendent', 'llistat', 'venut', 'desert', 'despatxat'];
// La subhasta deserta ja NO es pregunta: es dedueix (si estava transferible, ja no ho està i
// seguix a la plantilla, ningú l'ha comprat). El que queda és la marca de DESPATXABLE, i viu a
// la fitxa, que és on es decidix qui es queda.
async function fitxesVenda(main) {
  const { jugadors, cobertura: cobMin } = await api('/api/vendes');
  const sec = card(t('vendes.titol'), jugadors.length);
  if (!jugadors.length) { sec.append(cos(el('p', { text: t('vendes.buit') }))); main.append(sec); return; }
  const nota = notes();   // qualificadors repetits (estimació…) → asterisc + llegenda única
  // UNA SOLA FONT: la retenció per cobertura, amb el mínim derivat visible.
  if (cobMin && (cobMin.retinguts_camp || cobMin.retinguts_porters)) {
    const nRet = (cobMin.retinguts_camp || 0) + (cobMin.retinguts_porters || 0);
    sec.append(el('div', { class: 'card-cos' }, el('p', { class: 'nota-peu', text: tp('vendes.retencio_resum', nRet, {
      n: nRet, camp: cobMin.retinguts_camp || 0, porters: cobMin.retinguts_porters || 0, minim: cobMin.total }) })));
  }
  // Sense fitxes, no es pinta la taula (ni la capçalera).
  if (jugadors.length) sec.append(el('div', { class: 'graella-cap c-venda' },
    ...['col_jugador', 'col_situacio', 'col_data', 'col_tancament', 'col_estat'].map((k) => el('span', { text: t('vendes.' + k) }))));
  for (const j of jugadors) sec.append(filaSegura(() => {
    // Cap camp de PREU: ni objectiu d'eixida ni import venut. El preu no entra a cap fórmula
    // (v3.1) i preguntar-lo era l'última porta oberta. La fitxa es queda amb el que mou el
    // rellotge de la subhasta: la data de llistat i l'estat.
    const dataL = el('input', { type: 'date', 'aria-label': t('vendes.col_data') }); if (j.data_llistada) dataL.value = j.data_llistada;
    const estat = el('select', { 'aria-label': t('vendes.col_estat') }, ...ESTATS_VENDA.map((e) => { const o = el('option', { value: e, text: t('vendes.estat_' + e) }); if (e === j.estat) o.setAttribute('selected', ''); return o; }));
    const desar = () => api('/api/vendes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      jugador_id: j.jugador_id, data_llistada: dataL.value || null, estat: estat.value }) }).catch(() => {});
    for (const c of [dataL, estat]) c.addEventListener('change', desar);
    const propCell = el('div', {});
    // Estat de liquidació (mateixa font que l'alerta agregada): llistat / retingut per
    // cobertura (amb el càlcul) / lesionat (llistable en recuperar) / llistable ara.
    // Fora les marques de buffer: amb la liquidació, «ven-lo l'últim» ja no existix.
    propCell.append(el('div', { class: 'cobertura', text: j.estat_liquidacio === 'retingut'
      ? t('vendes.retingut_cobertura', { n: cobMin?.camp_minim ?? '?' })
      : t('vendes.estat_liq_' + (j.estat_liquidacio || 'llistable')) }));
    // DESPATXABLE viu a la PLANTILLA, que és on es decidix qui es queda: ací és una fitxa de
    // VENDA i el jugador ja ha passat pel mercat. El que sí que és del mercat és que la
    // subhasta ha quedat deserta.
    if (j.desert) propCell.append(el('div', { class: 'nota-peu', text: t('vendes.desert') }));
    return el('div', { class: 'graella-fila-d c-venda' },
      el('div', { class: 'fila-qui' },
        el('div', { class: posCls(j.posicio), text: j.posicio || '—' }),
        el('div', {}, el('div', { class: 'fila-nom', text: j.nom }),
          el('div', { class: 'fila-meta' }, el('span', { text: j.especialitat || '—' }),
            ...(j.lesionat ? [el('span', { class: 'pill perill', text: t('comu.lesionat_durada', { n: duradaLesio(j.lesio) ?? '?' }) })] : [])))),
      propCell, dataL,
      el('span', { text: j.tancament_previst || '—' }),
      el('div', { class: 'cel-controls' }, estat));
  }, 1));
  for (const ll of nota.llegendes()) sec.append(cos(el('p', { class: 'nota-peu', text: ll })));
  main.append(sec);
}

// ── 7. Economia ──
// Formata en «diners» les claus monetàries d'un objecte de paràmetres (la resta
// intacta): així cap plantilla econòmica interpola un número cru.
// PATRÓ: sense files, NO es pinta la taula (ni la capçalera). Qui vulga una graella passa
// per ací i no pot oblidar-se'n.
const graellaAmbFiles = (classe, capçaleres, files) => {
  if (!files || !files.length) return null;
  const g = el('div', { class: 'graella' });
  g.append(el('div', { class: 'graella-cap ' + classe }, ...capçaleres.map((x) => el('span', { text: x }))));
  for (const f of files) g.append(f);
  return g;
};

const eur = (obj, ...keys) => ambXifres(obj, keys);   // àlies curt: els noms de clau són els diners
export async function economia(main) {
  capcalera(main, 7, 'economia');
  const { economia: e } = await api('/api/finances');
  // Les xifres del PAS 3: ESTOC (la caixa) i FLUX (i el sou que sosté). Ja no hi ha targeta
  // de «disponible per a comprar»: sense reserva d'estoc era la caixa dita dues vegades.
  // Cap aritmètica ací: tot ve calculat de l'avaluador (invariant 12, render pur).
  // La UNITAT ix de l'avaluador (`e.unitats`), no d'un text fix a l'etiqueta: així una
  // etiqueta no pot mentir sobre la periodicitat de la xifra que acompanya.
  const unitat = (camp) => {
    const u = e.unitats?.[camp];
    if (u === 'periode') return tp('unitat.periode', e.setmanes_periode, { n: e.setmanes_periode });
    if (u === 'setmana') return t('unitat.setmana');
    return null;                                   // estoc: un saldo no té periodicitat
  };
  const kpis = el('div', { class: 'eco-kpis' });
  kpis.append(el('div', { class: 'eco-card fosc' },
    el('div', { class: 'eco-et', text: t('economia.caixa_et') }),
    el('div', { class: 'eco-xifra', text: e.caixa == null ? '—' : diners(e.caixa) }),
    el('div', { class: 'eco-nota', text: e.caixa == null ? t('economia.caixa_falta') : (e.caixa_data || '') })));
  // INGRESSOS: la mitjana setmanal de taquilla + patrocinadors, que és el que entra de veres.
  if (e.mitjana_setmanal != null) {
    kpis.append(el('div', { class: 'eco-card' },
      el('div', { class: 'eco-et', text: t('economia.ingressos_et') }),
      el('div', { class: 'eco-xifra', text: diners(Math.round(e.mitjana_setmanal)) }),
      el('div', { class: 'eco-unitat', text: unitat('mitjana_setmanal') }),
      el('div', { class: 'eco-nota', text: tp('economia.ingressos_nota', e.setmanes_declarades, { n: e.setmanes_declarades }) })));
  }
  // FORA la píndola de FLUX. Marejava: era ingressos menys els sous que JA es paguen, i al
  // costat dels ingressos es llegia com si fora el que entra de net. El que decidix és el sou
  // sostenible (que ja ix del flux) i el que hi ha a caixa; el flux pel seu compte no es mira.
  if (e.sou_sostenible_setmanal != null) {
    kpis.append(el('div', { class: 'eco-card' },
      el('div', { class: 'eco-et', text: t('economia.sou_sostenible_et') }),
      el('div', { class: 'eco-xifra', text: diners(Math.round(e.sou_sostenible_setmanal)) }),
      el('div', { class: 'eco-unitat', text: unitat('sou_sostenible_setmanal') }),
      el('div', { class: 'eco-nota', text: t('economia.sou_sostenible_nota') })));
  }
  main.append(kpis);
  if (e.flux == null) main.append(el('p', { class: 'nota-peu', text: t('economia.sense_ingressos') }));
  if (e.dades_velles) main.append(el('p', { class: 'nota-peu', text: t('economia.dades_velles', { data: e.caixa_data }) }));

  // UNA targeta de treball: DECLARAR. No hi ha comptabilitat de moviments — amb la caixa
  // declarada i el flux eixint de taquilla+patrocini, apuntar moviment a moviment no alimentava
  // cap decisió. La segona targeta és l'estimació d'estadi, que és d'una altra cadència (un colp
  // per temporada) i per això no es barreja amb la declaració del període.
  const cFin = card(t('economia.finances_titol'));
  formFinances(cFin, e);
  main.append(cFin);

  const cEst = card(t('economia.estadi_titol'));
  formEstadi(cEst, e);
  main.append(cEst);
  if (e.estadi_caduc) main.append(el('p', { class: 'nota-peu', text: t('economia.estadi_caduc_nota', { data: e.estadi_data }) }));
}

// LA DECLARACIÓ DEL PERÍODE. Quatre coses i prou (invariant 17: tot el que Tonico consumix i
// no pot derivar té finestra; i res que no consumisca en té). Taquilla i patrocinadors de les
// DOS setmanes —així el període és la suma i no hi ha cap factor 2 al camí—, els diners
// disponibles i el manteniment d'estadi. La nòmina ve del CSV, el personal de les seues fitxes
// i el planter es deriva: res d'això es pregunta.
function formFinances(main, e) {
  const f = el('form', { class: 'card-cos' });
  const camp = (clau, val, type = 'number') => {
    const i = el('input', { type, 'aria-label': t('economia.' + clau) });
    if (val != null) i.value = val;
    return el('label', { class: 'decl-camp' }, el('span', { class: 'decl-et', text: t('economia.' + clau) }), i);
  };
  // L'històric ve del més recent al més antic: [0] és esta setmana i [1] la passada.
  const s2 = e.setmanes?.[0] || {}, s1 = e.setmanes?.[1] || {};
  const tq1 = camp('taquilla', s1.taquilla);
  const pt1 = camp('patrocini', s1.patrocini);
  const tq2 = camp('taquilla', s2.taquilla);
  const pt2 = camp('patrocini', s2.patrocini);
  const caixa = camp('caixa_real', e.caixa);
  const estadi = camp('despesa_estadi', e.manteniment_estadi || null);
  // Una columna per SETMANA, amb la seua capçalera: la de la passada i la d'esta. Les dues
  // porten els mateixos dos camps en el mateix orde, així la lectura és horitzontal i es veu
  // d'un colp d'ull què falta. El període és la suma de les dues.
  const bloc = (clau, ...camps) => el('div', { class: 'decl-bloc' },
    el('h4', { class: 'decl-titol', text: t('economia.' + clau) }), ...camps);
  f.append(el('div', { class: 'decl-setmanes' },
    bloc('setmana_passada', d1, tq1, pt1),
    bloc('setmana_esta', d2, tq2, pt2)));
  // El club: estes dues no van per setmana. La caixa és d'ara i el manteniment és constant.
  f.append(el('div', { class: 'decl-setmanes' },
    el('div', { class: 'decl-bloc ample' },
      el('h4', { class: 'decl-titol', text: t('economia.del_club') }),
      el('div', { class: 'decl-camps' }, caixa, estadi))));
  f.append(el('button', { type: 'submit', class: 'b-prim', text: t('economia.finances_desa') }));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (l) => { const x = l.querySelector('input').value; return x === '' ? null : x; };
    // Cada setmana va amb la SEUA data: d'ahí el servidor deriva temporada i setmana pel
    // calendari, i redeclarar-ne una la sobreescriu en compte de duplicar-la.
    await api('/api/finances', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      caixa: v(caixa), despesa_estadi: v(estadi),
      setmanes: [{ data: v(d1), taquilla: v(tq1), patrocini: v(pt1) },
                 { data: v(d2), taquilla: v(tq2), patrocini: v(pt2) }].filter((x) => x.data) }) });
    location.reload();
  });
  main.append(f);
}

// L'ESTIMACIÓ D'ESTADI: els números que dona la calculadora externa, un colp per temporada.
// Cadència distinta de la declaració del període, i caduquen (PAS 8) — per això va a banda.
function formEstadi(main, e) {
  const f = el('form', { class: 'card-cos' });
  const camp = (clau, val, type = 'number') => {
    const i = el('input', { type, 'aria-label': t('economia.' + clau) });
    if (val != null) i.value = val;
    return el('label', { class: 'decl-camp' }, el('span', { class: 'decl-et', text: t('economia.' + clau) }), i);
  };
  const obra = camp('estadi_cost_obra', e.estadi_cost_obra);
  const mant = camp('estadi_manteniment', e.estadi_manteniment);
  const data = camp('estadi_data', e.estadi_data, 'date');
  // L'OBRA EN CURS: mentre esta data hi siga, l'estadi no es proposa (ja s'ha decidit). Es
  // buida quan l'obra acaba i es torna a la calculadora amb el manteniment nou.
  const inici = camp('estadi_obra_inici', e.estadi_obra_inici, 'date');
  f.append(el('div', { class: 'decl-setmanes' },
    el('div', { class: 'decl-bloc ample' },
      el('h4', { class: 'decl-titol', text: t('economia.estadi_calculadora') }),
      el('div', { class: 'decl-camps' }, obra, mant, data, inici))));
  f.append(el('button', { type: 'submit', class: 'b-prim', text: t('economia.estadi_desa') }));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (l) => { const x = l.querySelector('input').value; return x === '' ? null : x; };
    await api('/api/finances', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      estadi_cost_obra: v(obra), estadi_manteniment: v(mant), estadi_data: v(data),
      estadi_obra_inici: v(inici) }) });
    location.reload();
  });
  main.append(f);
}



// ── 8. Pla mestre ──
export async function configuracio(main) {
  capcalera(main, 8, 'configuracio');
  const { config, falten } = await api('/api/config');

  // UN LLAPIS, no un segon panell. El formulari repetia les mateixes sis dades just davall de
  // la llista: dos vegades el mateix a la pantalla. Ara s'obri des de la capçalera.
  const llapis = el('button', { type: 'button', class: 'b-icona', title: t('configuracio.edita'),
    'aria-label': t('configuracio.edita'), text: '✎' });
  const c = card(t('configuracio.titol'), null, null, llapis);
  const cos = el('div', { class: 'card-cos' });
  const fila = (clau, valor) => el('div', { class: 'graella-fila' },
    el('b', { text: t('configuracio.' + clau) }),
    el('span', { class: 'graella-val', text: valor || '—' }));
  cos.append(
    fila('estrategia', config ? t('estrategia.' + config.estrategia) : ''),
    fila('pais', config?.pais),
    fila('divisio', config?.divisio),
    fila('sistema_juvenil', config ? t('sistema_juvenil.' + config.sistema_juvenil) : ''),
    fila('n_cercapromeses', config?.n_cercapromeses != null ? String(config.n_cercapromeses) : ''),
    fila('partits_setmana', config?.partits_setmana != null ? String(config.partits_setmana) : ''));
  c.append(cos);
  main.append(c);
  if (falten && falten.length) {
    main.append(el('p', { class: 'nota-peu', text: t('configuracio.falten', { camps: falten.map((f) => t('falten.config_' + f)).join(' · ') }) }));
  }

  // El formulari va dins de la mateixa targeta i comença amagat: el llapis el mostra.
  const editor = el('div', { class: 'card-editor amagat' });
  formConfig(editor, config);
  c.append(editor);
  llapis.addEventListener('click', () => {
    const obert = editor.classList.toggle('amagat');
    llapis.classList.toggle('actiu', !obert);
    if (!obert) editor.querySelector('input,select')?.focus();
  });

  // Punt 3a: activar l'acadèmia després si no en tens.
  const eq = await opc(api('/api/equips'));
  if (eq && eq.equips && !eq.equips.some((e) => e.tipus === 'juvenil')) formActivaAcademia(main);
}

// Formulari del PAS 0. Cap valor per defecte inventat: el buit es queda buit i es demana.
function formConfig(main, config) {
  // `etiqueta` permet opcions que no porten clau i18n pròpia (un número és el seu propi text).
  const sel = (clau, opcions, valor, etiqueta = null) => el('select', { 'aria-label': t('configuracio.' + clau) },
    el('option', { value: '', text: '—' }),
    ...opcions.map((o) => {
      const op = el('option', { value: o, text: etiqueta ? etiqueta(o) : t(clau === 'partits_setmana' ? 'configuracio.partits_' + o : `${clau === 'estrategia' ? 'estrategia' : 'sistema_juvenil'}.${o}`) });
      if (String(valor) === String(o)) op.setAttribute('selected', '');
      return op;
    }));
  const estrategia = sel('estrategia', ['competitiva', 'cycle'], config?.estrategia);
  const sistema = sel('sistema_juvenil', ['academia', 'cercapromeses', 'cap'], config?.sistema_juvenil);
  const partits = sel('partits_setmana', ['1', '2'], config?.partits_setmana);
  // El cercapromeses SEMPRE hi és i n'hi pot haver 1..3 en QUALSEVOL mode: el mode diu si hi
  // ha acadèmia i si es crida, no quants n'hi ha. D'ací ix `despesa_planter` (PAS 3).
  const cerca = sel('n_cercapromeses', ['1', '2', '3'], config?.n_cercapromeses, (o) => o);
  const pais = el('input', { type: 'text', value: config?.pais || '', 'aria-label': t('configuracio.pais') });
  const divisio = el('input', { type: 'text', value: config?.divisio || '', 'aria-label': t('configuracio.divisio') });
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('configuracio.desa') });
  const f = el('form', { class: 'card-cos' }, el('div', { class: 'graella' },
    el('label', {}, t('configuracio.estrategia'), estrategia),
    el('label', {}, t('configuracio.pais'), pais),
    el('label', {}, t('configuracio.divisio'), divisio),
    el('label', {}, t('configuracio.sistema_juvenil'), sistema),
    el('label', {}, t('configuracio.n_cercapromeses'), cerca),
    el('label', {}, t('configuracio.partits_setmana'), partits)), b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      estrategia: estrategia.value || undefined, pais: pais.value.trim() || undefined,
      divisio: divisio.value.trim() || undefined, sistema_juvenil: sistema.value || undefined,
      n_cercapromeses: cerca.value ? Number(cerca.value) : undefined,
      partits_setmana: partits.value ? Number(partits.value) : undefined }) });
    location.reload();
  });
  main.append(f);
}

function formActivaAcademia(main) {
  const nom = el('input', { type: 'text', 'aria-label': t('configuracio.academia_nom') });   // crea
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('configuracio.academia_desa') });
  const c = card(t('configuracio.activa_academia'));
  const f = el('form', { class: 'card-cos' }, el('label', {}, t('configuracio.academia_nom'), nom), b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!nom.value.trim()) return;
    await api('/api/equips', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ juvenil: { nom: nom.value.trim() } }) });
    location.reload();
  });
  c.append(f); main.append(c);
}


// ── 9. Personal ──
const ESPECIALISTES = ['assistents', 'metge', 'psicoleg'];
// PAS 11: el pla que el FLUX sosté, per prioritat. La vista només interpola.
// EL PLA DE PERSONAL: quatre places, i cada una és una PÍNDOLA amb el que hi ha declarat, el
// que li queda de contracte i el llapis per a editar-ho. Abans hi havia dues llistes de les
// mateixes quatre coses —el pla ací i un formulari sempre obert davall— i el nivell que es
// llegia era el del PLA, no el declarat: es llegia com «tens personal de nivell 1» quan el que
// tens és de nivell 2 i el que el flux sosté és 1.
function placa(x, dies_avis) {
  const nivD = x.nivell_declarat ?? null;
  const lliure = x.membre_id == null;
  const pill = el('div', { class: lliure ? 'placa buida' : 'placa' });
  const llapis = lliure ? null : el('button', { type: 'button', class: 'b-icona', text: '✎',
    title: t('personal.edita'), 'aria-label': t('personal.edita') });
  pill.append(el('div', { class: 'placa-cap' },
    el('div', { class: 'placa-tipus', text: t('element.' + x.tipus) }), ...(llapis ? [llapis] : [])));
  // El NIVELL amb el seu número al costat: «adequat» tot sol no diu on cau dins de l'escala.
  pill.append(el('div', { class: 'placa-niv', text: nivD
    ? t('personal.nivell_amb_num', { paraula: t('nivell_ht.' + nivD), n: nivD })
    : t('personal.placa_lliure') }));
  if (x.sou_declarat != null) pill.append(el('div', { class: 'placa-sou', text: t('flux.sou_setmana', ambXifres({ sou: x.sou_declarat }, ['sou'])) }));
  // Els DIES que li queden de contracte, sense haver d'obrir res: és l'única finestra en què
  // el nivell es pot moure sense pagar l'acomiadament.
  if (!lliure) pill.append(el('div', { class: x.venciment ? 'placa-contracte venç' : 'placa-contracte',
    text: x.dies_contracte == null ? t('personal.contracte_sense_data')
      : tp('personal.contracte_dies', x.dies_contracte, { n: x.dies_contracte }) }));
  // ACCIÓ només quan n'hi ha una de possible: plaça lliure, o dins de la finestra de venciment.
  if (x.accio && x.accio !== 'res') {
    pill.append(el('div', { class: 'placa-accio', text: x.accio_nivell
      ? t('flux.accio_' + x.accio + '_n', { paraula: t('nivell_ht.' + x.accio_nivell), n: x.accio_nivell })
      : t('flux.accio_' + x.accio) }));
  } else if (!lliure) {
    pill.append(el('div', { class: 'placa-accio cap', text: tp('flux.accio_res', dies_avis ?? 0, { dies: dies_avis ?? '?' }) }));
  }
  if (llapis) {
    const ed = editorMembre(x);
    pill.append(ed);
    llapis.addEventListener('click', () => {
      const obert = ed.classList.toggle('amagat');
      llapis.classList.toggle('actiu', !obert);
    });
  }
  return pill;
}

// L'editor d'un membre: el que es demana és la DATA DE FI, no els dies que queden — els dies
// es DERIVEN d'ella. Un compte declarat es congela i el venciment no arriba mai.
function editorMembre(x) {
  const ed = el('div', { class: 'placa-editor amagat' });
  const num = (clau, val) => { const i = el('input', { type: 'number', 'aria-label': t('personal.' + clau) });
    if (val != null) i.value = val; return i; };
  const nivell = num('nivell', x.nivell_declarat);
  const sou = num('sou', x.sou_declarat);
  const fi = el('input', { type: 'date', 'aria-label': t('personal.data_fi_contracte') });
  if (x.data_fi_contracte) fi.value = x.data_fi_contracte;
  const desa = el('button', { type: 'submit', class: 'b-xic', text: t('personal.desa') });
  const esb = el('button', { type: 'button', class: 'b-xic neutre', text: t('personal.esborra') });
  esb.addEventListener('click', () => api('/api/personal', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.membre_id }) }).then(() => location.reload()));
  const f = el('form', { class: 'placa-camps' },
    el('label', { class: 'camp-xic' }, t('personal.nivell'), nivell),
    el('label', { class: 'camp-xic' }, t('personal.sou'), sou),
    el('label', { class: 'camp-xic' }, t('personal.data_fi_contracte'), fi),
    el('div', { class: 'placa-botons' }, desa, esb));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/personal', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: x.membre_id, rol: x.tipus === 'entrenador' ? 'entrenador' : 'especialista',
        tipus: x.tipus, nivell: nivell.value || null, sou: sou.value || null, data_fi_contracte: fi.value || null }) });
    location.reload();
  });
  ed.append(f);
  return ed;
}

function plaFlux(main, p) {
  const c = card(t('flux.titol'), p.pla.length);
  const cos = el('div', { class: 'card-cos' });
  if (p.falten && p.falten.length) {
    cos.append(el('p', { class: 'nota-peu', text: t('flux.sense_flux') }));
  } else {
    // D'ON IX EL PRESSUPOST, en una frase que es pot seguir: el repartible, la part que li toca
    // al personal, el que el pla en gasta i on va el que sobra. Abans deia «(0% del flux
    // repartible)» —`percent()` arrodonia 0,40 a zero— i «en queden 2 484 €» sense dir de què.
    cos.append(el('p', { class: 'nota-peu', text: t('flux.capçal', {
      repartible: diners(Math.round(p.flux_repartible_setmanal)),
      quota: percent(p.quota_pct),
      pressupost: diners(Math.round(p.pressupost)),
      gastat: diners(Math.round(p.gastat)),
      restant: diners(Math.round(p.flux_restant)) }) }));
    const places = el('div', { class: 'places' });
    for (const x of p.pla) places.append(placa(x, p.dies_avis));
    // Els declarats que no caben en cap plaça del pla: existixen i cobren, així que es veuen.
    for (const x of p.membres_fora || []) places.append(placa({ ...x, accio: 'res', venciment: false }, p.dies_avis));
    cos.append(places);
    cos.append(el('p', { class: 'nota-peu', text: t('flux.avis_compromis') }));
  }
  c.append(cos); main.append(c);
}

export async function personal(main) {
  capcalera(main, 9, 'personal');
  const d = await api('/api/personal');
  if (d.error) { main.append(el('p', { text: t('personal.sense_config') })); return; }
  // El pla de places és l'ÚNICA llista de personal: cada píndola porta el seu llapis. Abans
  // el pla anava dalt i just davall hi havia una segona llista amb les mateixes quatre coses i
  // els camps sempre oberts — dos vegades el mateix, com passava a Configuració.
  if (d.pla_flux) plaFlux(main, d.pla_flux);

  const duo = el('div', { class: 'duo' });
  if (d.entrenament?.prescrit) formEntrenament(duo, d.entrenament);
  const secM = card(t('personal.afig_titol'));
  if (!d.membres.length) secM.append(cos(el('p', { class: 'nota-peu', text: t('personal.cap_membre') })));
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
    const selT = el('select', { 'aria-label': t('personal.entrenament_senior') },   // precarrega
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
  const nivell = el('input', { type: 'number', 'aria-label': t('personal.nivell') });   // crea
  const sou = el('input', { type: 'number', 'aria-label': t('personal.sou') });   // crea
  const fi = el('input', { type: 'date', 'aria-label': t('personal.data_fi_contracte') });   // crea
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('personal.afig') });
  graella.append(el('label', {}, t('personal.rol'), rol), el('label', {}, t('personal.tipus'), tipus),
    el('label', {}, t('personal.nivell'), nivell), el('label', {}, t('personal.sou'), sou),
    el('label', {}, t('personal.data_fi_contracte'), fi));
  f.append(graella, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/personal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      rol: rol.value, tipus: rol.value === 'especialista' ? tipus.value : rol.value,
      nivell: nivell.value || null, sou: sou.value || null, data_fi_contracte: fi.value || null }) });
    location.reload();
  });
  main.append(f);
}

// ── 10a. Pujada de dades ──
// Filtre del selector de fitxers. NO és validació: qui decidix si el fitxer val és el
// CONTINGUT (el servidor el parseja i falla amb un motiu llegible si no és l'export).
//
// Per què tan ample: al mòbil, un `accept` estret BLOQUEJA fitxers legítims. iOS tradueix
// l'extensió a UTI i, si el fitxer no ve etiquetat com a CSV (baixat des del navegador,
// vingut d'una app de núvol, sense extensió…), el mostra en gris i no es pot triar —
// exactament la sensació de «format no acceptat». A Android, molts proveïdors de fitxers
// declaren application/octet-stream i el filtre se'ls menja igual.
const ACCEPTA_CSV = '.csv,.txt,text/csv,text/plain,application/csv,application/vnd.ms-excel,application/octet-stream';

export function pujada(main, teAcademia = true) {
  capcalera(main, 10, 'comparador');
  const c = card(t('pujada.titol'), null, 'llima');
  const form = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const data = el('input', { type: 'date', name: 'data', required: 'true', 'aria-label': t('pujada.data') });
  data.value = new Date().toISOString().slice(0, 10);
  const senior = el('input', { type: 'file', name: 'senior', accept: ACCEPTA_CSV, 'aria-label': t('pujada.fitxer_senior') });
  const estat = el('p', { role: 'status' });
  graella.append(el('label', {}, t('pujada.data'), data), el('label', {}, t('pujada.fitxer_senior'), senior));
  if (teAcademia) {   // punt 3b: sense acadèmia, només CSV sènior
    const juvenil = el('input', { type: 'file', name: 'juvenil', accept: ACCEPTA_CSV, 'aria-label': t('pujada.fitxer_juvenil') });
    graella.append(el('label', {}, t('pujada.fitxer_juvenil'), juvenil));
  }
  form.append(el('p', { class: 'nota-peu', text: t('pujada.descripcio') }), graella,
    el('button', { type: 'submit', class: 'b-prim', text: t('pujada.enviar') }), estat);
  const envia = async (reemplaça) => {
    // Un fitxer buit dona un error de parseig confús: val més dir-ho abans.
    for (const inp of [senior, ...form.querySelectorAll('input[name="juvenil"]')]) {
      const f = inp.files && inp.files[0];
      if (f && f.size === 0) { estat.textContent = t('pujada.fitxer_buit', { nom: f.name }); return; }
    }
    estat.textContent = t('comu.carregant');
    const fd = new FormData(form);
    if (reemplaça) fd.set('reemplaça', 'true');
    const r = await fetch('/api/pujar', { method: 'POST', credentials: 'same-origin', body: fd });
    const cos = await r.json().catch(() => ({}));
    if (r.status === 409 && cos.error === 'instantania_existix') { if (confirm(t('pujada.confirma_reemplaça'))) return envia(true); estat.textContent = ''; return; }
    if (!r.ok) {
      // El servidor diu QUÈ ha passat; ací només es tria el text.
      const clau = cos.error === 'fitxer_buit' ? 'pujada.fitxer_buit'
        : cos.error === 'no_es_csv' ? 'pujada.no_es_csv' : null;
      estat.textContent = clau ? t(clau, { nom: cos.nom || '' }) : t('pujada.error', { detall: cos.detall || cos.error || '' });
      return;
    }
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
  cs.append(el('p', { class: 'nota-peu', text: tp('comparador.parella', d.dies, { b: d.b.data, a: d.a.data, dies: d.dies }) + (d.canvi_temporada ? ` (${t('comparador.canvi_temporada')})` : '') }));
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
