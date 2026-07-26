// Tonico — integració de l'alineació amb la BD. Construïx la plantilla des de
// l'última instantània sènior (categoria, horitzó d'eixida, lesions, sancions) i
// crida el motor.
import { alineaOnzes } from './onze.js';
import { carregaConfigPesos, pesosFormacio } from './pesos.js';
import { esLesionat } from '../public/format.js';
import { entrenamentEfectiu, aplicaEntrenament } from './entrenament_places.js';
import { sqlCategoriaVigent } from './categoria_vigent.js';

// horitzo_eixida(j) (contracte v3, V): la temporada en què el jugador assolix
// `edat_pic_venda`. Substituïx el desempat per fornada (retirat amb el model fàbrica).
function horitzoEixida(f, edatPicVenda, anyDies, temporadaActual) {
  if (edatPicVenda == null || temporadaActual == null) return null;
  const edatD = (f.edat_anys ?? 0) * anyDies + (f.edat_dies ?? 0);
  const falten = edatPicVenda * anyDies - edatD;                 // dies fins al pic
  return temporadaActual + Math.max(0, Math.ceil(falten / anyDies));
}

async function carregaConfig(db, plantilla) {
  const get = async (clau) => JSON.parse((await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor || 'null');
  return { rols: await get('rols'), slots: await get('formacio'), buckets: await get('buckets_alineacio') };
}

export async function proposaAlineacio(db, usuariId, opts = {}) {
  const pla = await db.prepare('SELECT plantilla, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;
  const config = await carregaConfig(db, pla.plantilla);
  if (!config.slots) return null;
  // Les places d'entrenament de cada slot es DERIVEN de l'entrenament sènior triat
  // (guia §6): canviar-lo canvia quins buckets entrenen i a quin %, i tot el que en penja.
  const { places } = await entrenamentEfectiu(db, usuariId);
  config.slots = aplicaEntrenament(config.slots, places);

  // Tipus de setmana de partits (desat al pla): ab = A+B; un = només el competitiu;
  // copa = el competitiu és de copa (doble experiència per al futur entrenador).
  // Un opts.rols_actius explícit (override puntual des de l'API) mana per damunt.
  const params = pla.parametres ? JSON.parse(pla.parametres) : {};
  const competitiu = (config.rols || []).find((r) => r.competitiu)?.id || (config.rols || [])[0]?.id;
  if (opts.rols_actius == null) {
    if (params.tipus_setmana === 'un' || params.tipus_setmana === 'copa') opts = { ...opts, rols_actius: [competitiu] };
  }
  if (params.tipus_setmana === 'copa') opts = { ...opts, copa: true };

  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = await db.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return null;

  const susp = parseInt((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='suspensio_amonestacions'").bind(pla.plantilla).first())?.valor || '3', 10);

  const constant = async (clau, def) => parseInt((await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor ?? String(def), 10);
  const anyDies = await constant('any_dies', 112);
  const edatPicVenda = parseInt((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='edat_pic_venda'").bind(pla.plantilla).first())?.valor ?? '0', 10) || null;
  const instCal = await db.prepare('SELECT temporada FROM instantanies WHERE id=?').bind(inst.id).first();
  const refTemporada = instCal?.temporada ?? null;

  const { results: files } = await db.prepare(
    `SELECT ij.*, ij.jugador_id, j.nom, ij.posicio_ultim_partit AS posicio, c.categoria
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id=ij.jugador_id
       LEFT JOIN ${sqlCategoriaVigent(['categoria'])} c
              ON c.jugador_id = j.id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  // FORA L'APARADOR: l'única cosa que la venda aporta a l'alineació és que un
  // LLISTAT no juga. Estat únic: fitxa llistada O Transferible=1 de la instantània.
  const { results: llistats } = await db.prepare("SELECT jugador_id FROM vendes WHERE usuari_id=? AND estat='llistat'").bind(usuariId).all();
  const setLlistat = new Set(llistats.map((x) => x.jugador_id));

  // `...f` porta les HABILITATS: `valor(j, lloc) = hab(j, habilitat_lloc(lloc))` les
  // necessita. Sense elles el valor era 0 per a tots i l'ordenació requeia al desempat per
  // sou, així que el més barat —el pitjor— s'emportava cada lloc.
  const squad = files.map((f) => ({
    ...f,
    jugador_id: f.jugador_id, nom: f.nom, posicio: f.posicio, categoria: f.categoria,
    horitzo_eixida: horitzoEixida(f, edatPicVenda, anyDies, refTemporada),
    lesionat: esLesionat(f.lesio),
    sancionat: (f.amonestacions ?? 0) >= susp,   // el nom del full (F.47): `disponible` el busca així
    llistat: setLlistat.has(f.jugador_id) || f.transferible === 1,
  }));

  // PAS 9: els llocs porten el seu PES (del PAS 4) i l'habilitat que els jutja; l'onze es
  // munta greedy per pes. Cap excepció cablejada: tot ix de la config i de la guia.
  const cfgPesos = await carregaConfigPesos(db, pla.plantilla);
  const habPerBucket = cfgPesos.taula_habilitat_lloc || {};
  const pesPerBucket = pesosFormacio(
    [...new Set(config.slots.map((s) => s.bucket))],
    cfgPesos.posicio_aportacio, cfgPesos.taula_aportacio, cfgPesos.pes_sector,
  );
  const llocs = config.slots.map((s, i) => ({
    lloc: `${s.bucket}${i + 1}`, bucket: s.bucket, codi: s.codi ?? s.bucket,
    entrena: !!s.entrena, pct: s.pct ?? 100,
    habilitat: habPerBucket[s.bucket] ?? null,
    pes: pesPerBucket[s.bucket] ?? 0,
  }));
  const pesEntrenament = Number((await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='pes_entrenament'").bind(pla.plantilla).first())?.valor ?? 1000);
  const partits = (config.rols || []).filter((r) => !opts.rols_actius || opts.rols_actius.includes(r.id));
  const competitiuId = (config.rols || []).find((r) => r.competitiu)?.id ?? partits[0]?.id;

  const vetats = new Set(opts.vetats || []);
  const squadAmbVet = squad.map((j) => ({ ...j, vetat: vetats.has(j.jugador_id) }));
  const res = alineaOnzes(squadAmbVet, llocs, partits, {
    pes_entrenament: pesEntrenament,
    habilitat_porter: habPerBucket.porter ?? 'porteria',
    partit_lliga: competitiuId,
    vetats: opts.vetats || [],
    fixats: opts.fixats || {},
  });
  return {
    ...res,
    // El conjunt sobre el qual l'assignació maximitza: sense ell la propietat «cada lloc
    // s'emporta el millor disponible» no es pot comprovar des de fora.
    retinguts: squadAmbVet,
    rols: partits,
    copa: !!opts.copa,
    experiencia: squad.filter((j) => j.categoria === 'futur_entrenador')
      .map((j) => ({ jugador_id: j.jugador_id, nom: j.nom })),
    avisos: avisosOnze(res, squadAmbVet, llocs, partits.length < (config.rols || []).length),
  };
}

// Avisos del PAS 9: qui del nucli no completa la setmana i per què. Cap número ací: el
// llindar del 100% el fixa la suma dels pct dels llocs assignats.
function avisosOnze(res, squad, llocs, unaAlineacio = false) {
  const avisos = [];
  if (unaAlineacio) avisos.push({ tipus: 'una_alineacio' });
  const NUCLI = new Set(['core', 'rotatiu']);
  for (const j of squad.filter((x) => NUCLI.has(x.categoria))) {
    const c = res.comptabilitat.find((x) => x.jugador_id === j.jugador_id);
    if ((c?.total ?? 0) >= 100) continue;
    // En una setmana d'un sol partit, un lloc al 50% no pot arribar al 100%: no és culpa
    // de ningú i no es compta com a entrenament perdut.
    if (unaAlineacio && (c?.partits || []).some((x) => x.pct > 0 && x.pct < 100)) continue;
    const motiu = j.lesionat ? 'lesionat' : j.llistat ? 'llistat' : j.sancionat ? 'sancionat'
      : j.vetat ? 'vetat' : 'banqueta';
    avisos.push({ tipus: 'entrenament_perdut', jugador_id: j.jugador_id, nom: j.nom, motiu });
  }
  const entrenen = res.comptabilitat.filter((c) => c.total >= 100).length;
  const total = squad.filter((j) => NUCLI.has(j.categoria)).length;
  if (entrenen < total) avisos.push({ tipus: 'cobertura', entrenen, total });
  if (res.buits.length) avisos.push({ tipus: 'llocs_buits', n: res.buits.length });
  return avisos;
}
