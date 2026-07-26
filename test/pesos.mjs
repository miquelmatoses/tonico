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
assert.equal(cfg.taula_salaris.creativitat['3'], 330, 'guia §8: Creativitat Notable = 330 €');
assert.equal(cfg.taula_salaris.porteria['1'], 610, 'guia §8: Porteria Insuficient = 610 €');
assert.equal(cfg.taula_salaris.defensa['16'], 129150, 'guia §8: Defensa Diví = 129.150 €');

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
assert.equal(nivellObjectiu('creativitat', 330, cfg.taula_salaris), 3, 'just per a Notable (330 €)');
assert.equal(nivellObjectiu('creativitat', 329, cfg.taula_salaris), 2, 'un euro menys → Acceptable');
assert.equal(nivellObjectiu('creativitat', 1000000, cfg.taula_salaris), 15, 'Creativitat no publica el 16');
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
