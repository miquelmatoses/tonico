// Tonico — L'HISTÒRIC D'UNA HABILITAT: quan va arribar a on està, i què li va costar l'anterior.
//
// L'històric de pujades es guarda sencer (una instantània per dia i equip), o siga que això no
// es pregunta ni se suposa: es llig. D'ací ixen les DUES xifres del «10(6)»:
//
//   · el que li va costar l'últim nivell → MESURAT, si la pujada va passar mentre es pujava CSV
//   · quant porta acumulat del nivell d'ara → per a no dir-li «10» a qui ja en porta la meitat
//
// Miquel: «assumim que és .0 des de la primera setmana de dades». O siga que si el primer dia
// que el veiem ja estava al nivell N, es compta des d'eixe dia, i el sub-nivell que portara
// d'abans no s'inventa: es dona per zero i el número ix un poc alt, mai un poc baix.
export async function historicHabilitat(db, equipId, habilitat) {
  const { results } = await db.prepare(
    `SELECT ij.jugador_id, i.data, ij.${habilitat} AS valor
       FROM instantanies_jugadors ij JOIN instantanies i ON i.id = ij.instantania_id
      WHERE i.equip_id = ? AND ij.${habilitat} IS NOT NULL
      ORDER BY ij.jugador_id, i.data`
  ).bind(equipId).all();

  const out = new Map();
  const perJugador = new Map();
  for (const r of results) {
    if (!perJugador.has(r.jugador_id)) perJugador.set(r.jugador_id, []);
    perJugador.get(r.jugador_id).push(r);
  }
  const setmanes = (a, b) => Math.round(((Date.parse(b) - Date.parse(a)) / 604800000) * 10) / 10;

  for (const [id, files] of perJugador) {
    // Els CANVIS de nivell que hem VIST. La primera observació no és un canvi: no sabem quan
    // va entrar en eixe nivell, o siga que el que portara acumulat d'abans no es compta.
    const salts = [];
    for (let i = 1; i < files.length; i++) {
      if (files[i].valor !== files[i - 1].valor) salts.push({ data: files[i].data, de: files[i - 1].valor, a: files[i].valor });
    }
    const ultim = files[files.length - 1].valor;
    const darrer = salts[salts.length - 1] ?? null;
    // Un nivell sencer només es pot mesurar amb DOS canvis vistos: el d'entrada i el d'eixida.
    // Amb un de sol sabem quan va arribar on està, però no quant va durar el nivell anterior
    // —podia portar-hi mesos abans que començàrem a mirar—. I un salt de dos nivells de colp
    // tampoc val: el nivell del mig no s'ha vist.
    const previ = salts[salts.length - 2] ?? null;
    const anterior = darrer && previ && darrer.a === darrer.de + 1
      ? setmanes(previ.data, darrer.data) : null;
    // Quant fa que el veiem en el nivell d'ara. Si mai l'hem vist canviar, des del primer dia:
    // és una cota per davall, i això fa que el «li queden X» isca alt, mai baix.
    const desDe = darrer ? darrer.data : files[0].data;
    out.set(id, { nivell: ultim, des_de: desDe,
      setmanes_al_nivell: setmanes(desDe, files[files.length - 1].data),
      setmanes_anterior: anterior });
  }
  return out;
}
