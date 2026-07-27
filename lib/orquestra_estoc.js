// Tonico — ORQUESTRACIÓ DEL BUCLE D'ESTOC (contracte v3, PAS 8). Munta les opcions de
// compra —jugador per lloc amb mancança, i l'obra d'estadi— i les ordena per eficiència.
// Ací no hi ha política: tot ix de l'economia (PAS 3), dels pesos (PAS 4) i de la
// mancança (PAS 5). El motiu de cada opció es DERIVA, mai s'escriu a mà.
import { economia } from './economia.js';
import { carregaConfigPesos, nivellsObjectiu, pesosFormacio } from './pesos.js';
import { onzeEstructura } from './onze_estructura.js';
import { necessitats, ambPreus } from './fitxatges.js';
import { llegixConfig, llocsPartit } from './config.js';
import { entrenamentEfectiu, aplicaEntrenament } from './entrenament_places.js';
import { deltaManteniment, admissibleEstadi, estadiCaduc, decisioEstoc } from './estoc.js';

// Els llocs de la formació amb la seua habilitat (el pont amb el PAS 4).
export async function llocsAmbHabilitat(db, usuariId, estrategia, habPerBucket) {
  const f = await db.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='formacio'").bind(estrategia).first();
  if (!f?.valor) return null;
  const { places } = await entrenamentEfectiu(db, usuariId);
  return aplicaEntrenament(JSON.parse(f.valor), places).map((s, i) => ({
    lloc: `${s.bucket}${i + 1}`, bucket: s.bucket, entrena: !!s.entrena,
    pct: s.pct ?? 100, habilitat: habPerBucket[s.bucket] ?? null,
  }));
}

// L'estat del bucle d'estoc: què hi ha, què falta i què val la pena.
export async function estatEstoc(db, usuariId, hui = null) {
  const conf = await llegixConfig(db, usuariId);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const eco = await economia(db, usuariId, hui);
  const cfg = await carregaConfigPesos(db, estrategia);
  const llocs = await llocsAmbHabilitat(db, usuariId, estrategia, cfg.taula_habilitat_lloc || {});
  if (!llocs) return { falten: ['formacio'] };

  // PAS 4 + PAS 5: quin nivell sosté cada lloc i quant li falta al seu ocupant. Es consumix
  // `sou_sostenible_setmanal` perquè `taula_salaris` va en €/setmana; la conversió la fa
  // l'economia, una sola vegada (invariant 16).
  // La llista SENCERA (amb repeticions): el pressupost es reparteix entre els 11 llocs, no
  // entre els 5 tipus. Deduplicar ací era el bug que inflava tots els nivells objectiu.
  const nivells = nivellsObjectiu(llocs.map((l) => l.bucket), cfg, eco.sou_sostenible_setmanal);
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = equip ? await db.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first() : null;
  const { results: files } = inst ? await db.prepare(
    `SELECT j.id, j.nom, ij.edat_anys, ij.edat_dies, ij.sou, ij.experiencia, ij.lideratge,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id=ij.jugador_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all() : { results: [] };

  // QUI OCUPA CADA LLOC ix de l'ASSIGNACIÓ D'ESTRUCTURA, no de la classificació vella. Abans
  // s'agafava «el millor retingut de cada bucket», o siga que amb tres llocs de mig centre
  // només es mesurava el millor i MC2 i MC3 no existien per al sistema: la vara mesurava cinc
  // jugadors dels onze. Ara cada lloc porta el seu ocupant i la seua distància.
  const est = await onzeEstructura(db, usuariId, files, eco.sou_sostenible_setmanal);
  const pesos = pesosFormacio([...new Set(llocs.map((l) => l.bucket))],
    cfg.posicio_aportacio, cfg.taula_aportacio, cfg.pes_sector);
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const llista = necessitats(est, { entrenable_min: Number(await pom('entrenable_creativitat_min')), pesos });
  const { results: filesPreu } = await db.prepare('SELECT clau, preu, data FROM preus_referencia WHERE usuari_id=?').bind(usuariId).all();
  const prioritats = ambPreus(llista, new Map(filesPreu.map((f) => [f.clau, f])), eco.caixa,
    Number(await pom('setmanes_caducitat_preu')) || null, hui);

  // ── OPCIÓ ESTADI: VA PRIMER (v3.1). No competix per eficiència amb cap fitxatge, perquè és
  // l'única compra que mou el flux. Si els números de la calculadora són caducs, no es
  // recomana res: es demana tornar a la calculadora.
  const opcions = [];
  let estadi = null;
  if (eco.estadi_manteniment != null && eco.estadi_cost_obra != null) {
    const dMant = deltaManteniment(eco.manteniment_estadi, eco.estadi_manteniment);
    const caduc = estadiCaduc(eco.estadi_data, hui, eco.setmanes_caducitat_estadi);
    estadi = {
      tipus: 'estadi', delta_manteniment: dMant, cost: eco.estadi_cost_obra,
      guany: null, eficiencia: null,          // no es puntua: la prioritat no es negocia
      caduc,
      obra_en_curs: eco.estadi_obra_inici != null,
      obra_inici: eco.estadi_obra_inici ?? null,
      admissible: admissibleEstadi({ cost: eco.estadi_cost_obra, caixa: eco.caixa,
        flux: eco.flux, delta_manteniment: dMant, setmanes_periode: eco.setmanes_periode,
        reserva_flux: eco.reserva_flux, obra_en_curs: eco.estadi_obra_inici != null }),
      motiu: eco.estadi_obra_inici != null ? 'obra_en_curs' : 'prioritat_estadi',
    };
    opcions.push(estadi);
  }

  // ── OPCIÓ FITXATGE. El cost és el PREU DECLARAT del tipus de fitxatge: a Hattrick el preu no
  // el calcula el joc, i per tant Tonico no se l'inventa. SENSE PREU NO ES SUGGERIX MAI —
  // l'opció es veu, amb `falta: 'preu'`, però no és admissible i no pot arribar a recomanació.
  for (const p of prioritats) {
    opcions.push({
      tipus: 'jugador', clau: p.clau, bucket: p.bucket, nivell_objectiu: p.nivell,
      quants: p.quants, motiu: p.motiu, prioritat: p.prioritat,
      mancanca: p.mancanca ?? null, guany: p.prioritat === Infinity ? null : p.prioritat,
      cost: p.preu, preu_vell: p.preu_vell,
      eficiencia: p.preu ? Math.round((p.prioritat / p.preu) * 1e8) / 1e8 : null,
      admissible: p.admissible, falta: p.falta,
    });
  }

  return {
    caixa: eco.caixa,
    sou_sostenible: eco.sou_sostenible,
    sou_sostenible_setmanal: eco.sou_sostenible_setmanal,
    flux: eco.flux,
    divisio: eco.divisio,
    mancances: prioritats,
    onze: est?.onze ?? null,
    opcions,
    recomanada: decisioEstoc(opcions),
    estadi_declarat: estadi != null,
    estadi_caduc: estadi?.caduc ?? false,
    estadi_obra_inici: eco.estadi_obra_inici ?? null,
  };
}
