// Tonico — LA PUNTUACIÓ D'UN JUGADOR, avaluada contra una fórmula declarada.
//
// D'ací se n'ha anat l'EMBUT de categories (el PAS 6): repartia la plantilla en core, rotatiu,
// titular, porter i cos ABANS de saber qui ocupa cada lloc, i desava el resultat com a estat
// derivat que quedava ranci. Ara el grup ix de l'assignació d'estructura, cada volta.
//
// El que queda és el mecanisme: una fórmula declarada (`plantilles_categories.parametres`) i
// un jugador, i el número que ix. L'usa la VENDA per a ordenar qui se'n va primer —una sola
// vara per a tots, no una fórmula distinta per categoria.
//
// Un jugador és un objecte pla amb els camps de la instantània accessibles per
// nom (creativitat, edat_anys, experiencia, ...) + `posicio` + `especialitat`.

// ── Camps derivats (mecanisme genèric, política per paràmetres) ──
const HABILITATS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];

function resolField(camp, jugador, params) {
  if (camp === 'habilitat_max') return Math.max(...HABILITATS.map((h) => num(jugador[h])));
  if (camp === 'especialitat_valuosa') return (params.valor_especialitats || []).includes(jugador.especialitat) ? 1 : 0;
  return num(jugador[camp]);
}

const num = (v) => (typeof v === 'number' ? v : (v == null || v === '' ? 0 : Number(v))) || 0;

// Bucket de posició (p.ex. 'mc'/'extrem', o 'porter'/'DC'/'lateral') segons un
// mapa {bucket: [posicions]}. Cada categoria amb places porta el seu propi mapa.
export function avaluaPuntuacio(spec, jugador, params) {
  if (!spec || !spec.termes) return 0;
  let s = spec.constant || 0;
  for (const t of spec.termes) {
    let v = resolField(t.camp, jugador, params);
    if (t.desde != null) v = t.desde - v;     // marge (p.ex. 20 − edat)
    s += t.pes * v;
  }
  return s;
}

function compara(a, op, b) {
  switch (op) {
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '<': return a < b;
    case '==': return a === b;
    default: return false;
  }
}
