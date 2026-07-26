// Tonico — economia (Fase 5 + Àrea A). Els imports es guarden SIGNATS (ingressos
// +, despeses −). Caixa REAL declarada (informe de HT), balanç
// operatiu setmanal i projecció fins a la DATA d'inflexió del pla mestre.
import { estimaCapitalInflexio } from './capital.js';
import { dataDeTemporada, setmanesEntre, temporadaOperativa } from './calendari.js';
import { proposaPreuEixida } from './vendes.js';

const INGRESSOS = ['venda', 'ingres_patrocini', 'taquilla'];

// Signe segons el tipus (l'API guarda ja l'import signat amb esta funció).
export function signa(tipus, import_) {
  const abs = Math.abs(import_);
  if (INGRESSOS.includes(tipus)) return abs;
  if (tipus === 'altres') return import_;             // l'usuari en tria el signe
  return -abs;                                        // compra, sou, personal, estadi, taxa_llistat...
}

export async function economia(db, usuariId) {
  const fin = await db.prepare('SELECT caixa, caixa_data, despesa_planter, despesa_estadi, ingres_setmanal FROM finances WHERE usuari_id=?').bind(usuariId).first();
  const sumTx = (await db.prepare('SELECT COALESCE(SUM(import),0) c FROM transaccions WHERE usuari_id=?').bind(usuariId).first()).c;
  // Caixa: la real declarada (informe de HT) mana; si no, la derivada de moviments.
  const caixaReal = fin?.caixa != null;
  const caixa = caixaReal ? fin.caixa : sumTx;

  // Nòmina setmanal automàtica: suma de sous de l'última instantània sènior (no s'apunta a mà).
  const eq = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const inst = eq ? await db.prepare('SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(eq.id).first() : null;
  const nomina = inst ? (await db.prepare('SELECT COALESCE(SUM(sou),0) s FROM instantanies_jugadors WHERE instantania_id=?').bind(inst.id).first()).s : null;
  // Cost setmanal del personal (des dels membres declarats, Àrea B).
  const personalSetmanal = (await db.prepare("SELECT COALESCE(SUM(sou),0) s FROM personal_membres WHERE usuari_id=?").bind(usuariId).first()).s;

  // Balanç operatiu setmanal = ingressos recurrents − despeses recurrents.
  const despeses = { nomina: nomina ?? 0, planter: fin?.despesa_planter ?? 0, estadi: fin?.despesa_estadi ?? 0, personal: personalSetmanal };
  const despesaTotal = despeses.nomina + despeses.planter + despeses.estadi + despeses.personal;
  const ingresSetmanal = fin?.ingres_setmanal ?? null;
  const balancSetmanal = ingresSetmanal != null ? ingresSetmanal - despesaTotal : null;

  // Objectiu de capital: manual si l'usuari el fixa; si no, ESTIMAT (desglossat)
  // perquè Paco no ho pregunte en fred. Un clic d'acceptar el fixa com a manual.
  const pla = await db.prepare('SELECT plantilla, parametres FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  const params = pla?.parametres ? JSON.parse(pla.parametres) : {};
  const objectiuManual = params.capital_objectiu ?? null;
  const est = objectiuManual == null ? await estimaCapitalInflexio(db, usuariId, nomina) : null;
  const objectiu = objectiuManual ?? est?.total ?? null;

  const projeccio = objectiu != null
    ? { objectiu, caixa, falta: objectiu - caixa, percentatge: objectiu ? Math.round((caixa / objectiu) * 100) : null,
        estimat: objectiuManual == null, desglossament: est?.desglossament ?? null }
    : null;

  // Trajectòria fins a la DATA d'inflexió, INCLOENT el negoci (vendes).
  const traj = await trajectoria(db, usuariId, projeccio, caixa, balancSetmanal, params.temporada_inflexio ?? null, inst, pla?.plantilla);
  if (projeccio && traj) Object.assign(projeccio, traj);

  return { caixa, caixaReal, caixa_data: fin?.caixa_data ?? null, projeccio, nomina,
    despeses, ingres_setmanal: ingresSetmanal, balanc_setmanal: balancSetmanal };
}

// Projecció de la caixa a la data d'inflexió. El balanç operatiu és negatiu per
// disseny; l'ingrés d'una fàbrica són els MARGES DE VENDA. Compta:
//  · vendes previstes de les fitxes actives (preu proposat des de comparables; si
//    no n'hi ha, pom valor_estimat_defecte, etiquetat com a estimació grossa);
async function trajectoria(db, usuariId, projeccio, caixa, balancSetmanal, temporadaInflexio, inst, plantilla) {
  if (!projeccio || balancSetmanal == null || temporadaInflexio == null || !inst?.data) return null;
  const anc = await db.prepare(
    `SELECT (SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data') AS data,
            (SELECT valor FROM constants_joc WHERE clau='calendari_ancora_temporada') AS temporada,
            (SELECT valor FROM constants_joc WHERE clau='any_dies') AS anyDies,
            (SELECT valor FROM constants_joc WHERE clau='temporada_setmanes') AS setmanes`
  ).first();
  if (!anc?.data) return null;
  const ancora = { data: anc.data, temporada: parseInt(anc.temporada, 10), anyDies: parseInt(anc.anyDies, 10) };
  const dataInflexio = dataDeTemporada(temporadaInflexio, ancora);
  const setmanes = Math.max(0, setmanesEntre(inst.data, dataInflexio));
  const temporadaActual = temporadaOperativa(inst.temporada, inst.setmana_temporada, parseInt(anc.setmanes || '16', 10)).temporada;

  const pom = async (clau, def) => parseInt((await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor ?? String(def), 10);
  const valorDefecte = await pom('valor_estimat_defecte', 0);

  // (a) Vendes previstes de les fitxes actives.
  const { results: vendesRows } = await db.prepare(
    `SELECT v.preu_eixida, ij.posicio_ultim_partit AS posicio
       FROM vendes v JOIN instantanies_jugadors ij ON ij.jugador_id=v.jugador_id AND ij.instantania_id=?
      WHERE v.usuari_id=? AND v.estat IN ('pendent','llistat')`
  ).bind(inst.id, usuariId).all();
  const { results: comps } = await db.prepare('SELECT posicio, preu FROM preus_observats WHERE usuari_id=?').bind(usuariId).all();
  const teComparables = comps.length > 0;
  let vendesPrevistes = 0;
  for (const v of vendesRows) vendesPrevistes += v.preu_eixida ?? proposaPreuEixida(comps, { posicio: v.posicio }) ?? valorDefecte;

  const ingresEstimat = vendesPrevistes;
  const caixaProjectada = caixa + balancSetmanal * setmanes + ingresEstimat;
  return {
    setmanes_fins_inflexio: setmanes, data_inflexio: dataInflexio,
    caixa_projectada: caixaProjectada, arriba: caixaProjectada >= projeccio.objectiu,
    vendes_previstes: vendesPrevistes, ingres_estimat: ingresEstimat,
    te_comparables: teComparables,
    sense_dades_venda: !teComparables && vendesRows.length === 0,
  };
}
