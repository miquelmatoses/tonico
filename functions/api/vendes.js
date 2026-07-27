// Tonico — fitxes de venda (Àrea E). GET els jugadors en categoria 'venda' amb la
// seua fitxa (preu d'eixida proposat/editat, data de llistada, estat); POST upsert.
import { habilitatMax } from '../../lib/vendes.js';
import { onzeEstructura } from '../../lib/onze_estructura.js';
import { economia } from '../../lib/economia.js';
import { normalitzaDivisio } from '../../lib/divisio.js';
import { avaluaPuntuacio } from '../../lib/classificador.js';
import { carregaConfigPla } from '../../lib/config_pla.js';
import { esLesionat } from '../../public/format.js';
import { cobertura, cosDisponible } from '../../lib/cobertura.js';
import { entrenamentEfectiu, aplicaEntrenament } from '../../lib/entrenament_places.js';
import { conjuntLiquidacio, estatLiquidacio } from '../../lib/liquidacio.js';

const ESTATS = ['pendent', 'llistat', 'venut', 'desert', 'despatxat'];
const enter = (x) => (x == null || x === '' ? null : Math.round(Number(x)));

export async function onRequestGet({ env, data }) {
  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(data.usuari.id).first();
  if (!equip) return json({ jugadors: [] });
  const inst = await env.DB.prepare('SELECT id FROM instantanies WHERE equip_id=? ORDER BY data DESC, id DESC LIMIT 1').bind(equip.id).first();
  if (!inst) return json({ jugadors: [] });

  const { results: totsJugadors } = await env.DB.prepare(
    `SELECT j.id AS jugador_id, j.nom, j.especialitat, ij.posicio_ultim_partit AS posicio, ij.edat_anys,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada,
            ij.lleialtat, ij.qualificacio_ultim_partit, ij.sou, ij.lesio, ij.transferible,
            ij.edat_dies, ij.experiencia, ij.lideratge, ij.tsi,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada,
            v.data_llistada, v.estat, v.resultat_pendent
       FROM instantanies_jugadors ij JOIN jugadors j ON j.id = ij.jugador_id
       LEFT JOIN vendes v ON v.jugador_id = j.id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  // QUI SURT ACÍ ÉS EXACTAMENT QUI SURT A PLANTILLA/VENDA. Abans es filtrava per la categoria
  // vella (`categoria='venda'`, del PAS 6) i la pantalla de Plantilla ja no la gasta: les dues
  // llistes podien no coincidir. Ara les dues llegixen el GRUP de l'assignació d'estructura.
  const eco = await economia(env.DB, data.usuari.id);
  const est = await onzeEstructura(env.DB, data.usuari.id, totsJugadors, eco.sou_sostenible_setmanal);
  const jugadors = totsJugadors.filter((j) => est?.grups.get(j.jugador_id) === 'venda');

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
    // Tots els d'esta llista són sobrants PER CONSTRUCCIÓ: el filtre és el grup «venda», que
    // vol dir justament «no ocupa cap lloc del pla, no entrena, i no és el futur entrenador ni
    // el porter suplent». Ja no penja de la categoria vella.
    const esSobrant = true;
    // El DESERT no arriba ni ací: la consulta ja l'ha deixat fora. Un jugador que ha eixit a
    // subhasta i ningú l'ha volgut NO torna a Vendes mai més —ni fitxa, ni píndola, ni
    // missatge—: no és transferible i l'única cosa que se'n pot fer és despatxar-lo, que és
    // una decisió de PLANTILLA. Del mercat, amb ell, ja no es parla.
    return { ...j, estat: j.estat || 'pendent', valor, puntuacio: punts[i] ?? null,
      tancament_previst: tancament(j.data_llistada), lesionat: esLesionat(j.lesio),
      es_sobrant: esSobrant };
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
      // Cos DISPONIBLE: el MATEIX compte que fa el motor d'alertes, i per això la mateixa
      // funció. Qui entrena ix del GRUP (`est.entrenen`), no d'una categoria que ja no existix.
      const { cos_camp: cosCamp, cos_porter: cosPorter } = cosDisponible(totsJugadors,
        est?.entrenen ?? new Set(), { posicio_porter: porterPos,
          llistats: new Set(totsJugadors.filter((j) => j.estat === 'llistat').map((j) => j.jugador_id)) });
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
