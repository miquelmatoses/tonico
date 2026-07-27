// Tonico — ELS DOS ONZES (PAS 9), muntats damunt de l'assignació d'estructura.
//
//   11A · el COMPETITIU: l'onze ideal tal qual. Els millors a cada lloc del pla.
//   11B · el RESULTANT: el que ix quan els que han d'entrenar entren i la resta dobla.
//
// L'11B no es torna a optimitzar: es COMPON, en este orde.
//
//   1. els 3 ENTRENABLES als mig centres (entrenen al 100%)
//   2. els 2 EXTREMS titulars als extrems — entrenen al 50%, o siga que el seu lloc TAMBÉ és
//      entrenament i no es cedix: doblen ells sí o sí
//   3. el PORTER SUPLENT a la porteria, perquè el porter no dobla
//   4. el FUTUR ENTRENADOR, si no està ja en cap dels anteriors, al millor lloc que quede
//   5. i els llocs que encara queden buits, doblant els titulars de l'11A
import { onzeEstructura } from './onze_estructura.js';

const num = (v) => (v == null ? 0 : Number(v));

export async function dosOnzes(db, usuariId, jugadors, souSostenibleSetmanal = null) {
  const est = await onzeEstructura(db, usuariId, jugadors, souSostenibleSetmanal);
  if (!est) return null;
  const id = (j) => j?.id ?? j?.jugador_id ?? null;

  // L'11B parteix de l'11A: qui no entrena, dobla.
  const b = est.onze.map((l) => ({ ...l, jugador: l.jugador, motiu: 'dobla' }));
  const ocupats = new Set();

  // 1 · Els llocs que entrenen AL 100% (els mig centres) són dels ENTRENABLES.
  let i = 0;
  for (const l of b) {
    if (!l.entrena || (l.pct ?? 100) !== 100) continue;
    const jove = est.entrenables[i++];
    if (!jove) { l.jugador = null; l.motiu = 'plaça_buida'; continue; }
    l.jugador = jove; l.motiu = 'entrena'; ocupats.add(id(jove));
  }

  // 2 · Els EXTREMS són dels titulars, i ho són SÍ O SÍ: entrenen al 50%, o siga que eixe lloc
  // també és entrenament i no es pot cedir a ningú. Doblen ells.
  for (const l of b) {
    if (l.entrena && (l.pct ?? 100) !== 100 && l.jugador) { l.motiu = 'entrena_mig'; ocupats.add(id(l.jugador)); }
  }

  // 3 · La PORTERIA, del suplent: el porter no dobla.
  const por = b.find((l) => l.bucket === 'porter');
  if (por && est.porter_suplent) { por.jugador = est.porter_suplent; por.motiu = 'suplent'; ocupats.add(id(est.porter_suplent)); }

  // 4 · El FUTUR ENTRENADOR, si no està ja en cap dels anteriors: en la seua MILLOR posició de
  // les que QUEDEN. Juga per EXPERIÈNCIA —és el que abarateix reconvertir-lo—, no perquè siga
  // millor que qui desplaça, i per això no toca cap lloc que entrene ni la porteria.
  const aOnzeA = new Set(est.onze.map((l) => id(l.jugador)).filter(Boolean));
  const fe = est.futur_entrenador;
  if (fe && !aOnzeA.has(id(fe))) {
    const lliures = b.filter((l) => l.motiu === 'dobla');
    const millor = lliures.sort((x, y) => num(fe[y.habilitat]) - num(fe[x.habilitat]))[0];
    if (millor) { millor.jugador = fe; millor.motiu = 'experiencia'; ocupats.add(id(fe)); }
  }

  return { onze_a: est.onze, onze_b: b, estructura: est };
}
