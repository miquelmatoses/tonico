// Tonico — ORQUESTRACIÓ DEL BUCLE D'ESTOC (contracte v3, PAS 8). Munta les opcions de
// compra —jugador per lloc amb mancança, i l'obra d'estadi— i les ordena per eficiència.
// Ací no hi ha política: tot ix de l'economia (PAS 3), dels pesos (PAS 4) i de la
// mancança (PAS 5). El motiu de cada opció es DERIVA, mai s'escriu a mà.
import { economia } from './economia.js';
import { carregaConfigPesos, nivellsObjectiu } from './pesos.js';
import { onzeEstructura } from './onze_estructura.js';
import { necessitats, ambPreus } from './fitxatges.js';
import { llegixConfig } from './config.js';
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
//
// `prev` és el que el cridador JA TÉ calculat (l'economia i l'assignació d'estructura). Les
// dues són cares —l'economia recorre les setmanes declarades i l'assignació munta l'onze
// sencer amb la velocitat d'entrenament de cada jove— i el motor d'alertes les calculava dues
// voltes per revisió: una per al seu context i una altra ací dins. Passar-les no canvia cap
// resultat, només deixa de repetir el mateix.
export async function estatEstoc(db, usuariId, hui = null, prev = {}) {
  const conf = await llegixConfig(db, usuariId);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const eco = prev.eco ?? await economia(db, usuariId, hui);
  const cfg = await carregaConfigPesos(db, estrategia);
  const llocs = await llocsAmbHabilitat(db, usuariId, estrategia, cfg.taula_habilitat_lloc || {});
  if (!llocs) return { falten: ['formacio'] };

  // PAS 4 + PAS 5: quin nivell sosté cada lloc i quant li falta al seu ocupant. Es consumix
  // `sou_sostenible_setmanal` perquè `taula_salaris` va en €/setmana; la conversió la fa
  // l'economia, una sola vegada (invariant 16).
  // La llista SENCERA (amb repeticions): el pressupost es reparteix entre els 11 llocs, no
  // entre els 5 tipus. Deduplicar ací era el bug que inflava tots els nivells objectiu.
  const nivells = nivellsObjectiu(llocs.map((l) => l.bucket), cfg, eco.sou_sostenible_setmanal);
  const equip = prev.est ? null : await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
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
  const est = prev.est ?? await onzeEstructura(db, usuariId, files, eco.sou_sostenible_setmanal, eco.calibrat);
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const llista = necessitats(est, { entrenable_min: Number(await pom('entrenable_creativitat_min')) });
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

  // ── OPCIÓ FITXATGE. ACÍ NOMÉS HI HA EL QUE ET POTS PERMETRE.
  //
  // Sense preu declarat NO ET POTS PERMETRE res, per definició: si no saps què costa, no saps
  // si el pots pagar. Eixes necessitats es veuen a «què falta fitxar», amb la casella per a
  // apuntar el número; ací no pinten res.
  //
  // I UNA LÍNIA PER FITXATGE, no per tipus. A «què falta fitxar» agrupar està bé —dos extrems
  // amb les mateixes condicions costen el mateix i es busquen igual—, però ací el que decidix
  // és la CAIXA, i pots tindre pressupost per a un extrem i no per a dos. Cada línia porta el
  // que hauràs gastat amb ella i les de damunt comprades, i la primera que no cap talla la
  // resta d'eixe tipus.
  for (const p of prioritats) {
    if (p.preu == null || eco.caixa == null) continue;
    for (let i = 1; i <= (p.quants ?? 1); i++) {
      const acumulat = p.preu * i;
      if (acumulat > eco.caixa) break;
      opcions.push({
        tipus: 'jugador', clau: p.clau, bucket: p.bucket, perfil: p.perfil, nivell: p.nivell,
        ordinal: i, de: p.quants ?? 1, varis: (p.quants ?? 1) > 1, motiu: p.motiu, prioritat: p.distancia,
        falten: p.distancia === Infinity ? null : p.distancia,
        guany: p.distancia === Infinity ? null : p.distancia,
        cost: p.preu, acumulat, preu_vell: p.preu_vell,
        eficiencia: Math.round((p.distancia / p.preu) * 1e8) / 1e8,
        admissible: true, falta: null,
      });
    }
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
