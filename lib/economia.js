// Tonico — ECONOMIA (contracte v3.1, PAS 3). Es calcula ABANS de qualsevol decisió de
// plantilla, perquè d'ací ixen les dues magnituds que ho governen tot:
//
//   FLUX  (ingressos recurrents − despeses fixes) → quin SOU pots sostindre
//                                                 → i d'ahí quin NIVELL a cada lloc (PAS 4)
//   ESTOC (caixa cobrada)                         → què pots comprar HUI (PAS 8)
//
// EL PERÍODE ÉS BI-SETMANAL. En lliga es juga un partit a casa i un fora, així que la taquilla
// entra en setmanes ALTERNES: al fixture real de Benifotrem, 0 € una setmana i 21.127 € l'altra
// sobre un flux net de milers. Un flux calculat sobre una setmana oscil·la més que el propi flux.
//
// ES DECLAREN LES DOS SETMANES, literals (ordre de Miquel): taquilla i patrocinadors de la
// setmana passada i d'esta. Els ingressos del període són la SUMA de les quatre xifres, i així
// no hi ha cap multiplicació per 2 al camí dels ingressos que es puga esmunyir. Les despeses sí
// que són constants setmanals i es normalitzen amb `per_periode` (invariant 16); l'ÚNIC pas de
// tornada a unitats setmanals és el PAS 4, on es compara amb `taula_salaris`.
//
// DE L'INFORME NOMÉS ES DECLAREN QUATRE COSES: taquilla, patrocinadors, diners disponibles i
// manteniment d'estadi. Res més. La nòmina ve del CSV, el personal de les seues fitxes i el
// planter es deriva.
//
// La taquilla i el patrocini van a l'HISTÒRIC PER SETMANA (`setmanes_economiques`) i els
// ingressos ixen de la MITJANA de les últimes `setmanes_mitjana`. La caixa i el manteniment són
// estat actual i viuen a `finances`: un saldo vell no decidix res.
//
// Res s'anticipa: la caixa és el saldo REAL declarat («Diners disponibles» de l'informe),
// mai un projectat. El v3 no projecta dins d'una decisió.
import { normalitzaDivisio } from './divisio.js';
import { fCalendari } from './calendari.js';

// per_periode(x): tot import SETMANAL passa a la unitat del període. Sense això el model es
// menjaria un factor 2 en silenci, i sobre un flux net de milers un manteniment de 7.100 €
// mal normalitzat és un error més gran que el resultat.
export function perPeriode(x, setmanesPeriode) {
  if (x == null || setmanesPeriode == null) return null;
  return x * setmanesPeriode;
}

// reserva_flux = `reserva_flux_pct` × ingressos_recurrents. És una FRACCIÓ, no un import
// (v3.1): les despeses recurrents no poden passar del (1 − pct) dels ingressos.
export function reservaFlux(ingressosRecurrents, pct) {
  if (ingressosRecurrents == null || pct == null) return null;
  return Math.round(ingressosRecurrents * pct);
}

// sou_sostenible = MAX(0; ingressos − reserva − (despeses_fixes − nòmina)). És «tot el que
// pots dedicar a sous sense passar del (1 − pct) dels ingressos»: la nòmina ja va dins de
// les despeses fixes, així que se'n lleva per a obtindre el sostre. Tot en unitats del
// PERÍODE; el PAS 4 el torna a setmanal.
export function souSostenible(ingressosRecurrents, despesesFixes, nominaPeriode, reserva) {
  if (ingressosRecurrents == null || despesesFixes == null || nominaPeriode == null
    || reserva == null) return null;
  return Math.max(0, ingressosRecurrents - reserva - (despesesFixes - nominaPeriode));
}

// flux_lliure = MAX(0; flux + personal_del_període − reserva_flux). El cost del personal que
// ja tens ja va restat dins del flux: si no se li torna a sumar, el bucle es veu sense marge
// just per tindre el personal que està valorant. Simètric amb sou_sostenible.
export function fluxLliure(flux, personalPeriode, reserva) {
  if (flux == null || reserva == null) return null;
  return Math.max(0, flux + (personalPeriode ?? 0) - reserva);
}

// NO hi ha `caixa_disponible` ni `reserva_caixa`. La reserva d'ESTOC no s'ha usat mai (0 per
// defecte i ningú la posava), i una derivada que sempre val igual que la seua entrada és un
// concepte de més: el PAS 8 compara contra la `caixa` declarada, i punt. La reserva de FLUX
// (5%) sí que es queda, que eixa fa feina.

// despesa_planter: es DERIVA, no es declara (v3.1). Les instal·lacions es paguen si hi ha
// acadèmia; els cercapromeses van a banda i n'hi ha 1..3 en QUALSEVOL mode — el mode només
// diu si hi ha acadèmia i si es criden, no quants n'hi ha.
export function despesaPlanter(sistemaJuvenil, nCercapromeses, { cost_instalacions = 0, cost_cercapromeses = 0 } = {}) {
  const instal = sistemaJuvenil === 'academia' ? cost_instalacions : 0;
  return instal + cost_cercapromeses * (nCercapromeses ?? 0);
}

// mitjana_setmanal: la MITJANA de les últimes `setmanes_mitjana` setmanes declarades. La
// taquilla oscil·la desenes de milers entre setmanes mentre el flux net va en milers, així que
// una sola lectura és soroll. Fer la mitjana d'OBSERVACIONS és estimar (val); extrapolar-ne un
// creixement seria projectar, i això l'invariant 3 ho prohibix.
//
// Sense cap setmana declarada torna null: no es fabrica un zero.
export function mitjanaSetmanal(setmanes, quantes) {
  const mostra = (setmanes || []).slice(0, quantes);
  if (!mostra.length) return null;
  const suma = mostra.reduce((a, s) => a + (s.taquilla ?? 0) + (s.patrocini ?? 0), 0);
  return suma / mostra.length;
}

// calibrat: hi ha prou setmanes per a dir el número amb cara i ulls. Mentre no, el sistema HO
// DIU i el PAS 7 no proposa desfer-se de ningú pel sou (que és l'únic motiu que penja del flux).
export function calibrat(setmanes, quantes) {
  return (setmanes || []).length >= quantes;
}

// dades_velles: passats `dies_avis_dades` sense declaració nova, es diu (invariant 18).
// Dada vella ≠ absent ≠ zero: si no hi ha res declarat, no és «vell», és que falta.
//
// `hui` ha de ser el dia DE VERES, no la data de l'última instantània. Amb la data de la
// instantània, si Miquel deixa de pujar CSV la comparació es congela (dada vella contra
// rellotge vell) i l'avís no salta MAI — que és justament quan més falta fa.
export function dadesVelles(dataDeclaracio, hui, diesAvis) {
  if (!dataDeclaracio || !hui || diesAvis == null) return false;
  const dies = (new Date(hui) - new Date(dataDeclaracio)) / 86400000;
  return Number.isFinite(dies) && dies > diesAvis;
}

// LA UNITAT DE CADA XIFRA, DECLARADA. Mateix criteri que `diners` i `compte` a les alertes: la
// vista no pot endevinar en quina unitat va un número, així que qui el calcula ho diu. Sense
// això una etiqueta pot mentir i ningú se n'entera — va passar: la targeta deia «Flux setmanal»
// damunt d'una xifra de dues setmanes des que el model va passar a bi-setmanal.
//   periode = el que declares del període (2 setmanes) · setmana = constant setmanal
//   estoc   = un saldo, no un cabal: no té periodicitat
export const UNITATS = {
  caixa: 'estoc',
  ingressos_recurrents: 'periode', despeses_fixes: 'periode', flux: 'periode',
  reserva_flux: 'periode', sou_sostenible: 'periode', flux_lliure: 'periode',
  'despeses.nomina': 'periode', 'despeses.planter': 'periode',
  'despeses.manteniment_estadi': 'periode', 'despeses.personal': 'periode',
  sou_sostenible_setmanal: 'setmana', nomina: 'setmana', planter_derivat: 'setmana',
  manteniment_estadi: 'setmana', estadi_manteniment: 'setmana',
  estadi_cost_obra: 'estoc',
};

export async function economia(db, usuariId, hui = null) {
  const fin = await db.prepare(
    `SELECT caixa, caixa_data, despesa_estadi,
            estadi_manteniment, estadi_cost_obra, estadi_data FROM finances WHERE usuari_id=?`
  ).bind(usuariId).first();

  // CAIXA: només la declarada. Abans requeia EN SILENCI a SUM(transaccions) i una xifra
  // derivada es feia passar per saldo real; el v3 ho prohibix (PAS 3).
  const caixa = fin?.caixa ?? null;

  const config = await db.prepare(
    'SELECT estrategia, divisio, sistema_juvenil, n_cercapromeses FROM config_usuari WHERE usuari_id=?'
  ).bind(usuariId).first();
  const estrategia = config?.estrategia ?? 'competitiva';
  const pom = async (clau, defecte = 0) => {
    const f = await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first();
    return f?.valor != null ? Number(f.valor) : defecte;
  };
  const setmanesPeriode = (await pom('setmanes_periode', 2)) || 2;
  const setmanesCaducitatEstadi = (await pom('setmanes_caducitat_estadi', 0)) || null;
  const pct = await pom('reserva_flux_pct', 0);
  const perP = (x) => perPeriode(x, setmanesPeriode);

  // Nòmina setmanal: derivada dels sous de l'última instantània (mai declarada).
  const eq = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = eq ? await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(eq.id).first() : null;
  const nomina = inst ? (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM instantanies_jugadors WHERE instantania_id=?').bind(inst.id).first()).s : null;
  const personalSetmanal = (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM personal_membres WHERE usuari_id=?').bind(usuariId).first()).s;

  // INGRESSOS RECURRENTS = mitjana_setmanal × setmanes_periode. La mitjana va sobre l'HISTÒRIC
  // per setmana: NOMÉS taquilla i patrocinadors (club d'aficionats, comissions i vendes són
  // puntuals i no s'extrapolen). Sense res declarat NO hi ha flux, i es diu.
  const { results: setmanes } = await db.prepare(
    `SELECT temporada, setmana, taquilla, patrocini, data FROM setmanes_economiques
      WHERE usuari_id=? ORDER BY temporada DESC, setmana DESC`
  ).bind(usuariId).all();
  const nMitjana = (await pom('setmanes_mitjana', 8)) || 8;
  const mitjana = mitjanaSetmanal(setmanes, nMitjana);
  const esCalibrat = calibrat(setmanes, nMitjana);
  const ingressosRecurrents = mitjana == null ? null : Math.round(mitjana * setmanesPeriode);

  // DESPESES FIXES = per_periode(nòmina + manteniment_estadi + personal + planter). El
  // planter es DERIVA; el manteniment es declara i és constant fins a la remodelació.
  const planterSetmanal = despesaPlanter(config?.sistema_juvenil, config?.n_cercapromeses, {
    cost_instalacions: await pom('cost_instalacions_juvenils', 0),
    cost_cercapromeses: await pom('cost_cercapromeses', 0),
  });
  const mantenimentSetmanal = fin?.despesa_estadi ?? 0;
  const despeses = {
    nomina: perP(nomina ?? 0),
    planter: perP(planterSetmanal),
    manteniment_estadi: perP(mantenimentSetmanal),
    personal: perP(personalSetmanal),
  };
  const despesesFixes = despeses.nomina + despeses.planter + despeses.manteniment_estadi + despeses.personal;
  const flux = ingressosRecurrents != null ? ingressosRecurrents - despesesFixes : null;
  const reserva = reservaFlux(ingressosRecurrents, pct);
  const sostenible = souSostenible(ingressosRecurrents, despesesFixes, despeses.nomina, reserva);

  return {
    unitats: UNITATS,
    caixa,
    caixa_data: fin?.caixa_data ?? null,
    setmanes_periode: setmanesPeriode,
    setmanes,                                  // l'històric, el més recent primer
    setmanes_declarades: setmanes.length,
    setmanes_mitjana: nMitjana,
    mitjana_setmanal: mitjana,
    calibrat: esCalibrat,
    // La frescor la data `caixa_data`, que es reposa a CADA desada: un camp menys per demanar.
    dies_avis_dades: await pom('dies_avis_dades', 7),
    dades_velles: dadesVelles(fin?.caixa_data, hui, await pom('dies_avis_dades', 7)),
    setmanes,
    ingressos_recurrents: ingressosRecurrents,
    despeses,
    despeses_fixes: despesesFixes,
    flux,
    flux_negatiu: flux != null && flux < 0,   // la vista no compara: només tria classe
    nomina,
    planter_derivat: planterSetmanal,
    sou_sostenible: sostenible,
    // L'ÚNIC canvi d'unitat del sistema (invariant 16), i es fa ACÍ i no a cada orquestrador:
    // `taula_salaris` va en €/setmana i el PAS 4 s'hi compara. Dos llocs fent la divisió és
    // com tenir dos fonts per a la mateixa xifra.
    sou_sostenible_setmanal: sostenible == null ? null : sostenible / setmanesPeriode,
    flux_lliure: fluxLliure(flux, despeses.personal, reserva),
    reserva_flux: reserva,
    reserva_flux_pct: pct,
    manteniment_estadi: mantenimentSetmanal,
    estadi_manteniment: fin?.estadi_manteniment ?? null,
    estadi_cost_obra: fin?.estadi_cost_obra ?? null,
    estadi_data: fin?.estadi_data ?? null,
    setmanes_caducitat_estadi: setmanesCaducitatEstadi,
    estadi_caduc: dadesVelles(fin?.estadi_data, hui, setmanesCaducitatEstadi == null ? null : setmanesCaducitatEstadi * 7),
    divisio: normalitzaDivisio(config?.divisio),
    data_instantania: inst?.data ?? null,
  };
}
