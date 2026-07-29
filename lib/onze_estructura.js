// Tonico — L'ONZE D'ESTRUCTURA: qui ocupa cada lloc del pla.
//
// Viu a banda perquè el consumixen dos: la pantalla de Plantilla (que el mostra) i, quan
// toque, el PAS 5 (que el gasta per a mesurar la mancança lloc a lloc en compte de fer-ho amb
// «el millor del bucket», que només mesurava cinc jugadors dels onze).
import { assignaEstructura, senyalDif } from './onze.js';
import { sobrecost } from './mancanca.js';
import { carregaConfigPesos, pesosFormacio, nivellsObjectiu } from './pesos.js';
import { llegixConfig } from './config.js';
import { llocsAmbHabilitat } from './orquestra_estoc.js';
import { desertsDesats } from './vendes.js';
import { carregaCoeficients, setmanesFinsAlSegüent, velocitat } from './entrenament_velocitat.js';
import { historicHabilitat } from './historic_habilitat.js';
import { esLesionat } from '../public/format.js';

const HABS = ['porteria', 'defensa', 'creativitat', 'extrem', 'passades', 'anotacio', 'pilota_aturada'];
const id = (j) => j.id ?? j.jugador_id;

// El preu de reconvertir-lo, de la taula de la guia «Coach», indexada per EXPERIÈNCIA. Es
// torna la fila sencera: quin nivell d'entrenador pot arribar a ser i quant val cada un.
async function preusReconversio(db, experiencia) {
  if (experiencia == null) return null;
  const f = await db.prepare("SELECT valor FROM constants_joc WHERE clau='coach_preu_reconversio'").first();
  if (!f?.valor) return null;
  const taula = JSON.parse(f.valor);
  return taula[String(experiencia)] ?? null;
}

// L'experiència mínima per a poder ser entrenador: la primera fila de la taula de la guia.
// No és un número escrit, és el que la taula admet.
async function experienciaMinima(db) {
  const f = await db.prepare("SELECT valor FROM constants_joc WHERE clau='coach_preu_reconversio'").first();
  if (!f?.valor) return null;
  const claus = Object.keys(JSON.parse(f.valor)).map(Number).filter(Number.isFinite);
  return claus.length ? Math.min(...claus) : null;
}

const pomEnter = async (db, plantilla, clau) =>
  (await db.prepare('SELECT valor FROM plantilles_parametres WHERE plantilla=? AND clau=?').bind(plantilla, clau).first())?.valor ?? null;
const constantEnter = async (db, clau) =>
  (await db.prepare('SELECT valor FROM constants_joc WHERE clau=?').bind(clau).first())?.valor ?? null;

export async function onzeEstructura(db, usuariId, jugadors, souSostenibleSetmanal = null, calibrat = false) {
  const conf = await llegixConfig(db, usuariId);
  const estrategia = conf?.estrategia ?? 'competitiva';
  const cfg = await carregaConfigPesos(db, estrategia);
  const llocs = await llocsAmbHabilitat(db, usuariId, estrategia, cfg.taula_habilitat_lloc || {});
  if (!llocs) return null;
  // El pes és per BUCKET i mana l'orde de tria: el lloc que més aporta agafa primer.
  const pesos = pesosFormacio([...new Set(llocs.map((l) => l.bucket))],
    cfg.posicio_aportacio, cfg.taula_aportacio, cfg.pes_sector);
  // El NIVELL OBJECTIU de cada lloc: el que el flux paga per a eixa habilitat. És la vara
  // contra la qual es llig cada ocupant, i per això va a la mateixa fila que ell.
  const nivells = nivellsObjectiu(llocs.map((l) => l.bucket), cfg, souSostenibleSetmanal);
  const ambPes = llocs.map((l) => ({ ...l, pes: pesos[l.bucket] ?? 0,
    // La que es mostra és la de HATTRICK: va al costat de «CR8» i han de ser la mateixa escala.
    nivell_objectiu: nivells?.[l.bucket]?.nivell_objectiu_ht ?? null }));
  // ── QUI NO POT JUGAR ─────────────────────────────────────────────────────────────────
  // L'onze d'estructura diu qui ha d'ocupar cada lloc, i durant tot el projecte ha ignorat
  // lesions i sancions a posta: és estructura, no alineació de dissabte. Però llavors un
  // lesionat de tres setmanes seguia eixint com a titular i no hi havia enlloc on es veiera
  // que eixe lloc, esta setmana, està BUIT.
  //
  // Es fa en dos passades a posta: la primera diu QUI HAURIA DE JUGAR i la segona QUI JUGA. La
  // diferència entre les dues és exactament la secció de lesionats i sancionats — els que sí
  // que anirien a l'alineació i no hi poden estar. Amb una sola passada, eixa llista no es pot
  // derivar: només sabries qui juga, no qui falta.
  const llindarSancio = Number(await pomEnter(db, estrategia, 'amonestacions_suspensio')) || null;
  const disponible = (j) => !esLesionat(j.lesio)
    && !(llindarSancio != null && Number(j.amonestacions ?? 0) >= llindarSancio);
  const ideal = assignaEstructura(jugadors, ambPes);
  const nodisponibles = jugadors.filter((j) => !disponible(j));
  const aturats = ideal.onze.filter((l) => l.jugador && !disponible(l.jugador)).map((l) => l.jugador);
  const aturatsIds = new Set(aturats.map(id));
  const real = nodisponibles.length ? assignaEstructura(jugadors.filter(disponible), ambPes) : ideal;
  const onze = real.onze;
  // Els que no poden jugar i TAMPOC anaven a l'onze no desapareixen: segueixen el seu camí
  // normal (venda, despatxar…). Només se n'aparten els que ocupaven un lloc.
  const sobrants = [...real.sobrants, ...nodisponibles.filter((j) => !aturatsIds.has(id(j)))];

  // EL SOBRECOST (PAS 5): el que pagues de més respecte del que el seu lloc mereix segons el
  // pressupost. És la vara de la VENDA —ordre_venda = sobrecost DESC, PAS 7— i la de la
  // retenció per cobertura, i per això es calcula ACÍ, una vegada, i no a cada consumidor.
  //
  // El lloc d'un jugador és aquell on la seua millor habilitat compta: un davanter es mesura
  // contra el que paga un davanter, no contra el mig centre que mai serà.
  //
  // STOPPER (PAS 7): sense CALIBRAR no es desfà de ningú pel sou. `sobrecost` penja de
  // `nivell_objectiu`, que penja del flux, i el flux amb poques setmanes declarades és
  // soroll. Es torna 0 per a tots: la fila seguix eixint, però ningú queda marcat com a
  // sobrepagat per una lectura provisional.
  const sobrecosts = new Map();
  const perBucket = Object.entries(nivells ?? {});
  for (const j of jugadors) {
    if (!calibrat || !perBucket.length) { sobrecosts.set(id(j), 0); continue; }
    const seu = perBucket
      .map(([, n]) => ({ n, hab: Number(j[n.habilitat] ?? 0) }))
      .sort((a, b) => b.hab - a.hab)[0];
    sobrecosts.set(id(j), sobrecost(j, seu.n.habilitat, seu.n.nivell_objectiu, cfg.taula_salaris) ?? 0);
  }

  // ENTRENABLES: els joves que ocuparan els llocs que ENTRENEN quan els titulars descansen, i
  // que es venen cars quan han crescut. Ixen del RESIDU de l'onze —no d'una categoria decidida
  // abans— i es trien pel mateix criteri que el full ja tenia per als rotatius: dins de la
  // finestra d'edat de venda i pels millors en l'habilitat que s'entrena.
  // Només els llocs que entrenen AL 100% (els mig centres): els extrems entrenen al 50% i no
  // són el motor. I un per cada partit EXTRA de la setmana, que és quan el titular descansa:
  // és la mateixa compta que el full ja tenia per als rotatius (`partits_setmana − 1`).
  const plens = llocs.filter((l) => l.entrena && (l.pct ?? 100) === 100);
  const habA = plens[0]?.habilitat ?? null;
  const partits = Number(conf?.partits_setmana) || 1;
  const quants = plens.length * Math.max(0, partits - 1);
  const creativitatMin = Number(await pomEnter(db, estrategia, 'entrenable_creativitat_min'));
  const edatLimit = Number(await pomEnter(db, estrategia, 'entrenable_edat_limit'));
  const anyDies = Number(await constantEnter(db, 'any_dies')) || 112;
  const dies = (j) => (j.edat_anys ?? 0) * anyDies + (j.edat_dies ?? 0);
  // Els entrenables porten el «10(6)»: el que els costarà el nivell següent i el que els va
  // costar l'actual. I es mesuren contra la MATEIXA vara que els llocs que entrenen.
  const objectiuA = plens[0] ? (nivells?.[plens[0].bucket]?.nivell_objectiu_ht ?? null) : null;
  const coefs = await carregaCoeficients(db);
  const equip = await db.prepare("SELECT id FROM equips WHERE usuari_id=? AND tipus='senior'").bind(usuariId).first();
  const hist = coefs && habA && equip ? await historicHabilitat(db, equip.id, habA) : new Map();
  // El nivell de l'entrenador és la PARAULA que es declara («passable»), no el número de
  // l'escala d'especialistes: eixe camp està a NULL a posta des de la 077.
  const ent = await db.prepare("SELECT coach_entrenament FROM personal_membres WHERE usuari_id=? AND rol='entrenador' LIMIT 1").bind(usuariId).first();
  const assist = (await db.prepare(
    "SELECT COALESCE(SUM(nivell),0) n FROM personal_membres WHERE usuari_id=? AND tipus='assistent'"
  ).bind(usuariId).first())?.n ?? 0;
  const intensitat = Number(await pomEnter(db, estrategia, 'entrenament_intensitat'));
  const resistencia = Number(await pomEnter(db, estrategia, 'entrenament_resistencia'));
  const ambCalcul = (j) => {
    const d = objectiuA == null ? null : Number(j[habA] ?? 0) - objectiuA;
    const h = hist.get(id(j)) ?? null;
    const base = { nivell: Number(j[habA] ?? 0), edat: Number(j.edat_anys ?? 0), habilitat: habA,
      entrenador: ent?.coach_entrenament ?? null, assistents: assist, intensitat, resistencia };
    // El que ja porta acumulat del nivell d'ara, derivat de fa quant que el veiem en ell.
    const T = coefs ? velocitat(coefs, base) : null;
    const sub = T && h ? Math.min(0.99, (h.setmanes_al_nivell ?? 0) * T) : 0;
    return { ...j, diferencia: d, senyal: senyalDif(d),
      setmanes_seguent: coefs ? setmanesFinsAlSegüent(coefs, base, sub) : null,
      setmanes_anterior: h?.setmanes_anterior ?? null };
  };

  // LA TRIA: mana l'HABILITAT, i entre dos iguals va primer el que està més a prop de pujar.
  //
  // L'ordre invers —menys setmanes primer— trau el contrari del que es busca: com més fluix és
  // un jugador, més ràpid puja de nivell (`f(nivell)` cau amb el nivell), o siga que un de
  // creativitat 2 puja en 2,6 setmanes i un de 9 en 6,8, i els fluixos desplaçarien els bons.
  // I els entrenables són per a vendre'ls cars.
  // QUI ENTRA. Dos filtres, i el segon no és un tall d'edat pla:
  //
  //  · CREATIVITAT MÍNIMA — entrenar costa setmanes, i invertir-les en algú que no arriba és
  //    tirar-les. És el mateix llistó amb què es compra: `entrenable_creativitat_min` el
  //    gasten les dues bandes, la tria i la necessitat de fitxatge.
  //  · LA PRÒXIMA PUJADA HA DE CAURE ABANS DEL LÍMIT — no «tindre menys de 20 anys». Un de
  //    20 i escaig que puja d'ací a cinc setmanes encara cobra eixa pujada; un de 19 que no
  //    pujarà fins passats els 21 ja no la cobrarà mai. I com que la pujada el fa més vell i
  //    la següent és més lenta, el criteri el trau tot sol JUST DESPRÉS d'haver pujat, que és
  //    quan val més. No cal cap segona regla per a això.
  const capABE = (j) => j.setmanes_seguent != null
    && dies(j) + j.setmanes_seguent * 7 < edatLimit * anyDies;
  const ambDif = (!habA || !creativitatMin || !edatLimit ? [] : sobrants
    .map(ambCalcul)
    .filter((j) => Number(j[habA] ?? 0) >= creativitatMin && capABE(j))
    .sort((a, b) => Number(b[habA] ?? 0) - Number(a[habA] ?? 0)
      || (a.setmanes_seguent ?? Infinity) - (b.setmanes_seguent ?? Infinity)
      || dies(a) - dies(b)))
    .slice(0, quants);

  const presos = new Set(ambDif.map((j) => id(j)));
  const resta = sobrants.filter((j) => !presos.has(id(j)));

  // ── PORTER SUPLENT ───────────────────────────────────────────────────────────────────
  // VA PRIMER, abans que el futur entrenador. El porter és una OBLIGACIÓ —el titular no pot
  // doblar— i el futur entrenador una OPORTUNITAT: amb l'orde al revés, un porter amb
  // experiència se n'anava de futur entrenador i el sistema es quedava sense porteria per al
  // segon onze, dient «et falta un porter suplent» mentres l'alineació el posava sota pals.
  //
  // I «porter» ja no es dedueix de les habilitats. Es demanava tindre la porteria per damunt
  // de TOTES les altres, i això deixava fora porters de veres: un que llança faltes té la
  // pilota aturada igual o més alta. Eixos se n'anaven a VENDA mentres la mateixa pantalla
  // demanava comprar-ne un. Ara és un llindar i prou: amb `porter_suplent_porteria_min` de
  // porteria ja pots posar-te sota pals, tingues el que tingues a la resta.
  //
  // Entre els que arriben mana el SOU: eixe lloc no compra res, només evita que el titular
  // haja de jugar dos partits.
  const porteriaMin = Number(await pomEnter(db, estrategia, 'porter_suplent_porteria_min'));
  const suplent = !porteriaMin ? null : resta
    .filter((j) => Number(j.porteria ?? 0) >= porteriaMin)
    .sort((a, b) => Number(a.sou ?? 0) - Number(b.sou ?? 0))[0] ?? null;
  if (suplent) presos.add(id(suplent));

  // ── FUTUR ENTRENADOR ─────────────────────────────────────────────────────────────────
  // El del RESIDU amb més experiència. L'experiència decidix fins a quin nivell d'entrenador
  // pot arribar i quant costa reconvertir-lo; el lideratge se'l queda gratis. No cal que jugue
  // per a res d'això: si va a la segona alineació és per a OMPLIR, i el sou ja el pagues.
  //
  // I NOMÉS SI ES POT RECONVERTIR. La taula de la guia comença en experiència 4: per davall no
  // hi ha cap nivell d'entrenador possible, o siga que proposar el «de més experiència» d'una
  // plantilla on tots en tenen 1 seria assenyalar algú per no res.
  const expMin = await experienciaMinima(db);
  const futur = resta.filter((j) => !presos.has(id(j)) && j.experiencia != null
      && (expMin == null || Number(j.experiencia) >= expMin))
    .sort((a, b) => Number(b.experiencia) - Number(a.experiencia)
      || Number(b.lideratge ?? 0) - Number(a.lideratge ?? 0))[0] ?? null;
  if (futur) presos.add(id(futur));

  // ── VENDA i DESPATXAR ────────────────────────────────────────────────────────────────
  // Tot el que no ha entrat en cap de les quatre seccions se'n va. No hi ha rotatius ni
  // cossos ni titulars: si no ocupes un lloc del pla, no entrenes i no eres el futur
  // entrenador ni el porter suplent, cobres cada setmana sense fer res.
  //
  // Excepte els que JA han eixit a subhasta i ningú ha volgut: eixos no es tornen a llistar
  // (no són transferibles) i l'única cosa que se'n pot fer és DESPATXAR-LOS.
  const deserts = await desertsDesats(db, usuariId);
  const fora = resta.filter((j) => !presos.has(id(j)));
  const despatxar = fora.filter((j) => deserts.has(id(j)));
  const venda = fora.filter((j) => !deserts.has(id(j)));

  // EL GRUP DE CADA JUGADOR, en una sola font. La pantalla el pinta i el motor d'alertes el
  // consumix: si cada un ho derivara pel seu compte, tornarien a dir coses distintes.
  const grups = new Map();
  for (const l of onze) if (l.jugador) grups.set(id(l.jugador), 'onze');
  // Va DESPRÉS de l'onze i ABANS de la resta: un aturat no és ni titular ni sobrant, és un
  // lloc que esta setmana es queda buit.
  for (const j of aturats) grups.set(id(j), 'aturat');
  for (const j of ambDif) grups.set(id(j), 'entrenable');
  if (futur) grups.set(id(futur), 'futur_entrenador');
  if (suplent) grups.set(id(suplent), 'porter_suplent');
  for (const j of venda) grups.set(id(j), 'venda');
  for (const j of despatxar) grups.set(id(j), 'despatxar');

  // QUI OCUPA UNA PLAÇA D'ENTRENAMENT: els llocs de l'onze que entrenen, més els entrenables.
  // Ix d'ací i no de cada consumidor perquè és el que decidix quin cos queda DISPONIBLE per a
  // cobrir partits, i això ho miren dos (el motor d'alertes i Vendes). Abans cada u ho
  // derivava de la categoria vella (`core`/`rotatiu`), que ja no s'escriu.
  const entrenen = new Set();
  for (const l of onze) if (l.entrena && l.jugador) entrenen.add(id(l.jugador));
  for (const j of ambDif) entrenen.add(id(j));

  return { onze, sobrants, aturats, entrenables: ambDif, habilitat_entrenament: habA, entrenen, sobrecosts,
    entrenables_objectiu: objectiuA, entrenables_max: quants,
    futur_entrenador: futur, porter_suplent: suplent, venda, despatxar, grups,
    reconversio: futur ? await preusReconversio(db, futur.experiencia) : null };
}
