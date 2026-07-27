// Tonico — L'ONZE D'ESTRUCTURA: qui ocupa cada lloc del pla.
//
// Viu a banda perquè el consumixen dos: la pantalla de Plantilla (que el mostra) i, quan
// toque, el PAS 5 (que el gasta per a mesurar la mancança lloc a lloc en compte de fer-ho amb
// «el millor del bucket», que només mesurava cinc jugadors dels onze).
import { assignaEstructura } from './onze.js';
import { carregaConfigPesos, pesosFormacio, nivellsObjectiu } from './pesos.js';
import { llegixConfig } from './config.js';
import { llocsAmbHabilitat } from './orquestra_estoc.js';

const pomEnter = async (db, plantilla, clau) =>
  (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor ?? null;
const constantEnter = async (db, clau) =>
  (await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor ?? null;

export async function onzeEstructura(db, usuariId, jugadors, souSostenibleSetmanal = null) {
  const conf = await llegixConfig(db, usuariId);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const cfg = await carregaConfigPesos(db, estrategia);
  const llocs = await llocsAmbHabilitat(db, usuariId, estrategia, cfg.taula_habilitat_lloc || {});
  if (!llocs) return null;
  // El pes és per BUCKET i mana l'orde de tria: el lloc que més aporta agafa primer.
  const pesos = pesosFormacio([...new Set(llocs.map((l) => l.bucket))],
    cfg.posicio_aportacio, cfg.taula_aportacio, cfg.pes_sector);
  // El NIVELL OBJECTIU de cada lloc: el que el flux paga per a eixa habilitat. És la vara
  // contra la qual es llig cada ocupant, i per això va a la mateixa fila que ell.
  const nivells = nivellsObjectiu(llocs.map((l) => l.bucket), cfg, souSostenibleSetmanal);
  const ambPes = llocs.map((l) => ({ ...l, pes: pesos[l.bucket] ?? 0,
    nivell_objectiu: nivells?.[l.bucket]?.nivell_objectiu ?? null }));
  const { onze, sobrants } = assignaEstructura(jugadors, ambPes);

  // ENTRENABLES: els joves que ocuparan els llocs que ENTRENEN quan els titulars descansen, i
  // que es venen cars quan han crescut. Ixen del RESIDU de l'onze —no d'una categoria decidida
  // abans— i es trien pel mateix criteri que el full ja tenia per als rotatius: dins de la
  // finestra d'edat de venda i pels millors en l'habilitat que s'entrena.
  // Només els llocs que entrenen AL 100% (els mig centres): els extrems entrenen al 50% i no
  // són el motor. I un per cada partit EXTRA de la setmana, que és quan el titular descansa:
  // és la mateixa compta que el full ja tenia per als rotatius (`partits_setmana − 1`).
  const plens = llocs.filter((l) => l.entrena && (l.pct ?? 100) === 100);
  const habA = plens[0]?.habilitat ?? null;
  const partits = Number(conf?.partits_setmana) || 1;
  const quants = plens.length * Math.max(0, partits - 1);
  const edatMax = Number(await pomEnter(db, estrategia, 'edat_pic_venda'));
  const anyDies = Number(await constantEnter(db, 'any_dies')) || 112;
  const dies = (j) => (j.edat_anys ?? 0) * anyDies + (j.edat_dies ?? 0);
  const entrenables = !habA || !edatMax ? [] : sobrants
    .filter((j) => dies(j) <= edatMax * anyDies)
    .sort((a, b) => Number(b[habA] ?? 0) - Number(a[habA] ?? 0) || dies(a) - dies(b))
    .slice(0, quants);
  return { onze, sobrants, entrenables, habilitat_entrenament: habA, entrenables_max: quants };
}
