// Tonico — el PAS 10 contra la BD. Llig els poms i les taules, monta el pla i el torna.
//
// Ací no hi ha política: els llistons, les matrius, els factors i la formació són dades
// declarades. L'única cosa que decidix este fitxer és l'ORDE de les passades —primer
// creativitat, després passades— i això també ho diu el full.
import { plaJuvenil, sobrants, avaluaHabilitat } from './juvenil_pla.js';
import { entrenamentJuvenil } from './entrenament_places.js';
import { esLesionat } from '../public/format.js';

const HABS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];

const json = (v, def) => { try { return v ? JSON.parse(v) : def; } catch { return def; } };

// ── L'ÚNICA FRONTERA ENTRE LA BD I L'AVALUADOR ───────────────────────────────────────────
// Les habilitats juvenils viuen en columnes TEXT a posta: tenen TRES estats i cada un vol dir
// una cosa distinta —absent (no revelat), «desconegut» (revelat sense valor) i el número—, o
// siga que el 5 arriba com a «5» des del CSV i com a «5.0» des de SQLite, que té afinitat TEXT.
//
// L'avaluador comprova `typeof === 'number'`. Sense esta conversió, CAP habilitat passava eixa
// prova: tot juvenil entrava pel camí del desconegut, valia el llistó per conveni i el pla es
// reduïa a ordenar per dies fins a la promoció. Tot el PAS 10 —el sostre, el capat, la
// projecció setmana a setmana— estava escrit i provat, i no s'executava mai.
//
// Es converteix ACÍ i només ací: l'avaluador es queda pur i tipat, i la vista continua veient
// els tres estats, que és el que ha de pintar.
const nombre = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;     // '' i null: no revelat
  const n = Number(v);
  return Number.isFinite(n) ? n : null;                          // 'desconegut': sense valor
};

const habilitatsNumeriques = (f) => Object.fromEntries(HABS.flatMap((h) => [
  [`${h}_actual`, nombre(f[`${h}_actual`])],
  [`${h}_potencial`, nombre(f[`${h}_potencial`])]]));

export async function configJuvenil(db, plantilla) {
  const cj = async (clau) => (await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor ?? null;
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor ?? null;
  // LA PRESCRIPCIÓ DE L'ACADÈMIA, no la del primer equip: són dos entrenaments distints.
  const pres = await entrenamentJuvenil(db, plantilla);
  return {
    anyDies: Number(await cj('any_dies')) || 112,
    subNivell: Number(await cj('sub_nivell_desconegut')),
    divisorSecundari: Number(await cj('entrenament_juvenil_secundari_divisor')) || 1,
    factors: json(await cj('entrenament_juvenil_factors'), null),
    taulaEntrenament: json(await cj('taula_entrenament'), {}),
    taulaBaix: json(await cj('taula_entrenament_baix'), {}),
    minimEnCamp: Number(await cj('minim_jugadors')) || 9,
    velocitat: {
      [pres?.principal]: json(await cj(`velocitat_juvenil_${pres?.principal}`), null),
      [pres?.secundari]: json(await cj(`velocitat_juvenil_${pres?.secundari}`), null),
    },
    maxims: json(await cj('maxims_posicio'), {}),
    // L'ORDE per a omplir el que no és plaça d'entrenament: porter, defenses, davanters.
    residuals: json(await cj('orde_alineacio_residual'), []),
    objectiu: Number(await pom('juvenil_objectiu')) || null,
    amonestacionsSuspensio: Number(await pom('amonestacions_suspensio')) || null,
    llistons: {
      [pres?.principal]: Number(await pom('entrenable_creativitat_min')),
      [pres?.secundari]: Number(await pom('juvenil_passades_min')),
    },
    principal: pres?.principal ?? null,
    secundaria: pres?.secundari ?? null,
  };
}

// Les PASSADES del PAS 10, en orde. Cada una diu quina habilitat entrena, amb quin llistó, i
// quins buckets se n'emporta — de més factor a menys.
//
// Les places de la primera passada estan RESERVADES: la segona no les toca, perquè és
// prioritari fer tot el descobriment de creativitat abans que entrenar passades.
function passadesDe(cfg) {
  const capacitat = (b) => cfg.maxims[b] ?? 0;
  // De més factor a menys: primer els buckets de graó ple, després els de graó baix. Amb
  // creativitat això dona [mc, extrem]; amb passades, [mc, extrem, davanter] — però els dos
  // primers ja estaran ocupats per la passada anterior.
  const buckets = (hab) => [...(cfg.taulaEntrenament[hab] ?? []), ...(cfg.taulaBaix[hab] ?? [])]
    .filter((b) => capacitat(b) > 0);
  const passada = (hab, esSecundaria) => cfg.velocitat[hab] && cfg.llistons[hab] ? {
    habilitat: hab, llisto: cfg.llistons[hab], taula: cfg.velocitat[hab],
    subNivell: cfg.subNivell, anyDies: cfg.anyDies,
    divisor: esSecundaria ? cfg.divisorSecundari : 1,
    // El factor de la projecció és el de la MILLOR plaça que pot ocupar: es projecta el que
    // tindrà si el poses on li toca, no si el deixes a la banqueta.
    factor: cfg.factors?.ple ?? 1,
    buckets: buckets(hab),
  } : null;
  return [passada(cfg.principal, false), passada(cfg.secundaria, true)].filter(Boolean);
}

export async function plaJuvenilComplet(db, usuariId, files, plantilla) {
  const cfg = await configJuvenil(db, plantilla);
  if (!cfg.principal) return null;

  const juvenils = files.map((f) => ({
    ...f,
    ...habilitatsNumeriques(f),
    jugador_id: f.jugador_id,
    dies_edat: (f.edat_anys ?? 0) * cfg.anyDies + (f.edat_dies ?? 0),
    // BLOQUEJAT: lesionat o sancionat. No pot jugar, o siga que no entra a cap tall.
    //
    // Ací hi havia `!!f.expulsat`, i `expulsat` NO EXISTIX: ni a l'esquema, ni a l'adaptador,
    // ni enlloc. La condició no s'ha executat mai. La roja i la groga van a la MATEIXA columna
    // del CSV —`Amonestacions`— i una roja s'escriu com un 3, el mateix que tres grogues; o
    // siga que «té roja» i el llindar de sanció són el mateix número.
    bloquejat: esLesionat(f.lesio)
      || (cfg.amonestacionsSuspensio != null && (f.amonestacions ?? 0) >= cfg.amonestacionsSuspensio),
  }));

  // LA CAPACITAT ÉS LA DEL JOC, no una formació escrita. `formacio_juvenil` era una decisió
  // congelada com a configuració: declarava un sol davanter quan el joc en permet tres, i
  // deixava l'alineador sense poder proposar el repartiment bo. L'única regla de veres és
  // «un porter i huit de camp», i dins d'això manen els màxims per posició.
  const places = { ...cfg.maxims };

  const estreles = Object.fromEntries(files
    .filter((f) => f.qualificacio_ultim_partit != null)
    .map((f) => [f.jugador_id, f.qualificacio_ultim_partit]));

  const pla = plaJuvenil(juvenils, {
    passades: passadesDe(cfg), places, habs: HABS, estreles, minimEnCamp: cfg.minimEnCamp,
    residuals: cfg.residuals,
  });

  // L'ORDE per a fer fora és el mateix que per a alinear, i qui ja arriba al llistó de
  // creativitat no se'n va mai: és el producte acabat.
  const ordenats = [...pla.onze.map((l) => l.jugador_id), ...pla.banqueta, ...pla.bloquejats];
  //
  // I protegit vol dir que SE SAP que hi arriba, no que no se sàpiga el contrari. Un juvenil
  // amb la creativitat sense revelar val el llistó per conveni (`desconegut` no talla), i
  // comparant només el número quedaven tots blindats: amb dotze juvenils i objectiu deu, no
  // en sobrava cap. Els motius que compten són «arriba» i «capat_fet».
  const arriba = new Set(['arriba', 'capat_fet']);
  const protegits = new Set(juvenils
    .filter((j) => {
      const a = avaluaHabilitat(j, cfg.principal, {
        llisto: cfg.llistons[cfg.principal], taula: cfg.velocitat[cfg.principal],
        subNivell: cfg.subNivell, anyDies: cfg.anyDies });
      return arriba.has(a.motiu) && a.valor >= cfg.llistons[cfg.principal];
    })
    .map((j) => j.jugador_id));

  return {
    ...pla,
    principal: cfg.principal, secundaria: cfg.secundaria, llistons: cfg.llistons,
    objectiu: cfg.objectiu,
    despatxa: cfg.objectiu ? sobrants(ordenats, cfg.objectiu, protegits) : [],
    // PROMOCIÓ: no és una decisió. Es promociona el primer dia possible.
    promocionables: juvenils.filter((j) => (j.dies_restants_promocio ?? 1) <= 0).map((j) => j.jugador_id),
  };
}
