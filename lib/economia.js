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
// Res s'anticipa: la caixa és el saldo REAL declarat («Diners disponibles» de l'informe),
// mai un projectat. El v3 no projecta dins d'una decisió.
import { normalitzaDivisio } from './divisio.js';

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

// caixa_disponible = MAX(0; caixa − reserva_caixa). Sense caixa declarada NO hi ha estoc:
// torna null (i el sistema la demana), mai un zero que semble una decisió.
export function caixaDisponible(caixa, reservaCaixa = 0) {
  if (caixa == null) return null;
  return Math.max(0, caixa - reservaCaixa);
}

// despesa_planter: es DERIVA, no es declara (v3.1). Les instal·lacions es paguen si hi ha
// acadèmia; els cercapromeses van a banda i n'hi ha 1..3 en QUALSEVOL mode — el mode només
// diu si hi ha acadèmia i si es criden, no quants n'hi ha.
export function despesaPlanter(sistemaJuvenil, nCercapromeses, { cost_instalacions = 0, cost_cercapromeses = 0 } = {}) {
  const instal = sistemaJuvenil === 'academia' ? cost_instalacions : 0;
  return instal + cost_cercapromeses * (nCercapromeses ?? 0);
}

// dades_velles: passat `setmanes_avis_dades` sense declaració nova, es diu (invariant 18).
// Dada vella ≠ absent ≠ zero: si no hi ha període declarat, no és «vell», és que falta.
export function dadesVelles(periodeData, hui, setmanesAvis) {
  if (!periodeData || !hui || setmanesAvis == null) return false;
  const dies = (new Date(hui) - new Date(periodeData)) / 86400000;
  return Number.isFinite(dies) && dies > setmanesAvis * 7;
}

export async function economia(db, usuariId, hui = null) {
  const fin = await db.prepare(
    `SELECT caixa, caixa_data, despesa_estadi,
            taquilla_s1, patrocini_s1, taquilla_s2, patrocini_s2,
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
  const reservaCaixa = await pom('reserva_caixa', 0);
  const perP = (x) => perPeriode(x, setmanesPeriode);

  // Nòmina setmanal: derivada dels sous de l'última instantània (mai declarada).
  const eq = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = eq ? await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(eq.id).first() : null;
  const nomina = inst ? (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM instantanies_jugadors WHERE instantania_id=?').bind(inst.id).first()).s : null;
  const personalSetmanal = (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM personal_membres WHERE usuari_id=?').bind(usuariId).first()).s;

  // INGRESSOS RECURRENTS = la suma de les DOS setmanes del període. NOMÉS taquilla i
  // patrocinadors: club d'aficionats, comissions i vendes són PUNTUALS i no entren al flux
  // (no s'extrapolen i marejarien el sostre de sou).
  // Sense res declarat NO hi ha flux, i es diu, en compte de fabricar un 0.
  const setmanes = [
    { taquilla: fin?.taquilla_s1 ?? null, patrocini: fin?.patrocini_s1 ?? null },
    { taquilla: fin?.taquilla_s2 ?? null, patrocini: fin?.patrocini_s2 ?? null },
  ];
  const declarat = setmanes.flatMap((x) => [x.taquilla, x.patrocini]).some((v) => v != null);
  const ingressosRecurrents = declarat
    ? setmanes.reduce((a, x) => a + (x.taquilla ?? 0) + (x.patrocini ?? 0), 0)
    : null;

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
    caixa,
    caixa_data: fin?.caixa_data ?? null,
    caixa_disponible: caixaDisponible(caixa, reservaCaixa),
    setmanes_periode: setmanesPeriode,
    // La frescor la data `caixa_data`, que ja s'omplia sola en desar: un camp menys per demanar.
    dades_velles: dadesVelles(fin?.caixa_data, hui, await pom('setmanes_avis_dades', 1)),
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
    reserva_caixa: reservaCaixa,
    manteniment_estadi: mantenimentSetmanal,
    estadi_manteniment: fin?.estadi_manteniment ?? null,
    estadi_cost_obra: fin?.estadi_cost_obra ?? null,
    estadi_data: fin?.estadi_data ?? null,
    setmanes_caducitat_estadi: setmanesCaducitatEstadi,
    estadi_caduc: dadesVelles(fin?.estadi_data, hui, setmanesCaducitatEstadi),
    divisio: normalitzaDivisio(config?.divisio),
    data_instantania: inst?.data ?? null,
  };
}
