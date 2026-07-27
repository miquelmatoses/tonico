// Tonico — COBERTURA MÍNIMA v3 (LEAN): la plantilla mínima és EXACTAMENT el que els
// dos onzes necessiten en setmana neta, sense cap coixí permanent. Es DERIVA de la
// config (formació + rols + entrenament); canviar-la canvia el mínim. Les absències
// reals (lesió/sanció) es gestionen QUAN passen (jugar amb 10), no amb marge fix.
//
// ENTRENABLES OBJECTIU = capacitat d'entrenament de la setmana:
//   per partit, cada plaça `entrena` val pct/100 (MC 100% → 1 jugador; extrem 50% →
//   cal doblar-la als dos partits). × nombre de rols. Cas actual: (3×100 + 2×50) × 2 = 8.
//
// PLANTILLA MÍNIMA = entrenables + futur entrenador + porters + cos de camp:
//   · porters_minims: 1 per partit, cap reserva (pom, defecte 2 = 2 rols).
//   · camp_minim: els llocs que NO entrenen ni són de porteria, menys el futur
//     entrenador (que ja els ocupa als dos partits). Els cossos DOBLEN (mateixa plaça
//     als dos onzes), per això la base és per partit. SENSE marge d'absències.
//   Config actual: 8 + 1 + 2 + 4 = 15, derivat, no escrit.

// LA LIQUIDACIÓ RESPECTA TOT EL MÍNIM: si vendre tots els candidats deixaria una CLASSE
// (camp o porteria) per davall del seu mínim, se'n retenen els justos.
//
// Es retenen els de MENOR SOBRECOST, que és l'altra cara de l'ordre de venda (PAS 7: primer
// el que més et costa de més). Una sola vara per als dos costats: si has de quedar-te algú
// per a cobrir partits, queda't el que no et sagna. El sou només desempata.
//
// Abans la vara era una «puntuació de la categoria de venda» que en realitat estimava el
// valor de mercat del jugador —i el sistema diu que no n'estima cap.
//
// Un cos de despatx és coixí preferent abans de retindre res amb valor. Protegix camp I
// porters (abans els porters quedaven desprotegits: es podien vendre tots). Torna un Set
// d'ids que NO s'han de llistar.
const COIXI = new Set(['venda', 'despatx', 'despatxat']);
const valVenda = (j) => j.valor ?? j.preu_proposat ?? j.puntuacio ?? 0;

// Reté els `calen` de MENYS valor d'una classe perquè no baixe del seu mínim.
function retenClasse(membres, cos, minim) {
  if (!(minim > 0)) return [];
  const resta = Math.max(0, cos - membres.length);      // cossos de la classe que queden si es venen TOTS els candidats
  const calen = Math.max(0, minim - resta);
  if (calen <= 0) return [];
  const ordre = membres.slice().sort((a, b) =>
    (COIXI.has(a.categoria) ? 0 : 1) - (COIXI.has(b.categoria) ? 0 : 1)   // el coixí primer
    || valVenda(a) - valVenda(b)                                          // després, menys valor de venda
    || (a.sou ?? 0) - (b.sou ?? 0));                                      // i el sou només desempata
  return ordre.slice(0, calen);
}

// Torna { ids:Set, camp:n, porters:m }: qui es reté i el desglossament per classe.
export function retencioCobertura(candidats, { camp_minim = 0, cos_camp = 0, porters_minims = 0, cos_porter = 0, posicio_porter = 'PO' } = {}) {
  const cand = candidats || [];
  const camp = retenClasse(cand.filter((j) => j.posicio !== posicio_porter), cos_camp, camp_minim);
  const porters = retenClasse(cand.filter((j) => j.posicio === posicio_porter), cos_porter, porters_minims);
  return { ids: new Set([...camp, ...porters].map((j) => j.jugador_id)), camp: camp.length, porters: porters.length };
}

// Capacitat d'entrenament: jugadors que poden acabar la setmana al 100%.
function entrenablesObjectiu(slots = [], nRols = 1) {
  const perPartit = slots.filter((s) => s.entrena)
    .reduce((n, s) => n + (s.pct ?? 100) / 100, 0);
  return Math.round(perPartit * nRols);
}

// Mínims derivats. `config` = {slots, rols}; `opts` = poms + si el pla té futur entrenador.
export function cobertura(config = {}, opts = {}) {
  const slots = config.slots || [];
  const nRols = (config.rols || []).length || 1;
  const { porters_minims = 2, futur_entrenador = 0, bucket_porter = 'porter' } = opts;

  const entrenables_objectiu = entrenablesObjectiu(slots, nRols);
  const nEntrena = slots.filter((s) => s.entrena).length;
  const nPorter = slots.filter((s) => s.bucket === bucket_porter).length;
  // Llocs de camp que no entrenen (per partit): els cobrixen el futur entrenador i el cos
  // (que dobla als dos onzes). LEAN: cap marge d'absències.
  const restants = Math.max(0, slots.length - nEntrena - nPorter);
  const camp_minim = Math.max(0, restants - futur_entrenador);
  const total = entrenables_objectiu + futur_entrenador + porters_minims + camp_minim;

  return {
    entrenables_objectiu, futur_entrenador, porters_minims, camp_minim, total,
    detall: { places_entrena: nEntrena, places_porter: nPorter, llocs_restants: restants, rols: nRols },
  };
}

// EL COS DISPONIBLE per classe: qui pot cobrir partits sense trencar l'entrenament ni un
// llistat en marxa. És el número que decidix a quanta gent es reté de la liquidació.
//
// Viu ací i no dins de cada consumidor perquè el miren dos —el motor d'alertes i Vendes— i
// han de retindre EXACTAMENT els mateixos jugadors. Quan eren dues còpies (una consulta SQL
// per un costat i un filtre en JS per l'altre) totes dues comptaven per la categoria vella,
// i el dia que es va deixar d'escriure haurien contat tothom com a disponible sense dir res.
export function cosDisponible(jugadors, entrenen, opts = {}) {
  const { posicio_porter = 'PO', llistats = new Set(), id = (j) => j.jugador_id } = opts;
  const lliure = (j) => !entrenen.has(id(j)) && j.transferible !== 1 && !llistats.has(id(j));
  return {
    cos_camp: jugadors.filter((j) => lliure(j) && j.posicio !== posicio_porter).length,
    cos_porter: jugadors.filter((j) => lliure(j) && j.posicio === posicio_porter).length,
  };
}
