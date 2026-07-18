// Shim mínim compatible amb D1 sobre node:sqlite, per a proves.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

class Stmt {
  constructor(sqlite, sql) { this.sqlite = sqlite; this.sql = sql; this.args = []; }
  bind(...a) { this.args = a; return this; }
  async first() { return this.sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.sqlite.prepare(this.sql).all(...this.args) }; }
  async run() { this.sqlite.prepare(this.sql).run(...this.args); return {}; }
}

export class D1 {
  constructor(sqlite) { this.sqlite = sqlite; }
  prepare(sql) { return new Stmt(this.sqlite, sql); }
  async batch(stmts) { for (const s of stmts) this.sqlite.prepare(s.sql).run(...s.args); }
}

// Crea una D1 en memòria amb l'esquema i la llavor aplicats.
export function nova(baseUrl) {
  const src = (p) => readFileSync(new URL(p, baseUrl), 'utf8');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec(src('../schema/001_esquema.sql'));
  sqlite.exec(src('../schema/002_llavor.sql'));
  sqlite.exec(src('../schema/003_classificacio.sql'));
  sqlite.exec(src('../schema/004_llavor_fabrica.sql'));
  sqlite.exec(src('../schema/005_fornada_eixida.sql'));
  sqlite.exec(src('../schema/006_regles.sql'));
  sqlite.exec(src('../schema/007_mercat_revisions.sql'));
  sqlite.exec(src('../schema/008_alineacio.sql'));
  sqlite.exec(src('../schema/009_pla_mestre.sql'));
  return { sqlite, db: new D1(sqlite) };
}
