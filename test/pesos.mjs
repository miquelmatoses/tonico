// Tonico — PESOS I NIVELL OBJECTIU (contracte v3, PAS 2 i PAS 4). Cap número d'este test
// és inventat: ixen de la guia (§4 aportació, §5 ocasions, §8 salaris).
// node test/pesos.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { pesLloc, pesosFormacio, pressupostSou, nivellsObjectiu, carregaConfigPesos,
  pesosHabilitat, equivalent, souPerfil, perfilObjectiu } from '../lib/pesos.js';

const { sqlite, db } = nova(import.meta.url);
const cfg = await carregaConfigPesos(db, 'competitiva');

// ── Els seeds són els de la guia ──
// ELS PESOS DE SECTOR ES MESUREN, no es declaren (migració 110): són el quocient entre les
// dues taules del wiki —coeficients absoluts contra percentatges— sobre 28 cel·les. Cinc
// sectors, perquè defensa i atac del mateix costat NO pesen igual.
assert.deepEqual(Object.keys(cfg.pes_sector).sort(),
  ['atac_banda', 'atac_central', 'defensa_banda', 'defensa_central', 'mig'],
  'cinc sectors: col·lapsar defensa i atac amagava que pesen distint');
assert.ok(cfg.pes_sector.defensa_banda > cfg.pes_sector.atac_banda,
  'la banda defensiva pesa més que l\'atacant, i abans eren el mateix número');
// I EL PES EFECTIU ÉS EL PRODUCTE DE LES DUES CAPES: conversió (mesurada) × importància (§5).
// Amb la conversió sola, el lateral pesava més que el mig del camp; amb la importància sola,
// la creativitat valia el 48% d'un extrem. Cada capa fa una feina i les dues s'apliquen sempre.
{
  const conv = JSON.parse(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='pesos_sector'").get().valor);
  const imp = JSON.parse(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='importancia_sector'").get().valor);
  for (const s of Object.keys(conv)) {
    assert.equal(cfg.pes_sector[s], conv[s] * imp[s], `${s}: el pes efectiu és el producte de les dues capes`);
  }
}
assert.equal(cfg.taula_aportacio.Mig['Mig#Cre'], 1, 'guia §4: el Mig aporta el 100% de Cre al mig camp');
assert.equal(cfg.taula_aportacio.Por['DC#Por'], 0.87, 'guia §4: el porter, 87% de Porteria a la defensa central');

// ── LA MATRIU, CLAVADA AL WIKI (migració 112) ────────────────────────────────────────────
// La matriu ja no reparteix pressupost: decidix QUI JUGA i quin perfil compra cada lloc. Una
// cel·la mal transcrita ja no és un decimal, és una recomanació al revés — i n'hi havia dues.
// Cada fila d'ací és la seua línia de «Skill contribution» del wiki, transcrita a mà.
{
  const WIKI = {
    // «+ Side def 92% his DF · + Cen def 38% · + Midfield 15% his PM · + Side attk 59% his WG»
    // El lateral que gastem és el wing back NORMAL, no l'ofensiu ni el defensiu.
    Lat:  { 'Mig#Cre': 0.15, 'DC#Def': 0.38, 'Lat#Def': 0.92, 'AL#Ext': 0.59 },
    // «+ Cen def 40% · + Side def 19% (l/r) · + Midfield 100% · + Side attk 26% his PA (l/r)
    //  · + Cen attk 33% his PA & 22% his SC»
    // L'ATAC DE BANDA VA PER PASSADES. El teníem com a anotació, i amb el policultiu això feia
    // que un mig centre rematador guanyara el lloc a un passador amb el mateix total.
    Mig:  { 'Mig#Cre': 1, 'DC#Def': 0.4, 'Lat#Def': 0.19, 'AC#Anot': 0.22, 'AC#Pas': 0.33, 'AL#Pas': 0.26 },
    // I l'IM cap a la banda ja el tenia bé: per això se sabia que era una relliscada de columna.
    MigcB: { 'Mig#Cre': 0.9, 'DC#Def': 0.33, 'Lat#Def': 0.24, 'AC#Pas': 0.23, 'AL#Ext': 0.59, 'AL#Pas': 0.31 },
    // «+ Side attk 22,1% his SC & 18% his WG & 12,1% his PA · + Cen attk 100% his SC & 36,9% his PA»
    DavN: { 'Mig#Cre': 0.25, 'AC#Anot': 1, 'AC#Pas': 0.369, 'AL#Ext': 0.18, 'AL#Pas': 0.121, 'AL#Anot': 0.221 },
    // «+ Side attk 86% his WG & 26% his PA · + Cen attk 11% his PA»
    Ext:  { 'Mig#Cre': 0.45, 'DC#Def': 0.2, 'Lat#Def': 0.35, 'AC#Pas': 0.11, 'AL#Ext': 0.86, 'AL#Pas': 0.26 },
    Por:  { 'DC#Por': 0.87, 'DC#Def': 0.35, 'Lat#Por': 0.61, 'Lat#Def': 0.25 },
    DC:   { 'Mig#Cre': 0.25, 'DC#Def': 1, 'Lat#Def': 0.52 },
  };
  for (const [pos, fila] of Object.entries(WIKI)) {
    assert.deepEqual(cfg.taula_aportacio[pos], fila, `${pos}: la matriu ha de dir el que diu el wiki`);
  }
  // I CAP MIG CENTRE ATACA LA BANDA AMB L'ANOTACIÓ: el mateix error a les tres variants.
  for (const pos of ['Mig', 'MigD', 'MigO', 'MigcB']) {
    assert.equal(cfg.taula_aportacio[pos]['AL#Anot'], undefined,
      `${pos}: l'atac de banda d'un mig centre va per PASSADES`);
  }
}
// L'ESCALA de Tonico compta des d'on el sou deixa de ser el mínim de 250 €:
//   nivell Tonico 1 = «Insuficient» de Hattrick (HT 5)  →  nivell Tonico n = HT n+4
assert.equal(cfg.taula_salaris.porteria['1'], 610, 'guia §8: Porteria Insuficient = 610 €');
assert.equal(cfg.taula_salaris.creativitat['3'], 330, 'guia §8: Creativitat Sòlid = 330 €');
assert.equal(cfg.taula_salaris.creativitat['5'], 850, 'guia §8: Creativitat Formidable = 850 €');

// LA COLUMNA DESPLAÇADA. A la guia la fila «Diví» té Defending i Scoring BUITS, i el 129.150 €
// que hi ha enmig és el de PLAYMAKING. En muntar la taula, la cel·la buida va desplaçar la
// columna i eixe valor va acabar com a `defensa` 16. Este test fixa les tres coses alhora.
assert.equal(cfg.taula_salaris.creativitat['16'], 129150, 'guia §8: Creativitat Diví = 129.150 €');
assert.equal(cfg.taula_salaris.defensa['16'], undefined, 'la guia NO publica Defensa Diví');
assert.equal(cfg.taula_salaris.anotacio['16'], undefined, 'ni Anotació Diví');
assert.equal(cfg.taula_salaris.defensa['15'], 75730, 'i Defensa s\'atura a Utòpic = 75.730 €');

// ── pes(lloc) = SUMA(aportacio × pes_sector) ──
// El Mig, a mà, amb CINC sectors: la creativitat va al mig, la defensa es partix entre central
// i banda, i l'anotació i la passada entre atac central i atac de banda.
const ps = cfg.pes_sector;
const migAMa = 1.00 * ps.mig + 0.40 * ps.defensa_central + 0.19 * ps.defensa_banda
  + 0.22 * ps.atac_central + 0.33 * ps.atac_central + 0.26 * ps.atac_banda;
assert.equal(pesLloc('Mig', cfg.taula_aportacio, cfg.pes_sector), Math.round(migAMa * 10000) / 10000);
assert.equal(pesLloc('inexistent', cfg.taula_aportacio, cfg.pes_sector), null, 'posició desconeguda → no se suposa pes');

// El mig és el lloc que més pesa (és qui decidix la possessió).
const LLOCS = ['porter', 'defensa', 'mc', 'extrem', 'davanter'];
const pesos = pesosFormacio(LLOCS, cfg.posicio_aportacio, cfg.taula_aportacio, cfg.pes_sector);
assert.equal(Object.keys(pesos).length, 5);
assert.ok(pesos.mc > pesos.extrem && pesos.mc > pesos.davanter && pesos.mc > pesos.defensa,
  'el mig camp pesa més que cap altre lloc');

// ── pressupost_sou: repartix el sou sostenible en proporció al pes ──
assert.equal(pressupostSou(pesos, null), null, 'sense sou sostenible no hi ha pressupost');
const pr = pressupostSou(pesos, 100000);
const sumaPr = Object.values(pr).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(sumaPr - 100000) <= Object.keys(pr).length, 'es repartix tot (± arrodoniment)');
assert.ok(pr.mc > pr.defensa, 'el lloc que més pesa s\'emporta més pressupost');

// ── LA VARA ÉS UN PERFIL (v2 del motor) ──────────────────────────────────────────────────
// El pressupost d'un lloc ja no compra «creativitat 9»: compra el conjunt d'habilitats que més
// aporta per eixe sou. El sou és exponencial per nivell i les secundàries en paguen una
// fracció, mentre la contribució és lineal — o siga que concentrar-ho tot en una habilitat és
// sempre la manera cara, i el perfil bo repartix.
{
  const pesosHab = pesosHabilitat('Lat', cfg.taula_aportacio, cfg.pes_sector);
  assert.deepEqual(Object.keys(pesosHab).sort(), ['creativitat', 'defensa', 'extrem'],
    'un lateral aporta amb tres habilitats, no amb una');
  // El cas de Miquel: DEF 6 / EXT 8 val més al lloc que DEF 7 / EXT 2.
  const A = { defensa: 6, extrem: 8, creativitat: 3 };
  const B = { defensa: 7, extrem: 2, creativitat: 3 };
  assert.ok(equivalent(A, pesosHab) > equivalent(B, pesosHab),
    'amb monocultiu guanyava B per la defensa i el sistema proposava canviar el bo pel roín');

  // El sou d'un perfil: base + la MÉS CARA sencera + la resta a fracció.
  const f = cfg.sou_formula, off = cfg.nivell_offset;
  const sol = souPerfil({ defensa: 5 + off }, cfg.taula_salaris, f, off);
  const dos = souPerfil({ defensa: 5 + off, extrem: 5 + off }, cfg.taula_salaris, f, off);
  assert.ok(dos > sol && dos < 2 * sol - f.base, 'la segona habilitat costa, però no sencera');

  // I el perfil objectiu no passa mai del pressupost.
  for (const pres of [500, 1500, 4000, 20000]) {
    const o = perfilObjectiu(pesosHab, pres, cfg.taula_salaris, f, { offset: off });
    assert.ok(o.sou <= pres, `el perfil de ${pres} € costa ${o.sou}`);
    assert.ok(o.aportacio > 0, 'i aporta alguna cosa');
  }
  // Més pressupost, mai menys aportació.
  const barat = perfilObjectiu(pesosHab, 1000, cfg.taula_salaris, f, { offset: off });
  const car = perfilObjectiu(pesosHab, 8000, cfg.taula_salaris, f, { offset: off });
  assert.ok(car.aportacio > barat.aportacio, 'amb més sou, més contribució');
}

// ── El PAS 4 sencer ──
const niv = nivellsObjectiu(LLOCS, cfg, 100000);
assert.equal(niv.mc.habilitat, 'creativitat');
assert.equal(niv.porter.habilitat, 'porteria');
assert.ok(niv.mc.aportacio_objectiu > 0, 'amb 100.000 € de sou sostenible el mig compra alguna cosa');
for (const l of LLOCS) {
  assert.ok(niv[l].sou_objectiu <= niv[l].pressupost_sou, `${l}: el perfil no passa del pressupost`);
  assert.ok(Object.keys(niv[l].perfil_objectiu).length >= 1, `${l}: el perfil no pot ser buit`);
}
// Més flux → mai menys nivell (monotonia: la fórmula no pot castigar guanyar més).
const pobre = nivellsObjectiu(LLOCS, cfg, 20000);
for (const l of LLOCS) assert.ok(niv[l].aportacio_objectiu >= pobre[l].aportacio_objectiu, `monotonia a ${l}`);

// ── EL PONT ENTRE LES DUES ESCALES, comprovat contra la taula de la guia ────────────────
// El nostre nivell 5 val 2.250 (porteria) · 850 (creativitat) · 730 (defensa) · 590 (passades)
// · 550 (extrem) · 790 (anotació). Eixa fila de la guia §8 és «Formidable», el nivell 9 de
// Hattrick: d'ahí el desplaçament de 4, i que la taula comence en «Inadequate».
{
  const FORMIDABLE = { porteria: 2250, creativitat: 850, defensa: 730, passades: 590, extrem: 550, anotacio: 790 };
  const taula = JSON.parse(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='taula_salaris'").get().valor);
  for (const [hab, sou] of Object.entries(FORMIDABLE)) {
    assert.equal(taula[hab]?.['5'], sou, `${hab}: el nostre nivell 5 és el «Formidable» de la guia`);
  }
  const off = Number(sqlite.prepare("SELECT valor FROM constants_joc WHERE clau='nivell_habilitat_offset'").get().valor);
  assert.equal(off, 4, 'i «Formidable» és el 9 de Hattrick: 5 + 4');

  // I EL PONT S'HA D'APLICAR DE VERES en carregar la config: no basta que la constant existisca.
  assert.equal(cfg.nivell_offset, off, 'la config el porta');
  const n = nivellsObjectiu(LLOCS, cfg, 100000);
  for (const [lloc, v] of Object.entries(n)) {
    // LES DUES ESCALES segueixen sent el perill: el perfil objectiu va en nivells de HATTRICK
    // (per damunt del desplaçament) i la vara que es pinta ha de ser la MATEIXA magnitud que
    // l'habilitat d'un jugador. La prova és directa: un jugador que fora exactament el perfil
    // ha de mesurar exactament l'objectiu.
    for (const [hab, niv] of Object.entries(v.perfil_objectiu)) {
      assert.ok(niv > off, `${lloc}/${hab}: el perfil va en l'escala de Hattrick, no en índexs de la taula`);
    }
    assert.ok(equivalent(v.perfil_objectiu, v.pesos_habilitat) > off,
      `${lloc}: el perfil, mesurat amb la vara del lloc, ha de passar del terra de l'escala`);
  }
}

console.log('OK — pesos i nivell objectiu: seeds de la guia, pes per sector i sostre per lloc');

// ── LA PROPIETAT QUE HAURIA CAÇAT EL BUG ──────────────────────────────────────────────
// L'11 ideal ha de CABRE sota el sostre. És l'única cosa que el pressupost per lloc ha de
// garantir, i el bug la violava per 1,9×: es dividia entre els 5 TIPUS de lloc i després cada
// tipus donava el seu pressupost sencer a cadascun dels seus llocs (els 3 MC, 3.197 € cadascun).
// Comprovar l'aritmètica no ho hauria vist —la funció era correcta—; comprovar la PROPIETAT sí.
{
  const FORMACIO = ['porter', 'defensa', 'defensa', 'defensa', 'mc', 'mc', 'mc',
    'extrem', 'extrem', 'davanter', 'davanter'];
  for (const sostre of [3000, 10290, 25000, 90000]) {
    const n = nivellsObjectiu(FORMACIO, cfg, sostre);
    // La nòmina de l'11 ideal és la SUMA DELS SOUS DELS PERFILS, un per lloc. Amb el
    // `nivell_objectiu` vell açò era el preu d'una sola habilitat i es deixava fora el que
    // costen les secundàries, o siga que l'11 «cabia» perquè no es pagava sencer.
    const nomina = Object.entries(n).reduce((a, [, v]) => a + (v.sou_objectiu ?? 0) * v.llocs, 0);
    assert.ok(nomina <= sostre,
      `l'11 ideal ha de cabre: amb ${sostre} € de sostre costa ${nomina} €`);
  }
  // I el repartiment ha de comptar CADA lloc, no cada tipus.
  const n = nivellsObjectiu(FORMACIO, cfg, 10290);
  assert.equal(n.mc.llocs, 3, 'el bucket mc porta els seus 3 llocs');
  const suma = Object.values(n).reduce((a, v) => a + v.pressupost_sou * v.llocs, 0);
  assert.ok(Math.abs(suma - 10290) <= Object.keys(n).length,
    `la suma dels pressupostos PER LLOC ha de donar el sostre (dona ${suma})`);
}
console.log('OK — PAS 4: l\'11 ideal cap sota el sostre (propietat, no aritmètica)');
