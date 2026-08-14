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
//   5. la resta, doblant els titulars de l'11A; i si un lloc s'ha quedat sense el seu
//      —l'entrenable se n'ha anat a entrenar— l'ompli el MILLOR que no jugue ja eixe partit
import { onzeEstructura } from './onze_estructura.js';
import { assignaEstructura } from './onze.js';
import { equivalent } from './pesos.js';

const num = (v) => (v == null ? 0 : Number(v));

export async function dosOnzes(db, usuariId, jugadors, souSostenibleSetmanal = null) {
  const est = await onzeEstructura(db, usuariId, jugadors, souSostenibleSetmanal);
  if (!est) return null;
  const id = (j) => j?.id ?? j?.jugador_id ?? null;

  // L'11B parteix de l'11A: qui no entrena, dobla.
  const b = est.onze.map((l) => ({ ...l, jugador: l.jugador, motiu: 'dobla' }));
  const ocupats = new Set();

  // 1 · Els llocs que entrenen AL 100% (els mig centres) són dels ENTRENABLES. Si una lesió
  // l'ha arrossegat a l'onze A (i per tant a la còpia), ACÍ ENTRENA: el lloc que hi ocupava
  // es buida i l'ompli el pas 5.
  let i = 0;
  for (const l of b) {
    if (!l.entrena || (l.pct ?? 100) !== 100) continue;
    const jove = est.entrenables[i++];
    if (!jove) { l.jugador = null; l.motiu = 'plaça_buida'; continue; }
    const previ = b.find((x) => x !== l && x.jugador && id(x.jugador) === id(jove));
    if (previ) previ.jugador = null;
    l.jugador = jove; l.motiu = 'entrena'; ocupats.add(id(jove));
  }

  // 2 · Els EXTREMS són dels titulars, i ho són SÍ O SÍ: entrenen al 50%, o siga que eixe lloc
  // també és entrenament i no es pot cedir a ningú. Doblen ells.
  for (const l of b) {
    if (l.entrena && (l.pct ?? 100) !== 100 && l.jugador) { l.motiu = 'entrena_mig'; ocupats.add(id(l.jugador)); }
  }

  // 3 · La PORTERIA, del suplent: el porter no dobla.
  //
  // I si no n'hi ha, la porteria es queda BUIDA i es diu. Abans es quedava el titular amb el
  // motiu «dobla», que és justament l'única cosa que no pot passar: es pintava una alineació
  // legal que no ho és, i alhora Mercat demanava comprar un porter suplent. La regla del full
  // és la mateixa que per a les places d'entrenament: un lloc sense ningú es juga amb un
  // menys, i es diu.
  const por = b.find((l) => l.bucket === 'porter');
  if (por) {
    if (est.porter_suplent) { por.jugador = est.porter_suplent; por.motiu = 'suplent'; ocupats.add(id(est.porter_suplent)); }
    else { por.jugador = null; por.motiu = 'porteria_buida'; }
  }

  // 4 · El FUTUR ENTRENADOR, si no està ja en cap dels anteriors: en la seua MILLOR posició de
  // les que QUEDEN. Juga per EXPERIÈNCIA —és el que abarateix reconvertir-lo—, no perquè siga
  // millor que qui desplaça, i per això no toca cap lloc que entrene ni la porteria.
  const aOnzeA = new Set(est.onze.map((l) => id(l.jugador)).filter(Boolean));
  const fe = est.futur_entrenador;
  if (fe && !aOnzeA.has(id(fe))) {
    const lliures = b.filter((l) => l.motiu === 'dobla');
    // LA SEUA MILLOR POSICIÓ es mesura per CONTRIBUCIÓ, com l'onze A. Amb una sola habilitat,
    // este era l'últim lloc del sistema on la tria mirava el monocultiu: un porter reconvertit
    // se n'anava al lloc on tenia la seua habilitat més alta, no on aportava més.
    const val = (l) => (l.pesos_habilitat ? (equivalent(fe, l.pesos_habilitat) ?? 0) : num(fe[l.habilitat]));
    const millor = lliures.sort((x, y) => val(y) - val(x))[0];
    if (millor) { millor.jugador = fe; millor.motiu = 'experiencia'; ocupats.add(id(fe)); }
  }

  // 5 · Els llocs que s'han quedat SENSE NINGÚ —el seu titular se n'ha anat a un lloc
  // d'entrenament, o l'onze A ja el tenia buit— s'omplin amb el MILLOR disponible que no
  // jugue ja este partit: el mateix repartiment que l'onze, només sobre els llocs buits.
  // Les places d'entrenament NO: buides es queden i es diuen — l'entrenament perdut no es
  // tapa. I el porter titular tampoc entra al ventall: el porter no dobla.
  const buits = b.filter((l) => l.motiu === 'dobla' && !l.jugador);
  if (buits.length) {
    const enB = new Set(b.map((l) => id(l.jugador)).filter((x) => x != null));
    const porterA = id(est.onze.find((l) => l.bucket === 'porter')?.jugador);
    const ventall = jugadors.filter((j) => !enB.has(id(j)) && id(j) !== porterA
      && !est.no_disponibles.has(id(j)));
    const millors = new Map(assignaEstructura(ventall, buits).onze.map((l) => [l.lloc, l.jugador]));
    for (const l of buits) {
      const j = millors.get(l.lloc) ?? null;
      if (j) { l.jugador = j; l.motiu = 'omple'; }
    }
  }

  return { onze_a: est.onze, onze_b: b, estructura: est };
}
