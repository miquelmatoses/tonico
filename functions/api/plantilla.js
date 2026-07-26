// Tonico — vista de plantilla sènior: jugadors de l'última instantània amb la
// seua categoria vigent (puntuació + justificació + origen).
// La PUNTUACIÓ es DERIVA de la instantània actual i la config (no del valor desat
// a categories_jugador, que pot ser ranci/null en desplaçats estables).
import { temporadaOperativa } from '../../lib/calendari.js';
import { avaluaPuntuacio } from '../../lib/classificador.js';
import { carregaConfigPla } from '../../lib/config_pla.js';
import { sqlCategoriaVigent } from '../../lib/categoria_vigent.js';
import { desertsDesats, despatxable } from '../../lib/vendes.js';
import { onzeEstructura } from '../../lib/onze_estructura.js';
import { economia } from '../../lib/economia.js';

export async function onRequestGet({ env, data }) {
  const equip = await env.DB.prepare("SELECT id FROM equips WHERE usuari_id = ? AND tipus = 'senior'")
    .bind(data.usuari.id).first();
  if (!equip) return json({ error: 'sense_equips' }, 409);

  const inst = await env.DB.prepare(
    'SELECT id, data, temporada, setmana_temporada FROM instantanies WHERE equip_id = ? ORDER BY data DESC, id DESC LIMIT 1'
  ).bind(equip.id).first();
  if (!inst) return json({ instantania: null, jugadors: [], intercanvis: [] });
  // Temporada operativa (mateix criteri que el parte i el pla)
  const tempSetmanes = parseInt((await env.DB.prepare("SELECT valor FROM constants_joc WHERE clau='temporada_setmanes'").first())?.valor || '16', 10);
  const op = temporadaOperativa(inst.temporada, inst.setmana_temporada, tempSetmanes);
  inst.temporada = op.temporada;
  inst.setmana_temporada = op.setmana;

  const { results: jugadors } = await env.DB.prepare(
    `SELECT j.id, j.nom, j.especialitat, ij.posicio_ultim_partit AS posicio,
            ij.edat_anys, ij.edat_dies, ij.tsi, ij.sou, ij.experiencia, ij.lideratge,
            ij.lleialtat, ij.qualificacio_ultim_partit, ij.lesio, ij.transferible,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada,
            c.categoria, c.puntuacio, c.justificacio, c.origen
       FROM instantanies_jugadors ij
       JOIN jugadors j ON j.id = ij.jugador_id
       LEFT JOIN ${sqlCategoriaVigent(['categoria', 'puntuacio', 'justificacio', 'origen'])} c ON c.jugador_id = j.id
      WHERE ij.instantania_id = ?
      ORDER BY c.puntuacio DESC`
  ).bind(inst.id).all();

  // DESPATXABLE viu ací i no a la fitxa de venda: és la decisió de qui es queda a la
  // plantilla. Ix del fet DESAT (va eixir a subhasta i ningú el va voler) i no d'una transició
  // entre instantànies, que es perd a la pujada següent. Només val per als sobrants: per a un
  // retingut, una subhasta deserta no és un veredicte sobre el jugador.
  const deserts = await desertsDesats(env.DB, data.usuari.id);
  for (const j of jugadors) {
    j.desert = deserts.has(j.id);
    j.despatxar = despatxable({ es_sobrant: j.categoria === 'venda', desert: j.desert });
  }

  const { results: intercanvis } = await env.DB.prepare(
    `SELECT x.id, x.categoria, x.diferencia, x.desti_eixent, x.puntuacio_entrant, x.puntuacio_eixent,
            je.nom AS entrant, js.nom AS eixent
       FROM intercanvis x
       LEFT JOIN jugadors je ON je.id = x.entrant_id
       JOIN jugadors js ON js.id = x.eixent_id
      WHERE x.usuari_id = ? AND x.estat = 'pendent' ORDER BY x.diferencia DESC`
  ).bind(data.usuari.id).all();

  // Config de la plantilla per DERIVAR la puntuació de cada jugador a la seua categoria.
  const pla = await env.DB.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(data.usuari.id).first();
  const config = pla ? await carregaConfigPla(env.DB, pla.plantilla) : { categories: [], params: {} };
  const specCat = new Map(config.categories.map((c) => [c.categoria, c.parametres?.puntuacio]));
  const valorEsp = config.params?.valor_especialitats || [];
  for (const j of jugadors) {
    const spec = specCat.get(j.categoria);
    const p = spec ? avaluaPuntuacio(spec, j, config.params) : null;
    j.puntuacio = p != null ? p : (j.puntuacio ?? null);     // deriva; si la categoria no puntua, conserva el desat
  }
  jugadors.sort((a, b) => (b.puntuacio ?? -Infinity) - (a.puntuacio ?? -Infinity));

  // L'ONZE TITULAR: tots els jugadors col·locats lloc a lloc, no una categoria decidida abans.
  // Els llocs es recorren per pes i cada jugador n'ocupa un: els que sobren són el residu, no
  // una classificació. Ací només es mostra; qui el gastarà per a mesurar és el PAS 5.
  const eco = await economia(env.DB, data.usuari.id);
  const est = await onzeEstructura(env.DB, data.usuari.id, jugadors, eco.sou_sostenible_setmanal);

  return json({ instantania: inst, jugadors, intercanvis, valor_especialitats: valorEsp,
    onze_titular: est ? est.onze.map((l) => ({ bucket: l.bucket, habilitat: l.habilitat,
      entrena: !!l.entrena, nivell_objectiu: l.nivell_objectiu,
      jugador_id: l.jugador?.id ?? null })) : null });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
