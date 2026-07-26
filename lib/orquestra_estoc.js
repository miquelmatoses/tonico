// Tonico — ORQUESTRACIÓ DEL BUCLE D'ESTOC (contracte v3, PAS 8). Munta les opcions de
// compra —jugador per lloc amb mancança, i l'obra d'estadi— i les ordena per eficiència.
// Ací no hi ha política: tot ix de l'economia (PAS 3), dels pesos (PAS 4) i de la
// mancança (PAS 5). El motiu de cada opció es DERIVA, mai s'escriu a mà.
import { economia } from './economia.js';
import { carregaConfigPesos, nivellsObjectiu } from './pesos.js';
import { mancances, perPrioritat } from './mancanca.js';
import { llegixConfig, llocsPartit } from './config.js';
import { entrenamentEfectiu, aplicaEntrenament } from './entrenament_places.js';
import { construeixPlantilla } from './plantilla.js';
import { guanyJugador, deltaManteniment, admissibleEstadi, estadiCaduc, eficiencia, decisioEstoc } from './estoc.js';
import { sqlCategoriaVigent } from './categoria_vigent.js';

// Els llocs de la formació amb la seua habilitat (el pont amb el PAS 4).
async function llocsAmbHabilitat(db, usuariId, estrategia, habPerBucket) {
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
  const nivells = nivellsObjectiu([...new Set(llocs.map((l) => l.bucket))], cfg, eco.sou_sostenible_setmanal);
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = equip ? await db.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first() : null;
  const { results: files } = inst ? await db.prepare(
    `SELECT ij.jugador_id, j.nom, ij.*, c.categoria FROM instantanies_jugadors ij
       JOIN jugadors j ON j.id=ij.jugador_id
       LEFT JOIN ${sqlCategoriaVigent(['categoria'])} c
              ON c.jugador_id = ij.jugador_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all() : { results: [] };

  // Qui ocupa cada bucket: el millor dels retinguts d'eixa habilitat (el PAS 6 ja els ha
  // triat; ací només es mira qui hi ha per a mesurar la mancança).
  const RETINGUTS = new Set(['core', 'rotatiu', 'titular', 'porter', 'cos']);
  const ocupants = {};
  for (const [bucket, n] of Object.entries(nivells)) {
    const seus = files.filter((f) => RETINGUTS.has(f.categoria) && Number(f[n.habilitat] ?? 0) > 0);
    ocupants[bucket] = seus.sort((a, b) => Number(b[n.habilitat] ?? 0) - Number(a[n.habilitat] ?? 0))[0] ?? null;
  }
  const manc = mancances(nivells, ocupants);
  const prioritats = perPrioritat(manc);

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
      admissible: admissibleEstadi({ cost: eco.estadi_cost_obra, caixa: eco.caixa,
        flux: eco.flux, delta_manteniment: dMant, setmanes_periode: eco.setmanes_periode,
        reserva_flux: eco.reserva_flux }),
      motiu: 'prioritat_estadi',
    };
    opcions.push(estadi);
  }

  // ── OPCIÓ JUGADOR, per lloc amb mancança. El cost és el preu REAL d'un candidat de mercat;
  // sense candidat no s'inventa cap preu (v3.1: fora l'estimació). Mentre no n'hi haja, les
  // mancances s'ordenen per la mètrica única, `mancança × pes`, que és el que val.
  for (const p of prioritats) {
    const guany = guanyJugador(p.mancanca, p.pes);
    opcions.push({
      tipus: 'jugador', lloc: p.lloc, habilitat: p.habilitat,
      mancanca: p.mancanca, pes: p.pes, nivell_objectiu: p.nivell_objectiu,
      pressupost_sou: p.pressupost_sou, guany, cost: null,
      eficiencia: null,                       // sense candidat real no hi ha eficiència
      admissible: false, falta: 'candidat',
      motiu: 'mancanca',
    });
  }

  return {
    caixa: eco.caixa,
    sou_sostenible: eco.sou_sostenible,
    sou_sostenible_setmanal: eco.sou_sostenible_setmanal,
    flux: eco.flux,
    divisio: eco.divisio,
    mancances: prioritats,
    opcions,
    recomanada: decisioEstoc(opcions),
    estadi_declarat: estadi != null,
    estadi_caduc: estadi?.caduc ?? false,
  };
}
