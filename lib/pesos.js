// Tonico — PESOS I NIVELL OBJECTIU (contracte v3, PAS 2 i PAS 4).
//
//   pes(lloc)             = SUMA(sectors: aportacio(lloc, sector) × pes_sector(sector))
//   pressupost_sou(lloc)  = sou_sostenible × pes(lloc) / SUMA(pesos)
//   nivell_objectiu(lloc) = MAX(n : taula_salaris(habilitat_lloc, n) ≤ pressupost_sou)
//
// El nivell que pots tindre a cada lloc el decidix l'ECONOMIA (el flux → el sou que
// sostens → la taula de salaris del joc), mai els rivals. Tots els números venen de la
// guia (§4 aportació, §5 distribució d'ocasions, §8 salaris); l'únic pom no calibrat és
// `pes_mig`, perquè la guia no publica quant pesa el mig contra els sectors.

// Cada columna de la matriu de §4 pertany a un sector de qualificació. El mig té el seu
// pes propi (decidix QUI té l'ocasió); els altres, el de la distribució d'ocasions.
const SECTOR = {
  'Mig#Cre': 'mig',
  'DC#Por': 'central', 'DC#Def': 'central', 'AC#Anot': 'central', 'AC#Pas': 'central',
  'Lat#Por': 'banda', 'Lat#Def': 'banda', 'AL#Ext': 'banda', 'AL#Pas': 'banda', 'AL#Anot': 'banda',
};

// pes(lloc) — l'aportació del lloc, ponderada per la importància de cada sector.
export function pesLloc(posicioAportacio, taulaAportacio, pesSector) {
  const fila = taulaAportacio?.[posicioAportacio];
  if (!fila) return null;                       // posició desconeguda: no se suposa un pes
  let total = 0;
  for (const [columna, valor] of Object.entries(fila)) {
    const sector = SECTOR[columna];
    if (!sector) continue;
    total += valor * (pesSector[sector] ?? 0);
  }
  return Math.round(total * 10000) / 10000;
}

// Els pesos de tots els llocs de la formació, per a repartir el pressupost entre ells.
export function pesosFormacio(llocs, posicioAportacio, taulaAportacio, pesSector) {
  const out = {};
  for (const lloc of llocs) {
    const pos = posicioAportacio?.[lloc];
    const p = pos ? pesLloc(pos, taulaAportacio, pesSector) : null;
    if (p != null) out[lloc] = p;
  }
  return out;
}

// pressupost_sou(lloc) = sou_sostenible × pes(lloc) / SUMA(pesos). Sense sou sostenible
// declarat no hi ha pressupost: null, i qui el consumix ho ha de dir.
export function pressupostSou(pesos, souSostenible) {
  if (souSostenible == null) return null;
  const suma = Object.values(pesos).reduce((a, b) => a + b, 0);
  if (!suma) return null;
  const out = {};
  for (const [lloc, p] of Object.entries(pesos)) out[lloc] = Math.round((souSostenible * p) / suma);
  return out;
}

// nivell_objectiu(lloc) = el nivell més alt de la taula de salaris que el pressupost paga.
// Si no arriba ni al primer nivell, és 0: el lloc no es pot pagar (i això és informació).
export function nivellObjectiu(habilitat, pressupost, taulaSalaris) {
  if (pressupost == null) return null;
  const escala = taulaSalaris?.[habilitat];
  if (!escala) return null;
  let millor = 0;
  for (const [nivell, sou] of Object.entries(escala)) {
    const n = Number(nivell);
    if (sou <= pressupost && n > millor) millor = n;
  }
  return millor;
}

// Tot el PAS 4 d'un colp: pesos, pressupost i nivell objectiu de cada lloc.
export function nivellsObjectiu(llocs, cfg, souSostenible) {
  const { posicio_aportacio, taula_aportacio, pes_sector, taula_habilitat_lloc, taula_salaris } = cfg;
  const pesos = pesosFormacio(llocs, posicio_aportacio, taula_aportacio, pes_sector);
  const pressupost = pressupostSou(pesos, souSostenible);
  const out = {};
  for (const lloc of Object.keys(pesos)) {
    const habilitat = taula_habilitat_lloc?.[lloc];
    out[lloc] = {
      pes: pesos[lloc],
      habilitat,
      pressupost_sou: pressupost?.[lloc] ?? null,
      nivell_objectiu: nivellObjectiu(habilitat, pressupost?.[lloc] ?? null, taula_salaris),
    };
  }
  return out;
}

// Carrega la config del PAS 2/4 des de la BD (constants de joc + poms de l'estratègia).
export async function carregaConfigPesos(db, estrategia) {
  const constant = async (clau) => {
    const f = await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first();
    return f?.valor ? JSON.parse(f.valor) : null;
  };
  const pom = async (clau) => (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(estrategia, clau).first())?.valor ?? null;
  const num = async (clau) => { const v = await pom(clau); return v == null ? null : Number(v); };
  const jsonPom = async (clau) => { const v = await pom(clau); return v ? JSON.parse(v) : null; };
  return {
    taula_aportacio: await constant('taula_aportacio'),
    taula_salaris: await constant('taula_salaris'),
    posicio_aportacio: await jsonPom('posicio_aportacio'),
    taula_habilitat_lloc: await jsonPom('taula_habilitat_lloc'),
    pes_sector: {
      mig: await num('pes_mig'),
      central: await num('pes_central'),
      banda: await num('pes_banda'),
    },
  };
}
