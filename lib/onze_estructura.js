// Tonico — L'ONZE D'ESTRUCTURA: qui ocupa cada lloc del pla.
//
// Viu a banda perquè el consumixen dos: la pantalla de Plantilla (que el mostra) i, quan
// toque, el PAS 5 (que el gasta per a mesurar la mancança lloc a lloc en compte de fer-ho amb
// «el millor del bucket», que només mesurava cinc jugadors dels onze).
import { assignaEstructura, senyalDif } from './onze.js';
import { carregaConfigPesos, pesosFormacio, nivellsObjectiu } from './pesos.js';
import { llegixConfig } from './config.js';
import { llocsAmbHabilitat } from './orquestra_estoc.js';
import { desertsDesats } from './vendes.js';

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

export async function onzeEstructura(db, usuariId, jugadors, souSostenibleSetmanal = null) {
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
  const { onze, sobrants } = assignaEstructura(jugadors, ambPes);

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
  const edatMax = Number(await pomEnter(db, estrategia, 'edat_pic_venda'));
  const anyDies = Number(await constantEnter(db, 'any_dies')) || 112;
  const dies = (j) => (j.edat_anys ?? 0) * anyDies + (j.edat_dies ?? 0);
  const entrenables = !habA || !edatMax ? [] : sobrants
    .filter((j) => dies(j) <= edatMax * anyDies)
    .sort((a, b) => Number(b[habA] ?? 0) - Number(a[habA] ?? 0) || dies(a) - dies(b))
    .slice(0, quants);
  // Els entrenables es mesuren contra la MATEIXA vara que els llocs que entrenen.
  const objectiuA = plens[0] ? (nivells?.[plens[0].bucket]?.nivell_objectiu_ht ?? null) : null;
  const ambDif = entrenables.map((j) => {
    const d = objectiuA == null ? null : Number(j[habA] ?? 0) - objectiuA;
    return { ...j, diferencia: d, senyal: senyalDif(d) };
  });
  // ── FUTUR ENTRENADOR ─────────────────────────────────────────────────────────────────
  // El del RESIDU amb més experiència. L'experiència decidix fins a quin nivell d'entrenador
  // pot arribar i quant costa reconvertir-lo; el lideratge se'l queda gratis. No cal que jugue
  // per a res d'això: si va a la segona alineació és per a OMPLIR, i el sou ja el pagues.
  const presos = new Set(ambDif.map((j) => id(j)));
  const resta = sobrants.filter((j) => !presos.has(id(j)));
  // I NOMÉS SI ES POT RECONVERTIR. La taula de la guia comença en experiència 4: per davall no
  // hi ha cap nivell d'entrenador possible, o siga que proposar el «de més experiència» d'una
  // plantilla on tots en tenen 1 seria assenyalar algú per no res.
  const expMin = await experienciaMinima(db);
  const futur = resta.filter((j) => j.experiencia != null
      && (expMin == null || Number(j.experiencia) >= expMin))
    .sort((a, b) => Number(b.experiencia) - Number(a.experiencia)
      || Number(b.lideratge ?? 0) - Number(a.lideratge ?? 0))[0] ?? null;
  if (futur) presos.add(id(futur));

  // ── PORTER SUPLENT ───────────────────────────────────────────────────────────────────
  // El porter no dobla, o siga que en fa falta un segon. És l'únic lloc de la segona alineació
  // que obliga a mantindre algú expressament, i per això mana el SOU: eixe lloc no compra res.
  // «Porter» es DEDUÏX: aquell la seua millor habilitat del qual és la porteria — si no, el més
  // barat de la plantilla seria un davanter amb porteria 1.
  const esPorter = (j) => HABS.every((h) => Number(j.porteria ?? 0) >= Number(j[h] ?? 0));
  const suplent = resta.filter((j) => !presos.has(id(j)) && esPorter(j))
    .sort((a, b) => Number(a.sou ?? 0) - Number(b.sou ?? 0))[0] ?? null;

  if (suplent) presos.add(id(suplent));

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
  for (const j of ambDif) grups.set(id(j), 'entrenable');
  if (futur) grups.set(id(futur), 'futur_entrenador');
  if (suplent) grups.set(id(suplent), 'porter_suplent');
  for (const j of venda) grups.set(id(j), 'venda');
  for (const j of despatxar) grups.set(id(j), 'despatxar');

  return { onze, sobrants, entrenables: ambDif, habilitat_entrenament: habA,
    entrenables_objectiu: objectiuA, entrenables_max: quants,
    futur_entrenador: futur, porter_suplent: suplent, venda, despatxar, grups,
    reconversio: futur ? await preusReconversio(db, futur.experiencia) : null };
}
