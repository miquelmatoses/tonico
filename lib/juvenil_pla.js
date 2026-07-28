// Tonico — EL PLA JUVENIL (contracte v3, PAS 10).
//
// L'acadèmia és un PROVEÏDOR ALTERNATIU d'entrenables: en compte de comprar-ne un de 17 anys
// amb la creativitat feta, te'l fabriques. Per això la seua vara és la mateixa que la del
// mercat, i per això només compta el que s'entrena — creativitat, que és el producte, i
// passades, que és el rescat del que ja no arribarà.
//
// Un potencial enorme en qualsevol altra habilitat no mou res: no s'entrena, i per tant no
// arriba enlloc.
//
// TOT ACÍ ÉS PUR: els poms, les matrius i els factors arriben com a arguments. Qui els llig
// de la base és `orquestra_juvenil.js`.

// ── LA PROJECCIÓ ─────────────────────────────────────────────────────────────────────────
// Matxos per a pujar un nivell, interpolant per edat entre les files de la taula. Les claus
// són edats en «anys.dies» amb 112 dies l'any.
export function matxosPerNivell(taula, diesEdat, nivell, anyDies = 112) {
  if (!taula) return null;
  const files = Object.entries(taula)
    .map(([k, v]) => [Number(k.split('.')[0]) * anyDies + Number(k.split('.')[1] ?? 0), v])
    .sort((a, b) => a[0] - b[0]);
  if (!files.length) return null;
  const n = Math.min(Math.max(Math.trunc(nivell), 0), files[0][1].length - 1);
  if (diesEdat <= files[0][0]) return files[0][1][n];
  if (diesEdat >= files[files.length - 1][0]) return files[files.length - 1][1][n];
  for (let i = 0; i < files.length - 1; i++) {
    const [d0, v0] = files[i], [d1, v1] = files[i + 1];
    if (diesEdat >= d0 && diesEdat <= d1) {
      const t = (d1 === d0) ? 0 : (diesEdat - d0) / (d1 - d0);
      return v0[n] + t * (v1[n] - v0[n]);
    }
  }
  return null;
}

// On tindrà l'habilitat EL DIA QUE EL PUGES. Se simula setmana a setmana perquè el ritme
// canvia amb l'edat i amb el nivell: una projecció lineal donaria de més als joves.
//
// La data de promoció NO és una estimació — la promoció és automàtica el primer dia possible,
// o siga que `diesRestants` és l'horitzó exacte i el que tinga eixe dia és el que t'endús.
export function projecta(actual, { taula, diesEdat, diesRestants, sostre = null,
  factor = 1, divisor = 1, subNivell = 0.9, anyDies = 112 }) {
  if (actual == null || !taula || diesRestants == null) return null;
  let nivell = Math.trunc(actual);
  let progres = subNivell;                    // vore `sub_nivell_desconegut`
  let edat = diesEdat, queden = diesRestants;
  let guardia = 0;
  while (queden >= 7 && guardia++ < 500) {
    const m = matxosPerNivell(taula, edat, nivell, anyDies);
    if (!m) break;
    progres += factor / (m * divisor);
    if (progres >= 1) { nivell += 1; progres -= 1; }
    edat += 7; queden -= 7;
  }
  const val = nivell + progres;
  return sostre == null ? val : Math.min(val, sostre);
}

// ── ELS TALLS ────────────────────────────────────────────────────────────────────────────
// Un juvenil no entra a una plaça que entrene `h` si:
//   · el sostre conegut no arriba al llistó   → no hi arribarà mai
//   · la projecció no arriba al llistó        → no li dona temps
//   · està capat                              → no creix
//
// El capat es talla pels DOS costats. Per davall no servix; per damunt JA ÉS el producte i
// no ha de gastar una plaça d'entrenament.
//
// I DESCONEGUT NO TALLA. Sense proves no hi ha motiu: una habilitat sense revelar val el
// llistó mateix, o siga que ni descarta ni desplaça els que sabem que arriben.
export function avaluaHabilitat(j, h, opts) {
  const { llisto, taula, factor = 1, divisor = 1, subNivell = 0.9, anyDies = 112 } = opts;
  const actual = j[`${h}_actual`], sostre = j[`${h}_potencial`];
  const num = (v) => (typeof v === 'number' ? v : null);
  const a = num(actual), s = num(sostre);
  // El SOSTRE mana i es mira primer: si no arriba al llistó, no hi ha res a discutir, encara
  // que no sàpies on està ara. I això ja cobrix el capat per davall — un capat és algú el
  // sostre del qual és el seu actual.
  if (s != null && s < llisto) return { valor: s, talla: true, motiu: 'sostre_baix' };
  // CAPAT PER DAMUNT: l'únic capat que el sostre no arreplega. Ja és el producte, i per això
  // tampoc ha de gastar una plaça d'entrenament: no creix.
  if (a != null && s != null && a === s) return { valor: a, talla: true, motiu: 'capat_fet' };
  if (a == null) return { valor: llisto, talla: false, motiu: 'desconegut' };
  const p = projecta(a, { taula, diesEdat: j.dies_edat, diesRestants: j.dies_restants_promocio,
    sostre: s, factor, divisor, subNivell, anyDies });
  if (p == null) return { valor: llisto, talla: false, motiu: 'sense_taula' };
  return p < llisto
    ? { valor: p, talla: true, motiu: 'no_arriba' }
    : { valor: p, talla: false, motiu: 'arriba' };
}

// ── L'ORDE ───────────────────────────────────────────────────────────────────────────────
// Projecció DESC, i a igualtat el que MENYS temps li queda: fer-ho al revés seria descartar
// de facto els ajustats, que són justament els que la plaça encara pot salvar.
const cmp = (a, b) => (b.valor - a.valor)
  || (a.j.dies_restants_promocio - b.j.dies_restants_promocio)
  || ((b.estreles ?? -1) - (a.estreles ?? -1))
  || (a.j.jugador_id - b.j.jugador_id);

// La CUA: els que no han entrat en cap passada. Ni la creativitat ni les passades en diuen
// res, o siga que s'ordenen pel poc que se sap: la millor habilitat revelada.
const maxConegut = (j, habs) => habs.reduce((m, h) => {
  const v = [j[`${h}_actual`], j[`${h}_potencial`]].filter((x) => typeof x === 'number');
  return Math.max(m, ...(v.length ? v : [-1]));
}, -1);

// ── EL PLA ───────────────────────────────────────────────────────────────────────────────
// `places` és la formació disponible per bucket. `habilitatPlaça` diu quina habilitat entrena
// cada bucket al graó ple, i en quin orde s'omplin.
export function plaJuvenil(juvenils, opts) {
  const { passades = [], places = {}, habs = [], estreles = {}, minimEnCamp = 9 } = opts;

  // 0 · BLOQUEJATS. Un lesionat o sancionat no pot jugar: ni entrena, ni es revela, ni gasta
  // missatge de l'entrenador. No entra a cap tall — se n'ix abans de començar.
  const bloquejats = juvenils.filter((j) => j.bloquejat);
  let lliures = juvenils.filter((j) => !j.bloquejat);

  const assignats = new Map();          // jugador_id → bucket
  const motius = new Map();             // jugador_id → { habilitat, motiu, valor }
  const ocupades = new Map();           // bucket → quantes en van
  const perId = new Map(juvenils.map((j) => [j.jugador_id, j]));

  // 1 i 2 · UNA RUTINA, DUES PASSADES, en orde. Les places de creativitat estan RESERVADES:
  // primer tot el descobriment de creativitat i després entrenar passades.
  for (const passada of passades) {
    const cand = lliures
      .map((j) => ({ j, ...avaluaHabilitat(j, passada.habilitat, passada),
        estreles: estreles[j.jugador_id] ?? null }))
      .filter((x) => !x.talla)
      .sort(cmp);
    // Les places que una passada anterior ja ha ocupat NO es tornen a repartir: eixe és tot
    // el sentit de reservar els llocs de creativitat. Sense descomptar-les, la segona passada
    // s'apropiava dels mig centres.
    let i = 0;
    for (const bucket of passada.buckets) {
      const lliuresAcí = (places[bucket] ?? 0) - (ocupades.get(bucket) ?? 0);
      for (let k = 0; k < lliuresAcí && i < cand.length; k++, i++) {
        assignats.set(cand[i].j.jugador_id, bucket);
        ocupades.set(bucket, (ocupades.get(bucket) ?? 0) + 1);
        motius.set(cand[i].j.jugador_id,
          { habilitat: passada.habilitat, motiu: cand[i].motiu, valor: cand[i].valor });
      }
    }
    lliures = lliures.filter((j) => !assignats.has(j.jugador_id));
  }

  // 3 · LA CUA. Òmpli fins al mínim legal i la resta a la banqueta, que no gasta missatge.
  const cua = lliures
    .map((j) => ({ j, max: maxConegut(j, habs) }))
    .sort((a, b) => (b.max - a.max)
      || (a.j.dies_restants_promocio - b.j.dies_restants_promocio)
      || (a.j.jugador_id - b.j.jugador_id))
    .map((x) => x.j);

  // No cal comptar buckets ací: la cua va a places RESIDUALS (porteria i defensa), que en
  // sumen sis i sempre basten. El que mana és arribar als nou de l'alineació legal.
  const falten = Math.max(0, minimEnCamp - assignats.size);
  const camp = cua.slice(0, falten);
  for (const j of camp) assignats.set(j.jugador_id, 'residual');
  const banqueta = cua.slice(camp.length);

  return {
    bloquejats: bloquejats.map((j) => j.jugador_id),
    onze: [...assignats.entries()].map(([id, bucket]) => ({
      jugador_id: id, bucket, ...(motius.get(id) ?? { motiu: 'cua' }) })),
    banqueta: banqueta.map((j) => j.jugador_id),
    perId,
  };
}

// ── QUI SE'N VA ──────────────────────────────────────────────────────────────────────────
// L'orde invers del d'alinear, i NOMÉS els que passen de l'objectiu: sense jugadors no hi ha
// partit, i sense partit no hi ha ni entrenament ni missatges.
//
// EXCEPCIÓ: qui ja arriba al llistó de creativitat no se'n va mai. És el producte acabat —
// encara que estiga capat i el tall l'haja tret de les places d'entrenament.
export function sobrants(ordenats, objectiu, protegits = new Set()) {
  const sobra = ordenats.length - objectiu;
  if (sobra <= 0) return [];
  return [...ordenats].reverse()
    .filter((id) => !protegits.has(id))
    .slice(0, sobra);
}
