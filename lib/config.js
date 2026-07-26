// Tonico — CONFIG (contracte v3, V i PAS 0). L'única entrada d'usuari inicial:
//   config = { estrategia, pais, divisio, sistema_juvenil, partits_setmana }
// Font única: la taula config_usuari. Cap punt de decisió llig estos valors d'un altre
// lloc, i cap d'ells està cablejat en codi: un usuari nou passa pel mateix onboarding i
// obté el mateix comportament amb les SEUES dades.
//
//   llocs_partit = 11 × partits_setmana        (V del full)
// `llocs_formacio` (11) NO és un literal: ix de la formació configurada.

export const ESTRATEGIES = ['competitiva', 'cycle'];        // cycle: WIP, sense contingut
export const SISTEMES_JUVENILS = ['academia', 'cercapromeses', 'cap'];

// Llig la config de l'usuari. Torna null si encara no en té (usuari acabat de registrar).
export async function llegixConfig(db, usuariId) {
  const f = await db.prepare(
    'SELECT estrategia, pais, divisio, sistema_juvenil, partits_setmana FROM config_usuari WHERE usuari_id=?'
  ).bind(usuariId).first();
  if (!f) return null;
  return {
    estrategia: f.estrategia,
    pais: f.pais ?? null,
    divisio: f.divisio ?? null,
    sistema_juvenil: f.sistema_juvenil,
    partits_setmana: f.partits_setmana ?? null,
  };
}

// Camps que la config necessita i encara no té. Paco els demana a l'informe (mai a
// l'entrada): tot el que falta ix ací i desapareix sol quan la dada entra.
export function falten(config) {
  if (!config) return ['estrategia', 'pais', 'divisio', 'partits_setmana'];
  return ['pais', 'divisio', 'partits_setmana'].filter((c) => config[c] == null);
}

// llocs_partit = llocs de la formació × partits de la setmana. Sense partits_setmana
// declarat no es pot derivar: torna null (i el sistema el demana) en lloc de suposar-lo.
export function llocsPartit(config, llocsFormacio) {
  if (!config?.partits_setmana || !llocsFormacio) return null;
  return llocsFormacio * config.partits_setmana;
}

// Desa la config (onboarding o correcció posterior). Només toca el que arriba.
export async function desaConfig(db, usuariId, canvis = {}) {
  const actual = await llegixConfig(db, usuariId);
  const nou = {
    estrategia: canvis.estrategia ?? actual?.estrategia ?? 'competitiva',
    pais: canvis.pais ?? actual?.pais ?? null,
    divisio: canvis.divisio ?? actual?.divisio ?? null,
    sistema_juvenil: canvis.sistema_juvenil ?? actual?.sistema_juvenil ?? 'cap',
    partits_setmana: canvis.partits_setmana ?? actual?.partits_setmana ?? null,
  };
  if (!ESTRATEGIES.includes(nou.estrategia)) throw new Error('estrategia no vàlida');
  if (!SISTEMES_JUVENILS.includes(nou.sistema_juvenil)) throw new Error('sistema_juvenil no vàlid');
  if (nou.partits_setmana != null && ![1, 2].includes(Number(nou.partits_setmana))) throw new Error('partits_setmana no vàlid');
  await db.prepare(
    `INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(usuari_id) DO UPDATE SET estrategia=excluded.estrategia, pais=excluded.pais,
       divisio=excluded.divisio, sistema_juvenil=excluded.sistema_juvenil,
       partits_setmana=excluded.partits_setmana`
  ).bind(usuariId, nou.estrategia, nou.pais, nou.divisio, nou.sistema_juvenil,
    nou.partits_setmana == null ? null : Number(nou.partits_setmana)).run();
  return nou;
}
