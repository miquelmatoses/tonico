// Tonico — DERIVACIÓ de l'estat LLISTAT de la columna Transferible del CSV. Es crida una
// volta desada la instantània sènior. Tres transicions:
//  · APAREIX transferible=1 → marca la fitxa de venda com LLISTADA; data de llistada
//    estimada = data de la instantània on apareix per primera vegada (EDITABLE per l'usuari;
//    el tancament previst = data + dies_subhasta el calcula el GET de vendes).
//  · PERSISTIX transferible=1 → es queda llistat (respecta els estats terminals).
//  · DESAPAREIX transferible buit mentres estava LLISTAT i sense venda apuntada → marca
//    resultat_pendent: la pregunta bona «subhasta deserta o venut? apunta el resultat».
export async function derivaLlistat(db, usuariId, dataInstantania, instId) {
  const { results: files } = await db.prepare(
    'SELECT jugador_id, transferible FROM instantanies_jugadors WHERE instantania_id=?'
  ).bind(instId).all();
  const { results: vendes } = await db.prepare(
    `SELECT v.jugador_id, v.estat, v.preu_venut FROM vendes v
       JOIN jugadors j ON j.id=v.jugador_id JOIN equips e ON e.id=j.equip_id WHERE e.usuari_id=?`
  ).bind(usuariId).all();
  const vPerId = new Map(vendes.map((v) => [v.jugador_id, v]));
  const lots = [];
  for (const f of files) {
    const transf = f.transferible === 1;
    const v = vPerId.get(f.jugador_id);
    if (transf) {
      if (!v) {
        lots.push(db.prepare("INSERT INTO vendes (jugador_id, usuari_id, estat, data_llistada) VALUES (?,?,'llistat',?)").bind(f.jugador_id, usuariId, dataInstantania));
      } else if (v.estat === 'pendent') {   // marca llistat; respecta venut/desert/despatxat
        lots.push(db.prepare("UPDATE vendes SET estat='llistat', data_llistada=COALESCE(data_llistada,?), resultat_pendent=0 WHERE jugador_id=?").bind(dataInstantania, f.jugador_id));
      }
    } else if (v && v.estat === 'llistat' && v.preu_venut == null) {
      lots.push(db.prepare('UPDATE vendes SET resultat_pendent=1 WHERE jugador_id=?').bind(f.jugador_id));
    }
  }
  if (lots.length) await db.batch(lots);
}
