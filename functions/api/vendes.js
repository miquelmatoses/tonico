// Tonico — fitxes de venda (Àrea E). GET els jugadors en categoria 'venda' amb la
// seua fitxa (preu d'eixida proposat/editat, data de llistada, estat); POST upsert.
import { habilitatMax, subhastaDeserta, despatxable } from '../../lib/vendes.js';
import { normalitzaDivisio } from '../../lib/divisio.js';
import { avaluaPuntuacio } from '../../lib/classificador.js';
import { carregaConfigPla } from '../../lib/config_pla.js';
import { esLesionat } from '../../public/format.js';
import { cobertura } from '../../lib/cobertura.js';
import { entrenamentEfectiu, aplicaEntrenament } from '../../lib/entrenament_places.js';
import { conjuntLiquidacio, estatLiquidacio } from '../../lib/liquidacio.js';
import { sqlCategoriaVigent } from '../../lib/categoria_vigent.js';

const ESTATS = ['pendent', 'llistat', 'venut', 'desert', 'despatxat'];
const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));

export async function onRequestGet({ env, data }) {
  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
  if (!equip) return json({ jugadors: [] });
  const inst = await env.DB.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  // `transferible` de la instantània ANTERIOR: el dispar de la PREGUNTA (P7) és la transició
  // 1 → buit entre instantànies, no l'estat de la fitxa.
  const instAbans = await env.DB.prepare('SELECT id FROM instantanies WHERE equip_id=? AND id<? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id, inst?.id ?? 0).first();
  const transfAbans = new Map();
  if (instAbans) {
    const { results: ant } = await env.DB.prepare('SELECT jugador_id, transferible FROM instantanies_jugadors WHERE instantania_id=?').bind(instAbans.id).all();
    for (const r of ant) transfAbans.set(r.jugador_id, r.transferible);
  }
  if (!inst) return json({ jugadors: [] });

  const { results: jugadors } = await env.DB.prepare(
    `SELECT j.id AS jugador_id, j.nom, j.especialitat, ij.posicio_ultim_partit AS posicio, ij.edat_anys,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada,
            ij.lleialtat, ij.qualificacio_ultim_partit, ij.sou, ij.lesio,
            v.data_llistada, v.estat, v.resultat_pendent, c.categoria
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id = ij.jugador_id
       JOIN ${sqlCategoriaVigent(['categoria'])} c
         ON c.jugador_id = j.id
       LEFT JOIN vendes v ON v.jugador_id = j.id
      WHERE ij.instantania_id = ? AND c.categoria = 'venda'`
  ).bind(inst.id).all();

  // v3.1: FORA l'estimació de preu. No es llegixen `preus_observats`, ni `base_preu_divisio`,
  // ni `min_mostres`: Tonico no diu quant val un jugador, ho diu el mercat. Qui ordena la
  // llista és la puntuació de la categoria de venda, que és una dada pròpia.
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const config = pla ? await carregaConfigPla(env.DB, pla.plantilla) : { categories: [], params: {} };
  const habLloc = JSON.parse((await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='taula_habilitat_lloc'").bind(config.plantilla ?? 'competitiva').first())?.valor || '{}');
  const vendaSpec = config.categories.find((c) => c.categoria === 'venda')?.parametres?.puntuacio;
  const punts = jugadors.map((j) => (vendaSpec ? avaluaPuntuacio(vendaSpec, j, config.params) : null));
  const positius = punts.filter((p) => p != null && p > 0);
  const mitjana = positius.length ? positius.reduce((a, b) => a + b, 0) / positius.length : null;

  // La subhasta tanca a llistat + dies_subhasta (mecànica del tercer dia).
  const diesSubhasta = parseInt((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='dies_subhasta'").first())?.valor || '3', 10);
  const tancament = (dataLlistada) => (dataLlistada ? new Date(Date.parse(dataLlistada) + diesSubhasta * 86400000).toISOString().slice(0, 10) : null);
  // v3.1: FORA el criteri econòmic de «despatxar» per `valor_net`. Es llista una vegada i qui
  // decidix si s'acomiada és la SUBHASTA (lib/vendes.js → despatxable), no una previsió.
  // Els RELLOTGES manen sobre el despatxar (2b): un jugador amb venda FORÇADA
  // (llistat/venut/despatxat, data de llistat activa o entrada d'agenda de llistat
  // vigent) MAI mostra «despatxar» ni buffer — mateixa doctrina.
  const { results: agListat } = await env.DB.prepare(
    "SELECT jugador_id FROM alertes WHERE usuari_id=? AND estat='agenda' AND missatge_clau='agenda.llistar' AND jugador_id IS NOT NULL"
  ).bind(data.usuari.id).all();
  const forcadaAgenda = new Set(agListat.map((r) => r.jugador_id));
  const forcada = (j) => j.estat === 'llistat' || j.estat === 'venut' || j.estat === 'despatxat' || !!j.data_llistada || forcadaAgenda.has(j.jugador_id);
  const eixida = jugadors.map((j, i) => {
    const forc = forcada({ ...j, estat: j.estat || 'pendent' });
    // El valor de venda mana en la retenció (1). MATEIXA vara que el motor d'alertes: la
    // puntuació de la categoria (derivada, no la desada). Sense preu estimat, la puntuació és
    // l'única vara — i és una dada pròpia, no una previsió.
    const valor = punts[i] ?? 0;
    // Un SOBRANT que va desert es despatxa; un retingut, mai. Ací tots són sobrants per
    // construcció (la consulta filtra categoria='venda'), però es deriva del camp i no del
    // filtre: si la consulta canvia, açò no ha de mentir en silenci.
    const esSobrant = j.categoria === 'venda' || j.categoria === 'sobrant';
    // LA SUBHASTA DESERTA ES DEDUÏX, no es pregunta: si estava transferible, ja no ho està i
    // SEGUIX A LA PLANTILLA, és que ningú l'ha comprat. Preguntar-ho era demanar-li a Miquel
    // una cosa que el sistema ja sap.
    const desert = subhastaDeserta({ transferible_abans: transfAbans.get(j.jugador_id),
      transferible_ara: j.transferible, en_plantilla: true });
    return { ...j, estat: j.estat || 'pendent', valor, puntuacio: punts[i] ?? null,
      tancament_previst: tancament(j.data_llistada), lesionat: esLesionat(j.lesio),
      es_sobrant: esSobrant, desert,
      despatxar: despatxable({ es_sobrant: esSobrant, desert }) };
  });
  // (4) FORA les marques de BUFFER («cobrix X — ven-lo l'últim»): doctrina morta amb la
  // liquidació. Una fitxa només pot estar en un d'estos estats, i els dona el MATEIX
  // conjunt derivat que l'alerta agregada (3): llistat / retingut / lesionat / llistable.
  let cob = null;
  if (pla) {
    const cfgJson = async (clau) => JSON.parse((await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor || 'null');
    const slotsCfg = aplicaEntrenament(await cfgJson('formacio'), (await entrenamentEfectiu(env.DB, data.usuari.id)).places);
    if (slotsCfg && slotsCfg.length) {
      const pomPl = async (clau, def) => parseInt((await env.DB.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(pla.plantilla, clau).first())?.valor || String(def), 10);
      const teFE = !!(await env.DB.prepare("SELECT 1 x FROM plantilles_categories WHERE plantilla=? AND categoria='futur_entrenador' AND aforament>=1").bind(pla.plantilla).first());
      cob = cobertura({ slots: slotsCfg, rols: await cfgJson('rols') }, {
        porters_minims: await pomPl('porters_minims', 2),
        futur_entrenador: teFE ? 1 : 0,
      });
      const porterPos = (await env.DB.prepare("SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau='posicio_porter'").bind(pla.plantilla).first())?.valor || 'PO';
      // Cos DISPONIBLE per classe (no entrenables, no llistats): camp i porteria per separat.
      const disp = async (esPorter) => (await env.DB.prepare(
        `SELECT COUNT(*) n FROM instantanies_jugadors ij
           LEFT JOIN ${sqlCategoriaVigent(['categoria'])} c
                  ON c.jugador_id = ij.jugador_id
           LEFT JOIN vendes v ON v.jugador_id = ij.jugador_id
          WHERE ij.instantania_id=? AND COALESCE(c.categoria,'') NOT IN ('core','rotatiu')
            AND ij.posicio_ultim_partit ${esPorter ? '=' : '<>'} ? AND ij.transferible IS NOT 1
            AND COALESCE(v.estat,'') <> 'llistat'`
      ).bind(inst.id, porterPos).first())?.n ?? 0;
      const cosCamp = await disp(false), cosPorter = await disp(true);
      // MATEIXA FONT que l'alerta agregada: venda − llistats − lesionats − retinguts (camp + porters).
      const conj = conjuntLiquidacio(eixida.filter((j) => j.estat === 'pendent'), { ...cob, cos_camp: cosCamp, cos_porter: cosPorter, posicio_porter: porterPos });
      for (const j of eixida) j.estat_liquidacio = estatLiquidacio(j, conj);
      cob = { ...cob, cos_camp: cosCamp, cos_porter: cosPorter, retinguts_camp: conj.retinguts_camp, retinguts_porters: conj.retinguts_porters,
        llistables: conj.llistables.length, sou_total: conj.llistables.reduce((s, j) => s + (j.sou || 0), 0) };
    }
  }
  if (!cob) for (const j of eixida) j.estat_liquidacio = estatLiquidacio(j, { retingutsSet: new Set() });
  return json({ jugadors: eixida, cobertura: cob });
}

export async function onRequestPost({ request, env, data }) {
  const cosPrev = await request.clone().json().catch(() => ({}));
  // PAS 7: l'usuari tria una de les quatre eixides d'una subhasta deserta. Cada eixida es
  // tradueix a un estat de fitxa; el «1 €» és un override explícit del preu.
  if (cosPrev.eixida_deserta) {
    const EIXIDES = { rebaixar: 'pendent', rellistar: 'llistat', despatxar: 'despatxat', un_euro: 'llistat' };
    const nouEstat = EIXIDES[cosPrev.eixida_deserta];
    if (!nouEstat || !cosPrev.jugador_id) return json({ error: 'dades_invalides' }, 400);
    // `un_euro` era un override del PREU; ara és només un ESTAT (rellistar-lo a la baixa).
    // Sense import, perquè cap import entra a cap fórmula.
    await env.DB.prepare('UPDATE vendes SET estat=? WHERE usuari_id=? AND jugador_id=?')
      .bind(nouEstat, data.usuari.id, cosPrev.jugador_id).run();
    return json({ ok: true, estat: nouEstat });
  }
  const c = await request.json().catch(() => ({}));
  if (!c.jugador_id) return json({ error: 'falta_jugador' }, 400);
  const own = await env.DB.prepare('SELECT j.id FROM jugadors j JOIN equips e ON e.id=j.equip_id WHERE j.id=? AND e.usuari_id=?').bind(c.jugador_id, data.usuari.id).first();
  if (!own) return json({ error: 'no_trobat' }, 404);
  const estat = ESTATS.includes(c.estat) ? c.estat : 'pendent';
  // En editar/desar l'usuari resol la fitxa: es neteja la pregunta de resultat pendent.
  await env.DB.prepare(
    `INSERT INTO vendes (jugador_id, usuari_id, data_llistada, estat, resultat_pendent)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(jugador_id) DO UPDATE SET data_llistada=excluded.data_llistada,
       estat=excluded.estat, resultat_pendent=0`
  ).bind(c.jugador_id, data.usuari.id, c.data_llistada || null, estat).run();
  return json({ ok: true }, 201);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
