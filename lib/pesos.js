// Tonico — PESOS I NIVELL OBJECTIU (contracte v3, PAS 2 i PAS 4).
//
//   pes(lloc)             = SUMA(sectors: aportacio(lloc, sector) × pes_sector(sector))
//   pressupost_sou(lloc)  = sou_sostenible × pes(lloc) / SUMA(pesos)
//   nivell_objectiu(lloc) = MAX(n : taula_salaris(habilitat_lloc, n) ≤ pressupost_sou)
//
// El nivell que pots tindre a cada lloc el decidix l'ECONOMIA (el flux → el sou que
// sostens → la taula de salaris del joc), mai els rivals. Tots els números venen de la
// guia (§4 aportació, §8 salaris) i els pesos de sector es MESUREN contra les dues taules
// del wiki (migració 110). Ja no queda cap número inventat per nosaltres en este pas.

// Cada columna de la matriu de §4 pertany a un sector de qualificació. El mig té el seu
// pes propi (decidix QUI té l'ocasió); els altres, el de la distribució d'ocasions.
// EL SECTOR EL DIU LA COLUMNA. `DC#Def` és defensa central, `AL#Ext` és atac de banda: el
// prefix ja porta el sector i no cal enumerar cada combinació — així una columna nova a la
// matriu no es queda muda per oblit.
//
// CINC sectors, no tres. Teníem «central» i «banda» col·lapsant defensa i atac, i la mesura
// contra les dues taules del wiki diu que no pesen igual (banda defensiva 0,304, atacant
// 0,241). Vore la migració 110.
const SECTOR = { Mig: 'mig', DC: 'defensa_central', Lat: 'defensa_banda',
  AC: 'atac_central', AL: 'atac_banda' };
const sectorDe = (columna) => SECTOR[columna.split('#')[0]] ?? null;

// EL PES EFECTIU D'UN SECTOR = conversió × importància, i les DUES sempre. La conversió
// (mesurada) diu quants punts de qualificació dona una habilitat; la importància (guia §5) diu
// quant val guanyar eixe sector. Aplicar-ne una a un procés i l'altra a un altre seria tornar a
// tindre dues nocions de «què val un lloc» convivint. Vore la migració 111.
const pesEfectiu = (sector, pesSector) => (pesSector?.[sector] ?? 0);

// Quina habilitat nostra hi ha darrere de cada columna de la matriu.
const HABILITAT = { Por: 'porteria', Def: 'defensa', Cre: 'creativitat',
  Ext: 'extrem', Pas: 'passades', Anot: 'anotacio' };

// ── EL POLICULTIU (v2 del motor) ─────────────────────────────────────────────────────────
// Un lloc no el definix UNA habilitat. La matriu diu amb quines aporta i quant, i `pesLloc` ja
// feia esta suma amb totes les habilitats a 1 — o siga que el pes d'un lloc no és una altra
// cosa: és la puntuació d'un jugador que ho tinguera tot a 1.
//
// Amb monocultiu, un lateral es triava només per la defensa i el seu extrem (0,59 a l'atac de
// banda, el segon número més gran de la seua fila) valia zero.
export function pesosHabilitat(posicioAportacio, taulaAportacio, pesSector) {
  const fila = taulaAportacio?.[posicioAportacio];
  if (!fila) return null;
  const out = {};
  for (const [columna, valor] of Object.entries(fila)) {
    const sector = sectorDe(columna);
    const hab = HABILITAT[columna.split('#')[1]];
    if (!sector || !hab) continue;
    out[hab] = (out[hab] ?? 0) + valor * pesEfectiu(sector, pesSector);
  }
  return out;
}

export const contribucio = (jugador, pesosHab) => Object.entries(pesosHab ?? {})
  .reduce((a, [h, w]) => a + w * Number(jugador?.[h] ?? 0), 0);

// EQUIVALENT: la contribució partida pel pes del lloc, o siga la MITJANA de les habilitats del
// jugador ponderada per quant importa cada una ahí. Queda en l'escala de Hattrick —la mateixa
// que el nivell objectiu—, i per això tot el que es pinta i el llindar de `distancia_min`
// segueixen llegint-se igual.
export function equivalent(jugador, pesosHab) {
  const suma = Object.values(pesosHab ?? {}).reduce((a, b) => a + b, 0);
  return suma ? contribucio(jugador, pesosHab) / suma : null;
}

// ── EL SOU D'UN PERFIL (wiki «Wages») ────────────────────────────────────────────────────
// base + la contribució de la MÉS CARA + factor × la resta. «Principal» és la que més sou
// costa, no la de nivell més alt. Cap número ací: tot ve de `sou_formula` i `taula_salaris`.
export function costHabilitat(habilitat, nivellHt, taulaSalaris, offset = 0) {
  const escala = taulaSalaris?.[habilitat];
  if (!escala) return 0;
  const i = nivellHt - offset;
  if (i < 1) return 0;                                  // per davall del mínim no paga res
  const max = Math.max(...Object.keys(escala).map(Number));
  return escala[String(Math.min(i, max))] ?? 0;
}

export function souPerfil(perfil, taulaSalaris, formula, offset = 0) {
  if (!formula) return null;
  const costos = Object.entries(perfil ?? {})
    .map(([h, n]) => costHabilitat(h, n, taulaSalaris, offset))
    .filter((c) => c > 0).sort((a, b) => b - a);
  if (!costos.length) return formula.base;
  const f = costos[0] >= formula.llindar_alt ? formula.secundari_alt : formula.secundari;
  return Math.round(formula.base + costos[0] + f * costos.slice(1).reduce((a, b) => a + b, 0));
}

// EL PERFIL QUE MÉS APORTA PER UN SOU. Es puja nivell a nivell, sempre pel que més aporta per
// euro. El sou és exponencial i les secundàries paguen una fracció, mentre la contribució és
// lineal: per això el perfil bo REPARTIX, i concentrar-ho tot en una habilitat és la manera
// cara de comprar contribució.
//
// ponytail: voraç, no demostradament òptim. La regla de «la més cara compta sencera» trenca la
// separabilitat i un òptim exacte demanaria explorar combinacions. Si algun dia importa, es fa
// exhaustiu per força bruta acotada; de moment el perfil que trau ja bat el monocultiu de
// llarg, que és el que es volia arreglar.
export function perfilObjectiu(pesosHab, pressupost, taulaSalaris, formula, opts = {}) {
  const { offset = 0, nivellMax = 20 } = opts;
  if (!pesosHab || pressupost == null || !formula) return null;
  const perfil = {};
  for (const h of Object.keys(pesosHab)) perfil[h] = offset;      // tots per davall del mínim
  let sou = souPerfil(perfil, taulaSalaris, formula, offset);
  for (let pas = 0; pas < nivellMax * Object.keys(pesosHab).length; pas++) {
    let millor = null;
    for (const [h, w] of Object.entries(pesosHab)) {
      if (perfil[h] - offset >= nivellMax) continue;
      const prova = { ...perfil, [h]: perfil[h] + 1 };
      const nou = souPerfil(prova, taulaSalaris, formula, offset);
      if (nou > pressupost) continue;
      const delta = nou - sou;
      const ratio = delta <= 0 ? Infinity : w / delta;
      if (!millor || ratio > millor.ratio) millor = { h, ratio, nou };
    }
    if (!millor) break;
    perfil[millor.h] += 1;
    sou = millor.nou;
  }
  return { perfil, sou, aportacio: contribucio(perfil, pesosHab), equivalent: equivalent(perfil, pesosHab) };
}

// pes(lloc) — l'aportació del lloc, ponderada per la importància de cada sector.
export function pesLloc(posicioAportacio, taulaAportacio, pesSector) {
  const fila = taulaAportacio?.[posicioAportacio];
  if (!fila) return null;                       // posició desconeguda: no se suposa un pes
  let total = 0;
  for (const [columna, valor] of Object.entries(fila)) {
    const sector = sectorDe(columna);
    if (!sector) continue;
    total += valor * pesEfectiu(sector, pesSector);
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

// pressupost_sou(lloc) = sou_sostenible × pes(lloc) / SUMA(pesos de TOTS ELS LLOCS).
//
// `comptes` = quants llocs té cada bucket. Sense això la suma anava sobre els 5 TIPUS de lloc
// i després cada tipus donava el seu pressupost sencer a cadascun dels seus llocs: els tres MC
// rebien 3.197 € cadascun en compte de repartir-se'ls. L'11 ideal eixia a 19.430 €/setmana amb
// un sostre de 10.290 — quasi el doble, i per tant mancances inflades i ningú sobrepagat.
// El full sempre ha dit «tots els llocs»; açò és el codi atrapant-lo.
//
// L'eixida segueix sent PER BUCKET, que és el correcte: els tres MC comparteixen objectiu.
// El que estava mal era el divisor, no la forma.
export function pressupostSou(pesos, souSostenible, comptes = null) {
  if (souSostenible == null) return null;
  const n = (lloc) => comptes?.[lloc] ?? 1;
  const suma = Object.entries(pesos).reduce((a, [lloc, p]) => a + p * n(lloc), 0);
  if (!suma) return null;
  const out = {};
  for (const [lloc, p] of Object.entries(pesos)) out[lloc] = Math.round((souSostenible * p) / suma);
  return out;
}

// EL NIVELL D'UNA SOLA HABILITAT se n'ha anat amb el monocultiu: el pressupost d'un lloc ja no
// compra «creativitat 9», compra un PERFIL (`perfilObjectiu`). Amb la funció vella, un lloc
// demanava el nivell més alt d'una habilitat que el sou pagara, i eixa és justament la manera
// cara de comprar contribució.

// Tot el PAS 4 d'un colp: pesos, pressupost i nivell objectiu de cada lloc.
// `llocs` = la llista SENCERA de la formació (amb repeticions): d'ahí ixen els buckets i, el que
// importa, QUANTS llocs té cadascun, que és el divisor del pressupost.
export function nivellsObjectiu(llocs, cfg, souSostenible) {
  const { posicio_aportacio, taula_aportacio, pes_sector, taula_habilitat_lloc, taula_salaris,
    sou_formula, nivell_offset: off = 0 } = cfg;
  const comptes = {};
  for (const l of llocs) comptes[l] = (comptes[l] ?? 0) + 1;
  const pesos = pesosFormacio(Object.keys(comptes), posicio_aportacio, taula_aportacio, pes_sector);
  const pressupost = pressupostSou(pesos, souSostenible, comptes);
  const out = {};
  for (const lloc of Object.keys(pesos)) {
    const pesosHab = pesosHabilitat(posicio_aportacio?.[lloc], taula_aportacio, pes_sector);
    // EL PERFIL QUE EL PRESSUPOST PAGA. És alhora la VARA (contra què es mesura l'ocupant) i
    // la CERCA (què li demanes al cercador de Hattrick): un sol càlcul, dos usos. Abans eren
    // dos números distints —un nivell per a mesurar i un altre per a buscar— i els dos eixien
    // de mirar una sola habilitat.
    const objectiu = perfilObjectiu(pesosHab, pressupost?.[lloc] ?? null, taula_salaris, sou_formula, { offset: off });
    out[lloc] = {
      pes: pesos[lloc],
      llocs: comptes[lloc],
      // L'habilitat de referència es queda per a la pantalla i per al filtre de cerca quan
      // només se'n pot demanar una. Ja no decidix res.
      habilitat: taula_habilitat_lloc?.[lloc],
      pesos_habilitat: pesosHab,
      pressupost_sou: pressupost?.[lloc] ?? null,
      perfil_objectiu: objectiu?.perfil ?? null,
      sou_objectiu: objectiu?.sou ?? null,
      aportacio_objectiu: objectiu?.aportacio ?? null,
    };
  }
  return out;
}

// conversió × importància, sector a sector. Si a una li falta un sector, eixe sector no compta:
// no s'inventa una capa que no està declarada.
const combina = (conversio, importancia) => {
  if (!conversio || !importancia) return null;
  const out = {};
  for (const [s, c] of Object.entries(conversio)) {
    if (importancia[s] == null) continue;
    out[s] = c * importancia[s];
  }
  return out;
};

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
    sou_formula: await constant('sou_formula'),
    // El pont entre les dues escales (guia §8: la taula comença en «Inadequate», el 5é de HT).
    nivell_offset: Number((await db.prepare("SELECT valor FROM constants_joc WHERE clau='nivell_habilitat_offset'").first())?.valor) || 0,
    posicio_aportacio: await jsonPom('posicio_aportacio'),
    taula_habilitat_lloc: await jsonPom('taula_habilitat_lloc'),
    // MESURATS, no declarats per nosaltres: el quocient entre les dues taules del wiki.
    // LES DUES CAPES ja multiplicades: una sola taula efectiva per a tot el sistema, perquè no
    // puga passar que un procés n'aplique una i un altre l'altra.
    pes_sector: combina(await constant('pesos_sector'), await constant('importancia_sector')),
  };
}
