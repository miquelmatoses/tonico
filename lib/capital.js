// Tonico — estimació del capital d'inflexió, DESGLOSSADA, perquè Paco no ho
// pregunte en fred (Polit #3.5). Universal: cada component ix de poms del pla
// (fets del món) o de dades reals (nòmina, comparables de mercat). L'usuari
// només confirma d'un clic o edita (i aleshores passa a override manual).
export async function estimaCapitalInflexio(db, usuariId, nomina) {
  const pla = await db.prepare('SELECT plantilla FROM plans WHERE usuari_id=? LIMIT 1').bind(usuariId).first();
  if (!pla) return null;
  const pom = async (clau, def) => parseFloat((await db.prepare(
    'SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?'
  ).bind(pla.plantilla, clau).first())?.valor ?? def);

  // 1. Reconversió (un futur_entrenador → entrenador): cost puntual, pom del pla.
  const reconversio = await pom('inflexio_cost_reconversio', 0);

  // 2. Fitxatges «P»: n × sostre. Sostre = mediana de preus observats (comparables
  //    reals) si n'hi ha; si no, el pom del pla.
  const nFitxatges = await pom('inflexio_fitxatges_n', 0);
  const { results: preus } = await db.prepare('SELECT preu FROM preus_observats WHERE usuari_id=?').bind(usuariId).all();
  const sostrePom = await pom('inflexio_sostre_fitxatge', 0);
  const sostre = preus.length ? mediana(preus.map((p) => p.preu)) : sostrePom;
  const fitxatges = Math.round(nFitxatges * sostre);

  // 3. Coixí de sou: X setmanes de nòmina REAL (derivada del sou de la instantània).
  const setmanesCoixi = await pom('inflexio_setmanes_coixi', 0);
  const coixiSou = nomina != null ? Math.round(setmanesCoixi * nomina) : 0;

  const total = reconversio + fitxatges + coixiSou;
  return {
    total,
    desglossament: [
      { concepte: 'reconversio', import: reconversio },
      { concepte: 'fitxatges', import: fitxatges, n: nFitxatges, sostre: Math.round(sostre), font: preus.length ? 'comparables' : 'pom' },
      { concepte: 'coixi_sou', import: coixiSou, setmanes: setmanesCoixi, nomina: nomina ?? 0 },
    ],
  };
}

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
