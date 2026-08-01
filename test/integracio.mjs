// Tonico — integració del Bloc C: executa el codi REAL de persistència
// (desar) contra SQLite en memòria, via un shim mínim compatible amb D1.
// Cobrix el que les proves unitàries no toquen: SQL, upsert, recompra,
// desaparició i l'insert dinàmic de columnes.
//   node test/integracio.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { modelSenior } from '../lib/adaptador.js';
import { desar, carregaAncora } from '../functions/api/pujar.js';

// ── Shim D1 sobre node:sqlite ──
class Stmt {
  constructor(sqlite, sql) { this.sqlite = sqlite; this.sql = sql; this.args = []; }
  bind(...a) { this.args = a; return this; }
  async first() { return this.sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.sqlite.prepare(this.sql).all(...this.args) }; }
  async run() { this.sqlite.prepare(this.sql).run(...this.args); return {}; }
}
class D1 {
  constructor(sqlite) { this.sqlite = sqlite; }
  prepare(sql) { return new Stmt(this.sqlite, sql); }
  async batch(stmts) { for (const s of stmts) this.sqlite.prepare(s.sql).run(...s.args); }
}

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const files = (p) => src(p).replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split(','));

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec(src('../schema/001_esquema.sql'));
sqlite.exec(src('../schema/002_llavor.sql'));
sqlite.exec(src('../schema/027_vendes.sql'));            // desar deriva l'estat llistat (Transferible)
sqlite.exec(src('../schema/048_llistat_derivat.sql'));
sqlite.exec(`INSERT INTO usuaris (id, correu, contrasenya) VALUES (1, 'zero@tonico', 'x');
             INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1, 1, 'Sènior FC', 'senior');`);
const db = new D1(sqlite);
const ancora = await carregaAncora(db);
assert.equal(ancora.anyDies, 112);

const sr = files('../data/fixtures/players.csv');

// ── Instantània 1: tots nous ──
const r1 = await desar(db, 1, 'senior', modelSenior(sr, '2026-07-18'), ancora);
assert.equal(r1.total, 25);
assert.equal(r1.nous, 25);
assert.equal(r1.temporada, 82);           // 2026-07-18 és pretemporada de T83
assert.equal(r1.setmana, 16);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM jugadors').get().n, 25);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM instantanies_jugadors').get().n, 25);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM jugadors WHERE estat='actiu'").get().n, 25);

// ── Instantània 2: un jugador desapareix (venut) ──
const idFora = 900000001;
const sr2 = sr.filter((c) => c[3] !== String(idFora));   // llevem Vicent Ferrer
const r2 = await desar(db, 1, 'senior', modelSenior(sr2, '2026-07-25'), ancora);
assert.equal(r2.total, 24);
assert.equal(r2.desapareguts, 1);
assert.equal(r2.temporada, 83);
assert.equal(r2.setmana, 1);
const fora = sqlite.prepare('SELECT estat, data_baixa_club, motiu_baixa FROM jugadors WHERE id_hattrick=?').get(idFora);
assert.equal(fora.estat, 'pendent_de_motiu');
assert.equal(fora.data_baixa_club, '2026-07-25');
assert.equal(fora.motiu_baixa, null);      // el motiu NO s'assigna automàticament

// ── Instantània 3: recompra (reapareix el que estava de baixa) ──
const r3 = await desar(db, 1, 'senior', modelSenior(sr, '2026-08-01'), ancora);
assert.equal(r3.recompres, 1);
const tornat = sqlite.prepare('SELECT estat, data_baixa_club FROM jugadors WHERE id_hattrick=?').get(idFora);
assert.equal(tornat.estat, 'actiu');
assert.equal(tornat.data_baixa_club, null);   // reactivat, no duplicat
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM jugadors WHERE id_hattrick=?').get(idFora).n, 1);

// ── ELS MOTIUS DE BAIXA: la BD ha d'acceptar EXACTAMENT els que l'API declara ────────────
// El forat que tapa açò: el `CHECK` deia «alliberament» i el codi escriu «despatx», o siga que
// declarar «Despatxat» petava sempre. Ho feia invisible que el botó no capturava l'error. La
// llista NO es copia ací: es llig del mòdul, que és qui la declara.
{
  const { MOTIUS, aColumna } = await import('../functions/api/motius.js');
  assert.ok(MOTIUS?.length, 'l\'API declara la seua llista de motius');
  const equip = sqlite.prepare("SELECT id FROM equips WHERE tipus='senior' LIMIT 1").get().id;
  for (const [i, motiu] of MOTIUS.entries()) {
    const valor = aColumna(motiu);
    sqlite.prepare('INSERT INTO jugadors (equip_id, id_hattrick, nom, estat, motiu_baixa) VALUES (?,?,?,?,?)')
      .run(equip, 9000 + i, 'M' + i, 'baixa', valor);
    assert.equal(sqlite.prepare('SELECT motiu_baixa FROM jugadors WHERE id_hattrick=?').get(9000 + i).motiu_baixa,
      valor, `la BD accepta el motiu «${motiu}» que l'API escriu`);
  }
  // I EL PONT ÉS NECESSARI, no decoratiu: el mot del full, desat en cru, el CHECK el rebutja.
  // Este és el bug que va deixar el botó «Desa» mut durant setmanes.
  assert.throws(() => sqlite.prepare('INSERT INTO jugadors (equip_id, id_hattrick, nom, estat, motiu_baixa) VALUES (?,?,?,?,?)')
    .run(equip, 9999, 'X', 'baixa', 'despatx'), /CHECK/,
  'la columna no admet el mot del full: per això la traducció ha d\'existir');
}

console.log('OK — integració Bloc C: instantànies, desaparició i recompra correctes');
