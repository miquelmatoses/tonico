// Tonico — ECONOMIA (contracte v3, PAS 3). Es calcula ABANS de qualsevol decisió de
// plantilla, perquè d'ací ixen les dues magnituds que ho governen tot:
//
//   FLUX  (ingressos recurrents − despeses fixes) → quin SOU pots sostindre
//                                                 → i d'ahí quin NIVELL a cada lloc (PAS 4)
//   ESTOC (caixa cobrada)                         → què pots comprar HUI (PAS 8)
//
// Res s'anticipa: la caixa és el saldo REAL declarat, mai un projectat. El v3 no projecta
// dins d'una decisió, per això ací no hi ha cap «objectiu de capital» ni trajectòria.
import { normalitzaDivisio } from './divisio.js';

const INGRESSOS = ['venda', 'ingres_patrocini', 'taquilla'];

// Signe segons el tipus (l'API guarda ja l'import signat amb esta funció).
export function signa(tipus, import_) {
  const abs = Math.abs(import_);
  if (INGRESSOS.includes(tipus)) return abs;
  if (tipus === 'altres') return import_;             // l'usuari en tria el signe
  return -abs;                                        // compra, sou, personal, estadi, taxa_llistat...
}

// sou_sostenible = MAX(0; flux + nòmina − reserva_flux). És «tot el que pots dedicar a
// sous sense entrar en pèrdues»: el flux ja porta la nòmina restada, així que se li torna
// a sumar per obtindre el sostre, i se'n lleva la reserva de risc.
export function souSostenible(flux, nomina, reservaFlux = 0) {
  if (flux == null || nomina == null) return null;
  return Math.max(0, flux + nomina - reservaFlux);
}

// flux_lliure = MAX(0; flux + cost_personal_actual − reserva_flux). El cost del personal
// que ja tens ja va restat dins del flux: si no se li torna a sumar, el bucle de personal
// es veu sense marge just per tindre el personal que està valorant. Simètric amb
// sou_sostenible, que fa el mateix amb la nòmina.
export function fluxLliure(flux, costPersonalActual, reservaFlux = 0) {
  if (flux == null) return null;
  return Math.max(0, flux + (costPersonalActual ?? 0) - reservaFlux);
}

// caixa_disponible = MAX(0; caixa − reserva_caixa). Sense caixa declarada NO hi ha estoc:
// torna null (i el sistema la demana), mai un zero que semble una decisió.
export function caixaDisponible(caixa, reservaCaixa = 0) {
  if (caixa == null) return null;
  return Math.max(0, caixa - reservaCaixa);
}

export async function economia(db, usuariId) {
  const fin = await db.prepare(
    `SELECT caixa, caixa_data, despesa_planter, despesa_estadi, ingres_setmanal,
            taquilla, patrocini, premis FROM finances WHERE usuari_id=?`
  ).bind(usuariId).first();

  // CAIXA: només la declarada. Abans requeia EN SILENCI a SUM(transaccions) i una xifra
  // derivada es feia passar per saldo real; el v3 ho prohibix (PAS 3).
  const caixa = fin?.caixa ?? null;

  // Nòmina setmanal: derivada dels sous de l'última instantània (mai declarada).
  const eq = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = eq ? await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(eq.id).first() : null;
  const nomina = inst ? (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM instantanies_jugadors WHERE instantania_id=?').bind(inst.id).first()).s : null;
  const personalSetmanal = (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM personal_membres WHERE usuari_id=?').bind(usuariId).first()).s;

  // INGRESSOS RECURRENTS = taquilla + patrocini + premis. Si encara no estan desglossats
  // però hi ha el total heretat declarat, s'usa eixe (és una dada de l'usuari, no una
  // invenció) i es marca perquè Paco en demane el desglossament.
  const trossos = [fin?.taquilla, fin?.patrocini, fin?.premis];
  const desglossats = trossos.some((v) => v != null);
  const ingressosRecurrents = desglossats
    ? trossos.reduce((a, v) => a + (v ?? 0), 0)
    : (fin?.ingres_setmanal ?? null);

  // DESPESES FIXES = nòmina + manteniment d'estadi + personal + planter.
  const despeses = {
    nomina: nomina ?? 0,
    planter: fin?.despesa_planter ?? 0,
    manteniment_estadi: fin?.despesa_estadi ?? 0,
    personal: personalSetmanal,
  };
  const despesesFixes = despeses.nomina + despeses.planter + despeses.manteniment_estadi + despeses.personal;
  const flux = ingressosRecurrents != null ? ingressosRecurrents - despesesFixes : null;

  // Poms de risc (política, no mecànica de joc): declarats, amb defecte 0.
  const config = await db.prepare('SELECT estrategia, divisio FROM config_usuari WHERE usuari_id=?').bind(usuariId).first();
  const estrategia = config?.estrategia ?? 'competitiva';
  const pom = async (clau) => {
    const f = await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first();
    return f?.valor != null ? parseInt(f.valor, 10) : 0;
  };
  const reservaFlux = await pom('reserva_flux');
  const reservaCaixa = await pom('reserva_caixa');

  return {
    caixa,
    caixa_data: fin?.caixa_data ?? null,
    caixa_disponible: caixaDisponible(caixa, reservaCaixa),
    ingressos_recurrents: ingressosRecurrents,
    ingressos_desglossats: desglossats,
    despeses,
    despeses_fixes: despesesFixes,
    flux,
    flux_negatiu: flux != null && flux < 0,   // la vista no compara: només tria classe
    nomina,
    sou_sostenible: souSostenible(flux, nomina, reservaFlux),
    flux_lliure: fluxLliure(flux, personalSetmanal, reservaFlux),
    reserva_flux: reservaFlux,
    reserva_caixa: reservaCaixa,
    divisio: normalitzaDivisio(config?.divisio),
    data_instantania: inst?.data ?? null,
  };
}
