// Tonico — PACO RECLAMA LES DADES (invariant 18). Passats `dies_avis_dades` (7) sense
// declaració nova, el sistema HO DIU. node test/dades_velles.mjs
//
// REGRESSIÓ QUE PROTEGIX ESTE TEST: la frescor es mesurava contra la data de l'ÚLTIMA
// INSTANTÀNIA en compte de contra el dia de veres. Amb eixe rellotge, si Miquel deixa de pujar
// CSV la comparació es congela —dada vella contra rellotge vell— i l'avís no salta MAI,
// justament en l'únic cas en què fa falta. La instantània d'este fixture és del 18-07 a posta.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { generaAlertes } from '../lib/orquestra_alertes.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',1,2);
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'B','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-18',83,1);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, sou) VALUES (1,1,5000);
  INSERT INTO finances (usuari_id, caixa, caixa_data, despesa_estadi, taquilla_s1, patrocini_s1, taquilla_s2, patrocini_s2)
    VALUES (1,173004,'2026-07-18',7100,21127,40500,0,40500);
`);
const velles = () => sqlite.prepare(
  "SELECT COUNT(*) n FROM alertes a JOIN regles r ON r.id=a.regla_id WHERE r.codi='ALR_DADES_VELLES' AND a.estat IN ('nova','vista')").get().n;

// ── Declarat fa 7 dies justos: encara calla («Paco sap callar») ──
await generaAlertes(db, 1, '2026-07-25');
assert.equal(velles(), 0, 'a 7 dies justos no reclama res');

// ── Al huité dia, reclama ──
await generaAlertes(db, 1, '2026-07-26');
assert.equal(velles(), 1, 'passats els 7 dies, Paco demana les dades');

// ── I NO es mesura contra la instantània: ací està el bug que això protegix ──
// La instantània és del 18-07 igual que la declaració. Si el rellotge fora eixe, la
// diferència seria 0 i l'avís no saltaria mai, per molts mesos que passaren.
sqlite.exec("UPDATE alertes SET estat='resolta' WHERE 1=1;");
await generaAlertes(db, 1, '2026-09-30');
assert.equal(velles(), 1,
  'dos mesos sense declarar amb la mateixa instantània: ha de reclamar, no congelar-se');

// ── En declarar de nou, l'alerta es resol sola (reconciliació, no acumulació) ──
sqlite.exec("UPDATE finances SET caixa_data='2026-09-30' WHERE usuari_id=1;");
await generaAlertes(db, 1, '2026-09-30');
assert.equal(velles(), 0, 'amb les dades fresques es resol sola: ningú l\'ha de tancar a mà');

console.log('OK — dades velles: reclama al huité dia i es mesura contra HUI, no contra la instantània');

// ── I el rellotge es reposa a CADA declaració ──
// El bug bessó: `caixa_data` només s'escrivia si estava buida, així que es congelava a la
// primera declaració i la frescor no es movia mai per molt que Miquel tornara a declarar.
{
  const finances = await import('../functions/api/finances.js');
  const ctx = (cos) => ({ request: new Request('http://t', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(cos) }),
    env: { DB: db }, data: { usuari: { id: 1 } } });
  sqlite.exec("UPDATE finances SET caixa_data='2020-01-01' WHERE usuari_id=1;");
  await finances.onRequestPost(ctx({ taquilla_s1: 1000, patrocini_s1: 2000 }));
  const nova = sqlite.prepare('SELECT caixa_data FROM finances WHERE usuari_id=1').get().caixa_data;
  assert.notEqual(nova, '2020-01-01', 'declarar reposa la data, encara que ja n\'hi haguera una');
  assert.equal(nova, new Date().toISOString().slice(0, 10), 'i la posa a hui');
}

console.log('OK — i la data de declaració es reposa a cada desada, no només la primera');
