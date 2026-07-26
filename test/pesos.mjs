// Tonico — PESOS I NIVELL OBJECTIU (contracte v3, PAS 2 i PAS 4). Cap número d'este test
// és inventat: ixen de la guia (§4 aportació, §5 ocasions, §8 salaris).
// node test/pesos.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { pesLloc, pesosFormacio, pressupostSou, nivellObjectiu, nivellsObjectiu, carregaConfigPesos } from '../lib/pesos.js';

const { db } = nova(import.meta.url);
const cfg = await carregaConfigPesos(db, 'competitiva');

// ── Els seeds són els de la guia ──
assert.equal(cfg.pes_sector.central, 0.36, 'guia §5: 36,0% de les ocasions pel mig');
assert.equal(cfg.pes_sector.banda, 0.255, 'guia §5: 25,5% per cada costat');
assert.equal(cfg.taula_aportacio.Mig['Mig#Cre'], 1, 'guia §4: el Mig aporta el 100% de Cre al mig camp');
assert.equal(cfg.taula_aportacio.Por['DC#Por'], 0.87, 'guia §4: el porter, 87% de Porteria a la defensa central');
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
// El Mig, a mà: 1,00·pes_mig + 0,40·0,36 + 0,19·0,255 + 0,22·0,36 + 0,33·0,36 + 0,26·0,255
const pm = cfg.pes_sector.mig;
const migAMa = 1 * pm + 0.40 * 0.36 + 0.19 * 0.255 + 0.22 * 0.36 + 0.33 * 0.36 + 0.26 * 0.255;
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

// ── nivell_objectiu: el nivell més alt que el pressupost paga (taula §8) ──
assert.equal(nivellObjectiu('creativitat', 330, cfg.taula_salaris), 3, 'just per a Sòlid (330 €)');
assert.equal(nivellObjectiu('creativitat', 329, cfg.taula_salaris), 2, 'un euro menys → Passable');
assert.equal(nivellObjectiu('creativitat', 1000000, cfg.taula_salaris), 16, 'Creativitat SÍ que publica el Diví');
assert.equal(nivellObjectiu('defensa', 1000000, cfg.taula_salaris), 15, 'Defensa s\'atura a Utòpic');
assert.equal(nivellObjectiu('porteria', 100, cfg.taula_salaris), 0, 'no arriba ni al primer nivell');
assert.equal(nivellObjectiu('creativitat', null, cfg.taula_salaris), null, 'sense pressupost, res');

// ── El PAS 4 sencer ──
const niv = nivellsObjectiu(LLOCS, cfg, 100000);
assert.equal(niv.mc.habilitat, 'creativitat');
assert.equal(niv.porter.habilitat, 'porteria');
assert.ok(niv.mc.nivell_objectiu >= 1, 'amb 100.000 € de sou sostenible el mig arriba a algun nivell');
for (const l of LLOCS) {
  assert.equal(niv[l].nivell_objectiu, nivellObjectiu(niv[l].habilitat, niv[l].pressupost_sou, cfg.taula_salaris));
}
// Més flux → mai menys nivell (monotonia: la fórmula no pot castigar guanyar més).
const pobre = nivellsObjectiu(LLOCS, cfg, 20000);
for (const l of LLOCS) assert.ok(niv[l].nivell_objectiu >= pobre[l].nivell_objectiu, `monotonia a ${l}`);

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
    const nomina = Object.entries(n).reduce((a, [b, v]) =>
      a + (cfg.taula_salaris[v.habilitat]?.[v.nivell_objectiu] ?? 0) * v.llocs, 0);
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
