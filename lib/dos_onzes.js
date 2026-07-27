// Tonico — ELS DOS ONZES (PAS 9), muntats damunt de l'assignació d'estructura.
//
//   11A · el COMPETITIU: l'onze ideal tal qual. Els millors a cada lloc del pla.
//   11B · el RESULTANT: el que ix quan els que han d'entrenar entren i la resta dobla.
//
// L'11B no es torna a optimitzar: es COMPON. Els llocs que entrenen al 100% són dels
// entrenables —eixe és el seu motiu d'existir—, la porteria és del suplent perquè el porter no
// dobla, el futur entrenador entra si no juga ja a l'11A (juga per experiència, no per nivell)
// i tot el que queda el cobrixen els mateixos de l'11A, que no entrenen i poden doblar.
import { onzeEstructura } from './onze_estructura.js';

const num = (v) => (v == null ? 0 : Number(v));

export async function dosOnzes(db, usuariId, jugadors, souSostenibleSetmanal = null) {
  const est = await onzeEstructura(db, usuariId, jugadors, souSostenibleSetmanal);
  if (!est) return null;
  const id = (j) => j?.id ?? j?.jugador_id ?? null;

  // L'11B parteix de l'11A: qui no entrena, dobla.
  const b = est.onze.map((l) => ({ ...l, jugador: l.jugador, motiu: 'dobla' }));
  const ocupats = new Set();

  // 1 · Els llocs que entrenen AL 100% són dels ENTRENABLES, per orde de tria.
  let i = 0;
  for (const l of b) {
    if (!l.entrena || (l.pct ?? 100) !== 100) continue;
    const jove = est.entrenables[i++];
    if (!jove) { l.jugador = null; l.motiu = 'plaça_buida'; continue; }
    l.jugador = jove; l.motiu = 'entrena'; ocupats.add(id(jove));
  }

  // 2 · La PORTERIA, del suplent: el porter no dobla.
  const por = b.find((l) => l.bucket === 'porter');
  if (por && est.porter_suplent) { por.jugador = est.porter_suplent; por.motiu = 'suplent'; ocupats.add(id(est.porter_suplent)); }

  // 3 · El FUTUR ENTRENADOR, si no juga ja a l'11A: en la seua MILLOR posició de les que
  // queden. Juga per EXPERIÈNCIA —és el que abarateix reconvertir-lo—, no perquè siga millor
  // que el que desplaça, i per això no competix amb els llocs d'entrenament ni amb la porteria.
  const aOnzeA = new Set(est.onze.map((l) => id(l.jugador)).filter(Boolean));
  const fe = est.futur_entrenador;
  if (fe && !aOnzeA.has(id(fe))) {
    const lliures = b.filter((l) => l.motiu === 'dobla');
    const millor = lliures.sort((x, y) => num(fe[y.habilitat]) - num(fe[x.habilitat]))[0];
    if (millor) { millor.jugador = fe; millor.motiu = 'experiencia'; ocupats.add(id(fe)); }
  }

  return { onze_a: est.onze, onze_b: b, estructura: est };
}
