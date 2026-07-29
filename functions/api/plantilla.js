// Tonico — vista de plantilla sènior: els jugadors de l'última instantània, repartits en
// les sis seccions que derivа l'assignació d'estructura. Ja no hi ha CATEGORIA: el PAS 6
// decidia qui es quedava abans de saber qui ocupa cada lloc, i cap secció el gastava.
import { setmanaDeHui } from '../../lib/calendari.js';
import { desertsDesats } from '../../lib/vendes.js';
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
  // La capçalera diu EN QUINA SETMANA ESTEM, i això ho diu el calendari, no el fitxer.
  const op = await setmanaDeHui(env.DB);
  inst.temporada = op.temporada;
  inst.setmana_temporada = op.setmana;

  const { results: jugadors } = await env.DB.prepare(
    `SELECT j.id, j.nom, j.especialitat, ij.posicio_ultim_partit AS posicio,
            ij.edat_anys, ij.edat_dies, ij.tsi, ij.sou, ij.experiencia, ij.lideratge,
            ij.lleialtat, ij.qualificacio_ultim_partit, ij.lesio, ij.amonestacions, ij.transferible,
            ij.porteria, ij.defensa, ij.creativitat, ij.extrem, ij.passades, ij.anotacio, ij.pilota_aturada
       FROM instantanies_jugadors ij
       JOIN jugadors j ON j.id = ij.jugador_id
      WHERE ij.instantania_id = ?`
  ).bind(inst.id).all();

  // DESPATXABLE viu ací i no a la fitxa de venda: és la decisió de qui es queda a la
  // plantilla. Ix del fet DESAT (va eixir a subhasta i ningú el va voler) i no d'una transició
  // entre instantànies, que es perd a la pujada següent. Només val per als sobrants: per a un
  // retingut, una subhasta deserta no és un veredicte sobre el jugador.

  // L'ORDE de cada secció el posa la mateixa secció (l'onze va per formació, els entrenables
  // per setmanes, la venda pel sobrecost). Ací ja no s'ordena res: ordenar per la puntuació
  // de la categoria era ordenar onze jugadors mesurats amb fórmules distintes.
  // L'ONZE TITULAR: tots els jugadors col·locats lloc a lloc, no una categoria decidida abans.
  // Els llocs es recorren per pes i cada jugador n'ocupa un: els que sobren són el residu, no
  // una classificació. Ací només es mostra; qui el gastarà per a mesurar és el PAS 5.
  const eco = await economia(env.DB, data.usuari.id);
  const est = await onzeEstructura(env.DB, data.usuari.id, jugadors, eco.sou_sostenible_setmanal, eco.calibrat);
  // DESPATXABLE ix del GRUP, no de la categoria vella: «va eixir a subhasta, ningú el va voler,
  // i no ocupa cap lloc del pla». Amb `categoria === 'venda'` eren dues derivacions distintes
  // de la mateixa cosa i podien discrepar amb el que pinta la secció de Despatxar.
  const deserts = await desertsDesats(env.DB, data.usuari.id);
  for (const j of jugadors) {
    j.desert = deserts.has(j.id);
    j.despatxar = est?.grups.get(j.id) === 'despatxar';
  }

  return json({ instantania: inst, jugadors,
    // EL PERFIL VA A LA FILA. La pantalla ha de poder pintar, al costat de les habilitats que
    // el jugador té, les que tindria el jugador ideal per a eixe lloc: és l'única manera de
    // vore d'un colp d'ull què li falta. `mancances` és eixa resta ja feta, i `distancia` la
    // mateixa cosa en un número per a ordenar.
    onze_titular: est ? est.onze.map((l) => ({ bucket: l.bucket,
      entrena: !!l.entrena, perfil_objectiu: l.perfil_objectiu, mancances: l.mancances,
      distancia: l.distancia, senyal: l.senyal,
      jugador_id: l.jugador?.id ?? null })) : null,
    // ENTRENABLES: els joves que entrenaran als llocs del motor quan els titulars descansen, i
    // que es venen cars quan han crescut. Ixen del residu de l'onze, no d'una categoria.
    entrenables: est ? { habilitat: est.habilitat_entrenament, places: est.entrenables_max,
      nivell_objectiu: est.entrenables_objectiu,
      jugadors: est.entrenables.map((j) => ({ id: j.id, diferencia: j.diferencia, senyal: j.senyal,
        setmanes_seguent: j.setmanes_seguent, setmanes_anterior: j.setmanes_anterior })) } : null,
    // LESIONATS I SANCIONATS: els que SÍ que anirien a l'onze i esta setmana no hi poden estar.
    // Ix de la diferència entre les dues passades de l'assignació (qui hauria de jugar contra
    // qui juga), o siga que no és una llista a banda: és el forat que deixen.
    aturats: est ? est.aturats.map((j) => ({ id: j.id, lesio: j.lesio ?? null,
      amonestacions: j.amonestacions ?? null })) : null,
    // FUTUR ENTRENADOR: el del residu amb més experiència, i què val reconvertir-lo. PORTER
    // SUPLENT: el porter més barat que queda — és l'únic lloc de la segona alineació que
    // obliga a mantindre algú expressament, perquè el porter no dobla.
    futur_entrenador: est?.futur_entrenador
      ? { jugador_id: est.futur_entrenador.id, experiencia: est.futur_entrenador.experiencia,
          lideratge: est.futur_entrenador.lideratge, reconversio: est.reconversio } : null,
    porter_suplent: est?.porter_suplent
      ? { jugador_id: est.porter_suplent.id, porteria: est.porter_suplent.porteria,
          sou: est.porter_suplent.sou } : null,
    // El que no entra en cap de les quatre seccions se'n va: a VENDA, o a DESPATXAR si ja va
    // eixir a subhasta i ningú el va voler (eixos no es tornen a llistar).
    venda: est ? est.venda.map((j) => j.id) : null,
    despatxar: est ? est.despatxar.map((j) => j.id) : null });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
