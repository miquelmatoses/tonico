// Tonico — render de cada secció de la pàgina única. Les APIs no canvien: cada
// funció fa el seu fetch i pinta dins del seu contenidor. Els errors s'aïllen
// per secció (una que falla no tomba la pàgina). HTML semàntic, reset mínim.
import { api, el, t, tp, filaSegura } from '/comu.js';
import { diners, milers, decimal, percent, signat, edat, notes, esLesionat, duradaLesio, ambXifres } from '/format.js';

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
// L'habilitat que mesura cada lloc: per a dir «un de creativitat 9» i no «un de mc 9».
const BUCKET_HAB = { porter: 'porteria', defensa: 'defensa', mc: 'creativitat', extrem: 'extrem', davanter: 'anotacio' };
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

// ── 2. Decisions ──
// Ja no hi ha MOVIMENTS ni PREGUNTES: eren la reconciliació del PAS 6 —«t'he canviat este de
// core a rotatiu, desfés-ho si vols»—, i sense categories desades no hi ha res a reconciliar.
// El grup d'un jugador es deriva cada volta de qui ocupa cada lloc, i això no cal desfer-ho.
//
// El que queda és el que de veres necessita la teua paraula: per què se n'ha anat un jugador
// que ja no ix a la instantània. Això no es pot derivar de res.
export async function decisions(main) {
  capcalera(main, 2, 'decisions');
  const pend = el('div', { class: 'card-pendent' });
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
  main.append(pend);
}

// ── 3. Alineació ──
export async function alineacio(main) {
  capcalera(main, 3, 'alineacio');
  const d = await api('/api/onzes');
  if (d.error) { main.append(el('p', { text: t('plantilla.buit') })); return; }

  // DOS ONZES i prou. L'11A és l'onze ideal tal qual; l'11B es COMPON, no es torna a
  // optimitzar: els llocs que entrenen són dels entrenables, la porteria del suplent (el porter
  // no dobla), el futur entrenador entra si no juga ja a l'11A, i la resta la cobrixen els
  // mateixos de l'11A, que no entrenen i poden doblar.
  const camp = (slots) => campDeJoc(slots, {
    // L'anell diu QUANT D'ENTRENAMENT hi ha en joc EN EIXE LLOC: ple al 100%, mig al 50%. Ix
    // del lloc i no del motiu, perquè els dos onzes entrenen igual — als mig centres i als
    // extrems s'entrena tant si hi juga el titular com si hi juga l'entrenable.
    anell: (s) => (!s.jugador ? 'buit' : !s.entrena ? '' : (s.pct ?? 100) === 100 ? 'ple' : 'mig'),
    nom: (s) => (s.jugador ? cognom(s.jugador.nom) : t('alineacio.buit')),
    titol: (s) => `${s.codi} · ${s.jugador ? s.jugador.nom : t('alineacio.buit')}`
      + (s.motiu ? ' · ' + t('alineacio.motiu_' + s.motiu) : ''),
  });
  const onzes = el('div', { class: 'onzes' });
  for (const [clau, slots, i] of [['onze_a', d.onze_a, 0], ['onze_b', d.onze_b, 1]]) {
    const entrenen = slots.filter((s) => s.entrena && s.jugador).length;
    onzes.append(el('div', { class: 'onze' },
      el('div', { class: 'onze-cap' + (i ? ' b' : '') },
        el('div', { class: 'onze-titol', text: t('alineacio.' + clau) }),
        el('div', { class: 'onze-sub', text: tp('alineacio.' + clau + '_sub', entrenen, { n: entrenen }) })),
      camp(slots), campLlegenda('senior')));
  }
  main.append(onzes);

  // Els llocs sense ningú es diuen: una plaça d'entrenament buida és entrenament perdut.
  const buits = d.onze_b.filter((s) => !s.jugador).length;
  if (buits) main.append(el('p', { class: 'desquadre', text: tp('alineacio.llocs_buits', buits, { n: buits }) }));
}

// ── 4. Plantilla sènior (amb override de categoria) ──
export async function plantilla(main) {
  capcalera(main, 4, 'plantilla');
  // Vocabulari del contracte v3 (invariant 14). No hi ha «entrenable» ni «farciment».
  // FORA LES CATEGORIES. Ja no hi ha «core», «rotatiu», «titular», «porter» ni «cos»: eren la
  // classificació del PAS 6, que decidia qui es quedava ABANS de saber qui ocupa cada lloc. Les
  // seccions ixen ara de l'assignació, i el que no hi entra se'n va a venda o a despatxar.
  const { instantania, jugadors, onze_titular: onze,
    entrenables, futur_entrenador: futurE, porter_suplent: porterS,
    venda: aVenda, despatxar: aDespatxar } = await api('/api/plantilla');
  if (!instantania) { main.append(el('p', { text: t('plantilla.buit') })); return; }
  main.append(el('p', { text: t('plantilla.instantania', { temporada: instantania.temporada, setmana: instantania.setmana_temporada, data: instantania.data }) }));
  const hab = (j) => `PO${j.porteria} DF${j.defensa} CR${j.creativitat} EX${j.extrem} PA${j.passades} AN${j.anotacio} PP${j.pilota_aturada}`;
  // L'ONZE TITULAR va primer i porta els seus ONZE LLOCS, buits inclosos: un lloc sense ningú
  // és el senyal més fort que hi ha. Els qui hi entren no es repetixen a les altres targetes.
  if (onze) {
    const perId = new Map(jugadors.map((j) => [j.id, j]));
    const tarja = card(t('plantilla.onze_titular'), onze.length, 'llima');
    for (const l of onze) tarja.append(filaSegura(() => {
      const j = perId.get(l.jugador_id);
      // LA MATEIXA FILA que les altres targetes: cinc cel·les i el xip de posició amb el seu
      // color. El xip porta la SIGLA DEL LLOC, que és una posició i per tant té color propi
      // (PO groc · DC roig · MC verd · EX blau · DV lila); el codi del lloc va a la meta, que
      // és on van els qualificadors. L'última cel·la queda buida —ací no hi ha categoria que
      // canviar— però hi és, perquè si no la graella es desquadra.
      // Fora la píndola del lloc: deia «defensa3», «mc4» — el bucket amb l'índex de la
      // formació, un identificador intern. El xip ja diu quina posició és i la fila ja va en
      // l'orde de la formació, o siga que el número no afegia res.
      const sigla = BUCKET_SIGLA[l.bucket] || l.bucket;
      const meta = el('div', { class: 'fila-meta' });
      if (j) {
        meta.append(el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` }));
        if (esLesionat(j.lesio)) meta.append(el('span', { class: 'pill perill', text: t('comu.lesionat_durada', { n: duradaLesio(j.lesio) ?? '?' }) }));
      }
      // L'última cel·la: contra QUÈ es mesura este lloc i quin nivell paga el flux. És la vara,
      // i va a la mateixa fila que l'ocupant per a poder-los llegir d'un colp d'ull.
      const vara = el('div', { class: 'vara' },
        el('span', { class: 'vara-hab', text: t('hab.' + l.habilitat) }),
        el('b', { text: l.nivell_objectiu ?? '—' }));
      return el('div', { class: j ? 'fila' : 'fila buit' },
        el('div', { class: 'fila-qui' },
          el('div', { class: posCls(sigla), text: sigla }),
          el('div', {}, el('div', { class: 'fila-nom', text: j ? j.nom : t('plantilla.lloc_buit') }), meta)),
        // La columna diu QUANT LI FALTA O LI SOBRA per a l'objectiu del lloc, no la puntuació
        // de la seua categoria: onze jugadors mesurats amb fórmules distintes a la mateixa
        // columna no es podien comparar entre ells.
        el('div', { class: 'punts ' + (l.senyal ?? ''), text: j ? signat(l.diferencia) : '—' }),
        el('div', { class: 'tsi', text: j ? 'TSI ' + (j.tsi ?? '—') : '' }),
        el('div', { class: 'skills', text: j ? hab(j) : '' }),
        vara);
    }, 1));
    main.append(tarja);
  }

  // ENTRENABLES: van just darrere de l'onze perquè són la seua continuació — els joves que
  // ocuparan els llocs del motor quan els titulars descansen. Es mesuren contra la MATEIXA
  // vara que eixos llocs, que és el que diu si el jove servix o no.
  if (entrenables?.places) {
    const perId = new Map(jugadors.map((j) => [j.id, j]));
    const nivell = entrenables.nivell_objectiu;
    const tarja = card(t('plantilla.entrenables'), entrenables.places);
    // TOT el que porta l'API, no una tria a mà: copiar camp a camp vol dir que el dia que
    // n'afiges un a l'avaluador i te n'oblides ací, la pantalla pinta un guionet i sembla que
    // les dades no hi són. És el que va passar amb `setmanes_seguent`.
    const files = entrenables.jugadors.map((x) => ({ ...perId.get(x.id), ...x }))
      .filter((j) => j.id != null);
    for (const j of files) tarja.append(filaSegura(() => el('div', { class: 'fila ent' },
      el('div', { class: 'fila-qui' },
        el('div', { class: posCls('MC'), text: t('plantilla.entrenable_curt') }),
        el('div', {}, el('div', { class: 'fila-nom', text: j.nom }),
          el('div', { class: 'fila-meta' },
            el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` })))),
      // «10(6)» A LA COLUMNA DE VALOR, on a l'onze va la resta contra l'objectiu. Ací el que
      // decidix no és què li falta per a arribar, sinó QUÈ LI COSTA PUJAR: amb més entrenables
      // que places, els primers han de ser els que estan més a prop del nivell següent.
      // El segon número només hi és si la pujada s'ha vist — si no, no s'inventa.
      el('div', { class: 'punts', text: j.setmanes_seguent == null ? '—'
        : t('plantilla.setmanes_nivell', { seguent: decimal(j.setmanes_seguent),
            anterior: j.setmanes_anterior == null ? '—' : decimal(j.setmanes_anterior) }) }),
      el('div', { class: 'tsi', text: 'TSI ' + (j.tsi ?? '—') }),
      el('div', { class: 'skills', text: hab(j) }),
      el('div', { class: 'vara' },
        el('span', { class: 'vara-hab', text: t('hab.' + entrenables.habilitat) }),
        el('b', { text: nivell ?? '—' }))), 1));
    // Les places que no s'omplin es diuen: una plaça d'entrenament buida és entrenament perdut.
    tarja.append(cos(el('p', { class: 'nota-peu', text: t('plantilla.entrenables_nota') })));
    for (let i = files.length; i < entrenables.places; i++) tarja.append(el('div', { class: 'fila buit' },
      el('div', { class: 'fila-qui' },
        el('div', { class: posCls('MC'), text: t('plantilla.entrenable_curt') }),
        el('div', {}, el('div', { class: 'fila-nom', text: t('plantilla.lloc_buit') }))),
      el('div', { class: 'punts', text: '—' }), el('div', { class: 'tsi' }),
      el('div', { class: 'skills' }), el('div', { class: 'vara' })));
    main.append(tarja);
  }

  // ── FUTUR ENTRENADOR i PORTER SUPLENT: els altres dos que la segona alineació necessita.
  // Un perquè el sou ja el pagues mentre esperes els diners de la reconversió; l'altre perquè
  // el porter és l'únic que no dobla. Van en files d'una sola targeta cada un.
  const perId2 = new Map(jugadors.map((j) => [j.id, j]));
  // Sense columna de valor: la puntuació de la categoria no vol dir res en este format, i la
  // «prima de mercat» tampoc — eren les dues de la classificació vella.
  const filaSolta = (j, sigla, etiqueta, valor) => el('div', { class: 'fila' },
    el('div', { class: 'fila-qui' },
      el('div', { class: posCls(sigla), text: sigla }),
      el('div', {}, el('div', { class: 'fila-nom', text: j.nom }),
        el('div', { class: 'fila-meta' },
          el('span', { text: `${edat(j.edat_anys, j.edat_dies)} · ${j.especialitat || '—'}` })))),
    el('div', { class: 'punts' }),
    el('div', { class: 'tsi', text: 'TSI ' + (j.tsi ?? '—') }),
    el('div', { class: 'skills', text: hab(j) }),
    el('div', { class: 'vara' }, el('span', { class: 'vara-hab', text: etiqueta }), el('b', { text: valor })));
  if (futurE && perId2.has(futurE.jugador_id)) {
    const c = card(t('plantilla.futur_entrenador'));
    c.append(filaSolta(perId2.get(futurE.jugador_id), 'ENT', t('plantilla.reconversio'),
      futurE.reconversio?.solid ? diners(futurE.reconversio.solid) : '—'));
    c.append(cos(el('p', { class: 'nota-peu', text: t('plantilla.futur_entrenador_nota', {
      nivell: t('nivell_ht.' + futurE.experiencia), lideratge: futurE.lideratge ?? '—' }) })));
    main.append(c);
  }
  if (porterS && perId2.has(porterS.jugador_id)) {
    const c = card(t('plantilla.porter_suplent'));
    c.append(filaSolta(perId2.get(porterS.jugador_id), 'POR', t('plantilla.sou_setmanal'),
      diners(porterS.sou)));
    c.append(cos(el('p', { class: 'nota-peu', text: t('plantilla.porter_suplent_nota') })));
    main.append(c);
  }

  // ── VENDA i DESPATXAR: tot el que no ha entrat en cap de les quatre seccions ────────
  // Fora «rotatiu», «titular», «porter» i «cos»: eren la classificació del PAS 6, que
  // decidia qui es quedava ABANS de saber qui ocupa cada lloc. Ara si no ocupes un lloc del
  // pla, no entrenes i no eres el futur entrenador ni el porter suplent, cobres sense fer res.
  //
  // I els que ja van eixir a subhasta sense comprador van a banda: no es tornen a llistar
  // (ja no són transferibles) i l'única cosa que se'n pot fer és despatxar-los.
  const grup = (titol, ids, variant, etiqueta) => {
    if (!ids || !ids.length) return;
    const tarja = card(t(titol), ids.length, variant);
    for (const id of ids) {
      const j = perId2.get(id);
      if (j) tarja.append(filaSegura(() => filaSolta(j, j.posicio || '—', etiqueta, diners(j.sou)), 1));
    }
    main.append(tarja);
  };
  grup('plantilla.venda', aVenda, 'roig', t('plantilla.sou_setmanal'));
  grup('plantilla.despatxar', aDespatxar, 'roig', t('plantilla.sou_setmanal'));
  if (aDespatxar?.length) main.append(el('p', { class: 'nota-peu', text: t('plantilla.despatxar_nota') }));
}

// ── 5. Entrenament ──
// EL QUE S'ENTRENA ES PRESCRIU. Ací no hi ha res a triar: ix del pipeline (quines habilitats
// alimenten els llocs que entrenen). El que SÍ que es declara és l'ENTRENADOR, perquè el seu
// nivell entra a la velocitat d'entrenament i no es deriva de res.
//
// Viu ací i no a Personal: no és especialista, no gasta cap de les 4 places, no cobra per
// l'escala d'especialistes i no té contracte de 16 setmanes.
export async function entrenament(main) {
  capcalera(main, 5, 'entrenament');
  const d = await api('/api/entrenament');

  // 1 · La PRESCRIPCIÓ, que es llig i prou.
  const c = card(t('entrenament.prescrit_titol'), null, 'llima');
  c.append(el('div', { class: 'card-cos' },
    el('p', { class: 'instruccio', text: d.prescrit?.skill
      ? t('entrenament.posa', { a: t('hab.' + d.prescrit.skill),
          intensitat: d.intensitat, resistencia: d.resistencia })
      : t('entrenament.sense_prescripcio') }),
    el('p', { class: 'nota-peu', text: t('entrenament.prescrit_nota') })));
  main.append(c);

  // 2 · L'ENTRENADOR, que sí que es declara. El llapis obri l'editor, com a Configuració.
  const e = d.entrenador || {};
  const llapis = el('button', { type: 'button', class: 'b-icona', text: '✎',
    title: t('entrenament.edita'), 'aria-label': t('entrenament.edita') });
  const ce = card(t('entrenament.entrenador_titol'), null, null, llapis);
  const cos_ = el('div', { class: 'card-cos' });
  const fila = (clau, valor) => el('div', { class: 'graella-fila' },
    el('b', { text: t('entrenament.' + clau) }), el('span', { class: 'graella-val', text: valor }));
  cos_.append(
    fila('nivell', e.coach_entrenament ? t('coach.' + e.coach_entrenament) : '—'),
    fila('eficiencia', e.coach_entrenament && d.eficiencia?.[e.coach_entrenament] != null
      ? percent(d.eficiencia[e.coach_entrenament]) : '—'),
    fila('lideratge', e.coach_lideratge != null ? String(e.coach_lideratge) : '—'),
    fila('sou', e.sou != null ? diners(e.sou) : '—'),
    fila('assistents', tp('entrenament.assistents_n', d.assistents, { n: d.assistents })));
  if (!e.coach_entrenament) cos_.append(el('p', { class: 'desquadre', text: t('entrenament.falta_entrenador') }));
  ce.append(cos_);

  // L'editor: el nivell ix de la taula d'eficiències, no d'una llista escrita ací.
  const ed = el('div', { class: 'card-editor amagat' });
  const f = el('form', { class: 'card-cos' });
  const sel = el('select', { 'aria-label': t('entrenament.nivell') },   // precarrega
    ...Object.keys(d.eficiencia || {}).map((k) => {
      const o = el('option', { value: k, text: t('coach.' + k) });
      if (k === e.coach_entrenament) o.setAttribute('selected', '');   // precarrega
      return o;
    }));
  const num = (clau, val) => { const i = el('input', { type: 'number', 'aria-label': t('entrenament.' + clau) });
    if (val != null) i.value = val; return i; };
  const lid = num('lideratge', e.coach_lideratge);
  const sou = num('sou', e.sou);
  f.append(el('div', { class: 'form-graella' },
    el('label', {}, t('entrenament.nivell'), sel),
    el('label', {}, t('entrenament.lideratge'), lid),
    el('label', {}, t('entrenament.sou'), sou)),
    el('button', { type: 'submit', class: 'b-prim', text: t('entrenament.desa') }));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/entrenament', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ coach_entrenament: sel.value, coach_lideratge: lid.value || null, sou: sou.value || null }) });
    location.reload();
  });
  ed.append(f);
  ce.append(ed);
  llapis.addEventListener('click', () => {
    const obert = ed.classList.toggle('amagat');
    llapis.classList.toggle('actiu', !obert);
  });
  main.append(ce);
}

// ── 6. Juvenils ──
export async function juvenils(main) {
  capcalera(main, 6, 'juvenils');
  const val = (v) => (v == null ? '-' : v === 'desconegut' ? t('juvenils.desconegut') : v);
  const d = await api('/api/juvenils');
  main.append(el('div', { class: 'tip', text: '\u26a1 ' + t('juvenils.tactica_reminder') }));
  formEntrenamentJuvenil(main, d);
  if (!d.juvenils.length) { main.append(el('p', { text: t('juvenils.buit') })); return; }

  // EL PLA DE LA SETMANA. La llista ja ve en l'orde del pla: qui va davant s'endu les places
  // que entrenen i qui va darrere es el primer a eixir. Una sola ordenacio per a les dues
  // coses, perque son la mateixa pregunta feta pels dos extrems.
  const hab = (j) => j.habilitats
    .filter((h) => h.actual != null || h.potencial != null)
    .map((h) => `${SIGLA[h.habilitat]} ${val(h.actual)}/${val(h.potencial)}`).join('  ');
  // El PER QUE ix del pla, no de la vista: el motiu i el numero els calcula l'avaluador.
  const perque = (j) => (j.bloquejat ? t('juvenils.motiu_bloquejat')
    : j.lloc?.motiu ? t('juvenils.motiu_' + j.lloc.motiu, { habilitat: j.lloc.habilitat ? t('hab.' + j.lloc.habilitat) : '' })
      : t('juvenils.motiu_cua'));

  const c = card(t('juvenils.titol'), d.juvenils.length, 'llima');
  for (const j of d.juvenils) c.append(filaSegura(() => {
    const lloc = j.bloquejat ? t('juvenils.lloc_bloquejat')
      : j.banqueta ? t('juvenils.lloc_banqueta')
        : (BUCKET_SIGLA[j.lloc?.bucket] ?? t('juvenils.lloc_residual'));
    const meta = el('div', { class: 'fila-meta' },
      el('span', { text: `${edat(j.edat_anys, j.edat_dies)} \u00b7 ${j.especialitat || '\u2014'}` }),
      el('span', { text: perque(j) }),
      el('span', { class: 'skills', text: hab(j) }));
    if (j.despatxa) meta.append(el('span', { class: 'pill perill', text: t('juvenils.despatxa') }));
    if (j.promociona) meta.append(el('span', { class: 'pill ok', text: t('juvenils.promociona') }));
    return el('div', { class: 'fila' },
      el('div', { class: 'fila-qui' },
        el('div', { class: posCls(lloc), text: lloc }),
        el('div', {}, el('div', { class: 'fila-nom', text: j.nom }), meta)),
      el('div', { class: 'punts', text: j.lloc?.valor != null ? decimal(j.lloc.valor) : '\u2014' }),
      el('div', { class: 'tsi' }), el('div', { class: 'skills' }),
      el('div', { class: 'vara' },
        el('span', { class: 'vara-hab', text: t('juvenils.a_promocio') }),
        el('b', { text: j.dies_restants_promocio ?? '\u2014' })));
  }, 1));
  main.append(c);
  if (d.pla) main.append(el('p', { class: 'nota-peu', text: t('juvenils.nota_pla', {
    principal: t('hab.' + d.pla.principal), llisto_a: d.pla.llistons[d.pla.principal],
    secundaria: t('hab.' + d.pla.secundaria), llisto_b: d.pla.llistons[d.pla.secundaria],
    objectiu: d.pla.objectiu ?? '\u2014' }) }));
}

// L'ENTRENAMENT DE L'ACADÈMIA, que és el SEU i no el del primer equip: Hattrick té dues
// pantalles distintes i amb continguts distints (ací hi ha principal i secundari; allà, una
// habilitat amb intensitat i resistència). Abans esta targeta llegia la prescripció sènior i,
// quan no la trobava, deia literalment «falta l'entrenament sènior» dins de Juvenils.
function formEntrenamentJuvenil(main, d) {
  const sec = card(t('juvenils.entrenament_titol'), null, 'llima');
  sec.append(el('div', { class: 'card-cos' },
    el('p', { class: 'instruccio', text: d.pla?.principal
      ? t('juvenils.entrenament_posa', { principal: t('hab.' + d.pla.principal), secundari: t('hab.' + d.pla.secundaria) })
      : t('juvenils.entrenament_sense_prescripcio') })));
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
  // ELS DOS ESTATS DE L'OBRA, on es pren la decisió. Sense això l'obra es proposava per sempre:
  // té prioritat absoluta, o siga que mentre estiga damunt de la taula NO ES PROPOSA RES MÉS, i
  // no hi havia manera de dir-li «ja l'estic fent» ni «ja està feta».
  //
  // «ja està feta» no és un tercer estat: és que eixa obra ja no existix. Els números de la
  // calculadora la descrivien i es buiden, i Tonico torna a demanar-los per a la següent.
  const marca = (camps) => api('/api/finances', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(camps) }).then(() => location.reload());
  const bFeta = () => { const b = el('button', { type: 'button', class: 'b-prim', text: t('estoc.obra_feta') });
    b.addEventListener('click', () => marca({ estadi_obra_inici: null, estadi_cost_obra: null,
      estadi_manteniment: null, estadi_data: null }));
    return b; };
  if (obra?.obra_en_curs) {
    cos.append(el('p', { class: 'obra-curs' },
      el('span', { class: 'pill ok', text: t('estoc.obra_en_curs') }), ' ',
      el('span', { text: t('estoc.obra_des_de', { data: obra.obra_inici }) })));
    cos.append(el('div', { class: 'obra-botons' }, bFeta()));
  } else if (e.recomanada) {
    cos.append(el('p', {}, el('b', { text: t('estoc.recomanada') }), ' ',
      el('span', { text: e.recomanada.tipus === 'estadi'
        // `delta_manteniment` és el que l'obra AFIG cada setmana, no el que allibera.
        ? t('estoc.opcio_estadi', ambXifres({ cost: e.recomanada.cost,
            manteniment: e.recomanada.delta_manteniment }, ['cost', 'manteniment']))
        : tp('estoc.opcio_jugador', e.recomanada.mancanca,
            ambXifres({ lloc: e.recomanada.lloc, habilitat: t('hab.' + e.recomanada.habilitat),
              // El nivell es diu pel seu NOM de Hattrick. Les claus van indexades pel nivell de
              // Tonico: fer «n + 4» ací seria aritmètica de domini a la vista (invariant 12).
              nivell: t('nivell_ht.' + e.recomanada.nivell_objectiu),
              mancanca: e.recomanada.mancanca, cost: e.recomanada.cost }, ['cost'])) })));
    if (e.recomanada.tipus === 'estadi') {
      const bFent = el('button', { type: 'button', class: 'b-prim', text: t('estoc.obra_fent') });
      // La data d'inici és el dia que ho marca: només s'ensenya, no entra a cap fórmula.
      bFent.addEventListener('click', () => marca({ estadi_obra_inici: new Date().toISOString().slice(0, 10) }));
      cos.append(el('div', { class: 'obra-botons' }, bFent, bFeta()));
    }
  } else {
    cos.append(el('p', { class: 'nota-peu', text: t('estoc.cap_opcio') }));
  }
  // LA TAULA DE FITXATGES: UNA LÍNIA PER FITXATGE, i només els que et pots permetre. La
  // columna «ara mateix» deia sempre el mateix i se n'ha anat amb els que no es podien pagar.
  // Quan d'un tipus en caben diversos, cada línia porta el seu ordinal i el TOTAL acumulat.
  const g = graellaAmbFiles('c-estoc',
    ['col_que', 'col_per_que', 'col_cost'].map((k) => t('estoc.' + k)),
    e.opcions.filter((o) => o.tipus === 'jugador').map((o) => el('div', { class: 'graella-fila-d c-estoc' },
      el('span', { text: (o.motiu === 'placa_entrenament_buida'
        ? t('mercat.nec_entrenable_1', { n: 1, nivell: o.nivell_objectiu })
        : o.motiu === 'sense_porter_suplent' ? t('mercat.nec_porter_suplent')
          : t('mercat.nec_lloc_1', { n: 1,
              lloc: t('hab.' + (BUCKET_HAB[o.bucket] || o.bucket)), nivell: o.nivell_objectiu }))
        + (o.varis ? ' ' + t('estoc.de_quants', { i: o.ordinal, n: o.de }) : '') }),
      el('span', { text: t('mercat.nec_' + o.motiu) }),
      el('span', { class: 'graella-val', text: o.varis
        ? t('estoc.cost_acumulat', ambXifres({ cost: o.cost, acumulat: o.acumulat }, ['cost', 'acumulat']))
        : diners(o.cost) }))));
  if (g) cos.append(g);
  if (!e.estadi_declarat) cos.append(el('p', { class: 'nota-peu', text: t('estoc.estadi_falta') }));
  c.append(cos); main.append(c);
}

export async function mercat(main) {
  capcalera(main, 7, 'mercat');
  const { estoc, necessaris } = await api('/api/mercat');
  if (estoc) bucleEstoc(main, estoc);
  // ── QUÈ FA FALTA FITXAR, i quant costa ──────────────────────────────────────────────
  // El preu no es deriva: a Hattrick el paga un altre mànager. Ací es diu QUÈ buscar i es
  // demana el número que Miquel veja a les últimes transferències. Sense eixe número la
  // necessitat es veu, però «què compensa comprar» no la pot decidir.
  if (necessaris?.length) {
    const cn = card(t('mercat.necessaris_titol'), necessaris.length, 'llima');
    const cnc = el('div', { class: 'card-cos' });
    for (const n of necessaris) {
      const preu = el('input', { type: 'number', 'aria-label': t('mercat.preu_ref') });
      if (n.preu != null) preu.value = n.preu;
      const desar = () => api('/api/mercat', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clau: n.clau, preu: preu.value || null }) }).then(() => location.reload());
      preu.addEventListener('change', desar);
      const etiqueta = n.tipus === 'porter_suplent' ? t('mercat.nec_porter_suplent')
        : n.tipus === 'entrenable' ? tp('mercat.nec_entrenable', n.quants, { n: n.quants, nivell: n.nivell })
          : tp('mercat.nec_lloc', n.quants, { n: n.quants, lloc: t('hab.' + (BUCKET_HAB[n.bucket] || n.bucket)), nivell: n.nivell });
      // ELS CRITERIS DE CERCA, al costat del preu: és el que Miquel ha de teclejar a Hattrick
      // per a mirar les últimes transferències i tornar el número.
      const camps = el('div', { class: 'filtre-camps' });
      const camp = (clau, valor) => { if (valor == null || valor === '') return;
        camps.append(el('div', { class: 'filtre-camp' },
          el('span', { class: 'filtre-et', text: t('mercat.camp_' + clau) }),
          el('b', { text: String(valor) }))); };
      const c = n.cerca || {};
      camp('posicions', (c.posicions || []).join(' / '));
      if (c.edat_min != null && c.edat_max != null) camp('edat', t('mercat.rang', { min: c.edat_min, max: c.edat_max }));
      if (c.habilitat?.camp) camp('habilitat', `${t('hab.' + c.habilitat.camp)} ≥ ${c.habilitat.min}`);
      if (c.mes_barat) camp('criteri', t('mercat.mes_barat'));
      camp('pressupost', c.sense_caixa ? t('mercat.sense_pressupost') : diners(c.pressupost));
      camps.append(el('label', { class: 'decl-camp' },
        el('span', { class: 'decl-et', text: t('mercat.preu_ref') }), preu));
      cnc.append(el('div', { class: 'filtre' },
        el('div', { class: 'filtre-cap' },
          el('b', { text: etiqueta }),
          el('span', { class: 'filtre-falten', text: t('mercat.nec_' + n.motiu) })),
        camps,
        ...(n.preu_vell ? [el('p', { class: 'desquadre', text: t('mercat.preu_vell', { data: n.preu_data }) })] : [])));
    }
    cn.append(cnc);
    cn.append(cos(el('p', { class: 'nota-peu', text: t('mercat.necessaris_nota') })));
    main.append(cn);
  }

  await fitxesVenda(main);
}

// ── Fitxes de venda (Àrea E) ──
// «desert» NO és a la llista: no es tria a mà, es deduïx de la transició del CSV i es desa. I
// L'ESTAT NO ES TRIA. Dels quatre valors que el desplegable oferia, `llistat` i `pendent` els
// escriu `derivaLlistat` a cada pujada des de la columna Transferible del CSV, i `venut` i
// `despatxat` no els llegia ningú: la seua pregunta —per què se n'ha anat— la fa Decisions el
// dia que el jugador deixa d'eixir al fitxer. Un control que no podia escriure res que aportara
// res. La subhasta deserta tampoc es pregunta: es dedueix.
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
    ...['col_jugador', 'col_situacio', 'col_data', 'col_tancament'].map((k) => el('span', { text: t('vendes.' + k) }))));
  for (const j of jugadors) sec.append(filaSegura(() => {
    // Cap camp de PREU ni d'ESTAT. El preu no entra a cap fórmula (v3.1) i l'estat el deriva el
    // CSV. Queda l'única cosa que el sistema NO pot saber i que mou el rellotge de la subhasta:
    // el dia que el vas llistar de veres. `derivaLlistat` el suposa —la data de la instantània
    // on apareix—, que com a molt és el dia que vas pujar el fitxer.
    const dataL = el('input', { type: 'date', 'aria-label': t('vendes.col_data') }); if (j.data_llistada) dataL.value = j.data_llistada;
    dataL.addEventListener('change', () => api('/api/vendes', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jugador_id: j.jugador_id, data_llistada: dataL.value || null }) }).catch(() => {}));
    const propCell = el('div', {});
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
      propCell, dataL,
      el('span', { text: j.tancament_previst || '—' }));
  }, 1));
  for (const ll of nota.llegendes()) sec.append(cos(el('p', { class: 'nota-peu', text: ll })));
  main.append(sec);
}

// ── 7. Economia ──
// Formata en «diners» les claus monetàries d'un objecte de paràmetres (la resta
// intacta): així cap plantilla econòmica interpola un número cru.
// PATRÓ: sense files, NO es pinta la taula (ni la capçalera). Qui vulga una graella passa
// per ací i no pot oblidar-se'n.
//
// La classe `taula` és una sola columna: `.graella` a seques és una graella de TARGETES
// (auto-fill), i amb ella les files d'una taula s'apilaven de costat en pantalla ampla i la
// capçalera quedava esclafada en tres línies.
const graellaAmbFiles = (classe, capçaleres, files) => {
  if (!files || !files.length) return null;
  const g = el('div', { class: 'graella taula' });
  g.append(el('div', { class: 'graella-cap ' + classe }, ...capçaleres.map((x) => el('span', { text: x }))));
  for (const f of files) g.append(f);
  return g;
};

export async function economia(main) {
  capcalera(main, 8, 'economia');
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
  // QUINES DUES SETMANES SÓN HO DIU EL SERVIDOR, no un camp de data: esta és la de hui i la
  // passada la de fa set dies. Cada bloc ve precarregat amb el que ja hi haja declarat d'eixa
  // setmana —no amb «les dues últimes files de l'històric», que si encara no has declarat esta
  // setmana són les dues anteriors i t'ensenyaven números que no tocaven.
  const s2 = e.declaracio?.esta || {}, s1 = e.declaracio?.passada || {};
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
    bloc('setmana_passada', tq1, pt1),
    bloc('setmana_esta', tq2, pt2)));
  // El club: estes dues no van per setmana. La caixa és d'ara i el manteniment és constant.
  f.append(el('div', { class: 'decl-setmanes' },
    el('div', { class: 'decl-bloc ample' },
      el('h4', { class: 'decl-titol', text: t('economia.del_club') }),
      el('div', { class: 'decl-camps' }, caixa, estadi))));
  f.append(el('button', { type: 'submit', class: 'b-prim', text: t('economia.finances_desa') }));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (l) => { const x = l.querySelector('input').value; return x === '' ? null : x; };
    // Cap data: cada bloc diu QUANTES SETMANES ARRERE va, i el rellotge del servidor fa la
    // resta. Una setmana sense res declarat no s'envia com a zero, es queda sense declarar.
    await api('/api/finances', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      caixa: v(caixa), despesa_estadi: v(estadi),
      setmanes: [{ endarrere: 1, taquilla: v(tq1), patrocini: v(pt1) },
                 { endarrere: 0, taquilla: v(tq2), patrocini: v(pt2) }] }) });
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
  // L'ESTAT DE L'OBRA no viu ací: no és un número de la calculadora, i ací no el trobava ningú.
  // Els dos botons («ja l'estic fent» / «ja està feta») van on es proposa l'obra, al Mercat.
  f.append(el('div', { class: 'decl-setmanes' },
    el('div', { class: 'decl-bloc ample' },
      el('h4', { class: 'decl-titol', text: t('economia.estadi_calculadora') }),
      el('div', { class: 'decl-camps' }, obra, mant, data))));
  f.append(el('button', { type: 'submit', class: 'b-prim', text: t('economia.estadi_desa') }));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (l) => { const x = l.querySelector('input').value; return x === '' ? null : x; };
    await api('/api/finances', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      estadi_cost_obra: v(obra), estadi_manteniment: v(mant), estadi_data: v(data) }) });
    location.reload();
  });
  main.append(f);
}



// ── 8. Pla mestre ──
export async function configuracio(main) {
  capcalera(main, 9, 'configuracio');
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
// ELS SIS TIPUS DE LA GUIA, i en SINGULAR: el desplegable deia «assistents» i eixe era el
// valor que es desava, però la prioritat del pla diu «assistent». Un assistent afegit des
// d'ací no s'aparellava amb cap plaça i quedava fora del pla. I en faltaven tres.
const ESPECIALISTES = ['assistent', 'metge', 'psicoleg', 'forma', 'tactic', 'financer'];
// PAS 11: el pla que el FLUX sosté, per prioritat. La vista només interpola.
// EL PLA DE PERSONAL: quatre places, i cada una és una PÍNDOLA amb el que hi ha declarat, el
// que li queda de contracte i el llapis per a editar-ho. Abans hi havia dues llistes de les
// mateixes quatre coses —el pla ací i un formulari sempre obert davall— i el nivell que es
// llegia era el del PLA, no el declarat: es llegia com «tens personal de nivell 1» quan el que
// tens és de nivell 2 i el que el flux sosté és 1.
function placa(x) {
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
  // ACCIÓ només quan n'hi ha una de possible: plaça lliure, o dins de la finestra de
  // venciment. Fora d'això NO ES DIU RES: ni «res a fer», ni «deixa'l com està». Explicar
  // cada setmana per què no hi ha res a fer és soroll amb un altre nom — l'espai es queda buit.
  if (x.accio && x.accio !== 'res') {
    pill.append(el('div', { class: 'placa-accio', text: x.accio_nivell
      ? t('flux.accio_' + x.accio + '_n', { paraula: t('nivell_ht.' + x.accio_nivell), n: x.accio_nivell })
      : t('flux.accio_' + x.accio) }));
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
    // D'ON IX EL PRESSUPOST i QUÈ EN PAGUES. La xifra del mig ha de ser la de veres —la suma
    // dels sous declarats—, no el que costaria el pla: deia «el pla en gasta 4 080 €» quan els
    // tres especialistes en cobren 6 120, i el sobrant que anunciava no existia.
    cos.append(el('p', { class: 'nota-peu', text: t('flux.capçal', {
      repartible: diners(Math.round(p.flux_repartible_setmanal)),
      quota: percent(p.quota_pct),
      pressupost: diners(Math.round(p.pressupost)),
      pagat: diners(Math.round(p.pagat)),
      restant: diners(Math.round(p.restant)) }) }));
    // Si el pressupost no arriba, es diu: el sobrant seria negatiu i «que sobren» mentiria.
    if (p.excedit) cos.append(el('p', { class: 'desquadre', text: t('flux.passat', { excedit: diners(Math.round(p.excedit)) }) }));
    // I si falta algun sou declarat, la suma està coixa i no es pot fer passar per completa.
    if (p.sense_sou) cos.append(el('p', { class: 'nota-peu', text: tp('flux.sense_sou', p.sense_sou, { n: p.sense_sou }) }));
    const places = el('div', { class: 'places' });
    for (const x of p.pla) places.append(placa(x));
    // Els declarats que no caben en cap plaça del pla: existixen i cobren, així que es veuen.
    for (const x of p.membres_fora || []) places.append(placa({ ...x, accio: 'res', venciment: false }));
    cos.append(places);
    cos.append(el('p', { class: 'nota-peu', text: t('flux.avis_compromis') }));
  }
  c.append(cos); main.append(c);
}

export async function personal(main) {
  capcalera(main, 10, 'personal');
  const d = await api('/api/personal');
  if (d.error) { main.append(el('p', { text: t('personal.sense_config') })); return; }
  // El pla de places és l'ÚNICA llista de personal: cada píndola porta el seu llapis.
  //
  // ACÍ NO HI HA ENTRENAMENT. L'entrenament es PRESCRIU (ix del pipeline), o siga que un
  // panell per a triar-lo era oferir una decisió que no existix. I l'ENTRENADOR tampoc: no és
  // especialista, no gasta plaça, no té contracte de 16 setmanes i no cobra per l'escala del
  // personal — barrejat ací només feia bolic. Tots dos van a la secció d'Entrenament, quan hi
  // siga. El seu sou segueix comptant al flux: això no ha canviat.
  if (d.pla_flux) plaFlux(main, d.pla_flux);
  const secM = card(t('personal.afig_titol'));
  formMembre(secM);
  main.append(secM);
}

// El nom visible d'un tipus de personal. Si el catàleg no el té, val el nom cru abans que un
// «—»: es va perdre la definició i la crida es va quedar, i Personal petava en pintar-se.
const lblElement = (k) => { const v = t('element.' + k); return v === t('comu.text_indisponible') ? k : v; };

function formMembre(main) {
  const f = el('form', { class: 'card-cos' });
  const graella = el('div', { class: 'form-graella' });
  const tipus = el('select', { 'aria-label': t('personal.tipus') }, ...ESPECIALISTES.map((x) => el('option', { value: x, text: lblElement(x) })));
  const nivell = el('input', { type: 'number', 'aria-label': t('personal.nivell') });   // crea
  const sou = el('input', { type: 'number', 'aria-label': t('personal.sou') });   // crea
  const fi = el('input', { type: 'date', 'aria-label': t('personal.data_fi_contracte') });   // crea
  const b = el('button', { type: 'submit', class: 'b-prim', text: t('personal.afig') });
  graella.append(el('label', {}, t('personal.tipus'), tipus),
    el('label', {}, t('personal.nivell'), nivell), el('label', {}, t('personal.sou'), sou),
    el('label', {}, t('personal.data_fi_contracte'), fi));
  f.append(graella, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await api('/api/personal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      rol: 'especialista', tipus: tipus.value,
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
  capcalera(main, 11, 'comparador');
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
  // motiu a «Decisions»; les altes només es declaren. Sense categoria: ja no n'hi ha.
  const decl = (clau, fitxa) => t(clau, { nom: fitxa.nom, edat: edat(fitxa.edat_anys, fitxa.edat_dies) });
  if ((d.nous && d.nous.length) || (d.desapareguts && d.desapareguts.length)) {
    const ab = el('div', { class: 'card-cos' }, el('h3', { text: t('comparador.altes_baixes_titol') }));
    for (const f of d.nous || []) ab.append(el('div', { class: 'mov-fila' }, el('span', { class: 'pill ok', text: '+' }), el('span', { class: 'mov-text', text: decl('comparador.alta', f) })));
    for (const f of d.desapareguts || []) ab.append(el('div', { class: 'mov-fila' }, el('span', { class: 'pill perill', text: '−' }), el('span', { class: 'mov-text', text: decl('comparador.baixa', f) })));
    c.append(ab);
  }
  main.append(c);
}
