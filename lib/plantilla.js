// Tonico — PLANTILLA (contracte v3, PAS 2 i PAS 6). Qui es queda, DERIVAT.
//
//   N_core     = COMPTA(pos_A)                              [els llocs que entrenen]
//   N_rotatius = SUMA(pos_A amb pct=100: partits_setmana − 1)
//   core       = PRIMERS(N_core; ORDENA(hab(j,A) ≥ `core_a_min`; hab(j,A) DESC, edat_d ASC))
//   rotatius   = PRIMERS(N_rotatius; ORDENA(edat_d ∈ [17×112, `edat_pic_venda`×112]; hab(j,A) DESC))
//   titulars   = PER lloc ∉ pos_A: el millor per hab(habilitat_lloc) DESC, sou ASC
//   porters_n  = 1 × partits_setmana
//   cossos_n   = ARREDONIX.AMUNT((llocs_partit − llocs_ocupats) / partits_setmana)
//   cossos     = PRIMERS(cossos_n; ORDENA(la resta; sou ASC))
//   retinguts  = core ∪ rotatius ∪ titulars ∪ porters ∪ cossos
//   venda      = plantilla − retinguts        [categoria sencera; cap marca dins]
//
// El vocabulari és el del full (invariant 14): core · rotatiu · titular · cos · retingut ·
// sobrant. No hi ha «entrenable», «farciment» ni «experiència»: eren del model fàbrica.

export const ROLS = ['core', 'rotatiu', 'titular', 'porter', 'cos'];

// N_core = quants llocs entrenen; N_rotatius = els que cal doblar per a cobrir tots els
// partits dels llocs que entrenen al 100% (un jugador de lloc al 100% només juga un partit).
export function comptesNucli(slots, partitsSetmana) {
  if (!partitsSetmana) return { n_core: null, n_rotatius: null };
  const entrenen = (slots || []).filter((s) => s.entrena);
  const n_core = entrenen.length;
  const n_rotatius = entrenen.filter((s) => (s.pct ?? 100) >= 100).length * (partitsSetmana - 1);
  return { n_core, n_rotatius };
}

// max_partits(j): qui ocupa un lloc que no entrena al 100%, i els cossos i el futur
// entrenador, poden jugar els dos partits; la resta, un.
export function maxPartits(rol, pctLloc) {
  if (rol === 'cos' || rol === 'futur_entrenador') return 2;
  return (pctLloc ?? 100) < 100 ? 2 : 1;
}

const num = (v) => (v == null ? 0 : Number(v));
const edatD = (j, anyDies) => num(j.edat_anys) * anyDies + num(j.edat_dies);

// ── PAS 6 ──
// `llocs` = [{lloc, entrena, pct, habilitat}] de la formació (llocs de camp, un per plaça).
// `opts` = { A, core_a_min, edat_pic_venda, any_dies, partits_setmana, llocs_partit, posicio_porter }
export function construeixPlantilla(plantilla, llocs, opts) {
  const { A, core_a_min = 0, edat_pic_venda, any_dies = 112, partits_setmana,
    llocs_partit, habilitat_porter = 'porteria' } = opts;
  const lliures = new Set(plantilla.map((j) => j.jugador_id));
  const rol = {};
  const pren = (j, r) => { lliures.delete(j.jugador_id); rol[j.jugador_id] = r; };
  const disp = () => plantilla.filter((j) => lliures.has(j.jugador_id));

  const slotsA = llocs.filter((l) => l.entrena);
  const { n_core, n_rotatius } = comptesNucli(slotsA.map((l) => ({ entrena: true, pct: l.pct })), partits_setmana);

  // CORE: els millors en l'habilitat que s'entrena; a igualtat, el més jove (més recorregut).
  const core = disp()
    .filter((j) => num(j[A]) >= core_a_min)
    .sort((a, b) => num(b[A]) - num(a[A]) || edatD(a, any_dies) - edatD(b, any_dies))
    .slice(0, n_core ?? 0);
  core.forEach((j) => pren(j, 'core'));

  // ROTATIUS: dins de la finestra d'edat (ja promocionables, encara no al pic de venda),
  // els millors en l'habilitat que s'entrena. Són els que doblen els llocs del 100%.
  const rotatius = edat_pic_venda == null ? [] : disp()
    .filter((j) => { const e = edatD(j, any_dies); return e >= 17 * any_dies && e <= edat_pic_venda * any_dies; })
    .sort((a, b) => num(b[A]) - num(a[A]))
    .slice(0, n_rotatius ?? 0);
  rotatius.forEach((j) => pren(j, 'rotatiu'));

  // TITULARS: un per cada lloc que NO entrena — el millor en l'habilitat del lloc, i a
  // igualtat el més barat (el nivell el fixa el lloc, no el sou).
  const titulars = [];
  for (const l of llocs.filter((x) => !x.entrena)) {
    const millor = disp()
      .sort((a, b) => num(b[l.habilitat]) - num(a[l.habilitat]) || num(a.sou) - num(b.sou))[0];
    if (millor) { pren(millor, 'titular'); titulars.push({ ...millor, lloc: l.lloc }); }
  }

  // PORTERS: en calen 1 per partit. El titular de porteria ja compta; si en falten, els
  // millors de porteria i, a igualtat, els més barats.
  const porters_n = partits_setmana ?? 0;
  const jaPorters = titulars.filter((t) => t.habilitat_lloc === habilitat_porter
    || llocs.find((l) => l.lloc === t.lloc)?.habilitat === habilitat_porter).length;
  const porters = disp()
    .filter((j) => num(j[habilitat_porter]) > 0)
    .sort((a, b) => num(b[habilitat_porter]) - num(a[habilitat_porter]) || num(a.sou) - num(b.sou))
    .slice(0, Math.max(0, porters_n - jaPorters));
  porters.forEach((j) => pren(j, 'porter'));

  // COSSOS: els llocs de partit que queden per cobrir, dividits pels partits que un cos
  // pot jugar (dos). Es tria pel SOU, perquè un cos no aporta nivell: només ompli.
  const ocupats = core.length + rotatius.length * 1 + titulars.length + porters.length;
  const cossos_n = llocs_partit == null || !partits_setmana
    ? 0
    : Math.max(0, Math.ceil((llocs_partit - llocsOcupats(core, rotatius, titulars, porters, partits_setmana)) / partits_setmana));
  const cossos = disp().sort((a, b) => num(a.sou) - num(b.sou)).slice(0, cossos_n);
  cossos.forEach((j) => pren(j, 'cos'));

  // PUNTS: el mèrit que ha posat cada u al seu rol (la mateixa clau amb què s'ha ordenat).
  // El mecanisme d'actua+informa+desfés els necessita per a mesurar si un desplaçament
  // val la pena (llindar anti-soroll); sense magnitud, tot desplaçament sembla igual.
  const punts = {};
  core.forEach((j) => { punts[j.jugador_id] = num(j[A]); });
  rotatius.forEach((j) => { punts[j.jugador_id] = num(j[A]); });
  titulars.forEach((t) => { const l = llocs.find((x) => x.lloc === t.lloc); punts[t.jugador_id] = num(t[l?.habilitat]); });
  porters.forEach((j) => { punts[j.jugador_id] = num(j[habilitat_porter]); });
  cossos.forEach((j) => { punts[j.jugador_id] = -num(j.sou); });     // com més barat, millor cos

  const retinguts = [...core, ...rotatius, ...titulars, ...porters, ...cossos];
  const venda = plantilla.filter((j) => lliures.has(j.jugador_id));
  return {
    n_core, n_rotatius, porters_n, cossos_n,
    core, rotatius, titulars, porters, cossos,
    retinguts, venda, rol, punts,
    llocs_ocupats: ocupats,
  };
}

// llocs_ocupats: cada rol ompli tants llocs de partit com partits pot jugar.
export function llocsOcupats(core, rotatius, titulars, porters, partitsSetmana) {
  // el core i els rotatius cobrixen els llocs que entrenen als dos partits;
  // els titulars, un partit cadascun; els porters, un cadascun.
  return core.length + rotatius.length + titulars.length + porters.length;
}
