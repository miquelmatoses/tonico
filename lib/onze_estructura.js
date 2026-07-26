// Tonico — L'ONZE D'ESTRUCTURA: qui ocupa cada lloc del pla.
//
// Viu a banda perquè el consumixen dos: la pantalla de Plantilla (que el mostra) i, quan
// toque, el PAS 5 (que el gasta per a mesurar la mancança lloc a lloc en compte de fer-ho amb
// «el millor del bucket», que només mesurava cinc jugadors dels onze).
import { assignaEstructura } from './onze.js';
import { carregaConfigPesos, pesosFormacio, nivellsObjectiu } from './pesos.js';
import { llegixConfig } from './config.js';
import { llocsAmbHabilitat } from './orquestra_estoc.js';

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
  return assignaEstructura(jugadors, ambPes);
}
