// Tonico — G3 GOLDEN-PANTALLA (invariant 13). Per a la instantània de fixtures, cada valor
// que la pantalla mostra ha de ser el que l'avaluador dona. Un retoc manual a la vista
// trenca el golden encara que passe el G2 (que només mira que no hi haja lògica, no que el
// número siga el bo).
//
// Com funciona: es munten els fixtures, es crida l'AVALUADOR (les mateixes API que la vista
// consumix) i es comprova valor a valor que el que la vista interpolaria coincidix amb el
// que el contracte diu. No es renderitza DOM: es comprova la FONT de cada valor, que és el
// que el golden ha de protegir (que la vista no es fabrique cap número pel camí).
// node test/guardia_golden.mjs
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as apiEconomia from '../functions/api/finances.js';
import * as apiMercat from '../functions/api/mercat.js';
import * as apiPersonal from '../functions/api/personal.js';
import * as apiVendes from '../functions/api/vendes.js';
import * as apiAlertes from '../functions/api/alertes.js';
import { economia, souSostenible, caixaDisponible } from '../lib/economia.js';
import { nivellAccio } from '../lib/informe.js';
import { costFlux } from '../lib/personal_v3.js';
import { eficiencia } from '../lib/estoc.js';
import { normalitzaDivisio } from '../lib/divisio.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana) VALUES (1,'competitiva','ES','7','cap',2);
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO instantanies (id, equip_id, data, temporada, setmana_temporada) VALUES (1,1,'2026-07-25',83,2);
  INSERT INTO jugadors (id, equip_id, id_hattrick, nom) VALUES (1,1,100,'A'),(2,1,101,'B');
  INSERT INTO instantanies_jugadors (instantania_id, jugador_id, posicio_ultim_partit, edat_anys, sou, creativitat, defensa, porteria, anotacio, extrem, passades)
    VALUES (1,1,'MC',22,3000,5,1,1,1,1,1),(1,2,'DC',24,2000,1,6,1,1,1,1);
  INSERT INTO categories_jugador (jugador_id, categoria, origen) VALUES (1,'core','auto'),(2,'titular','auto');
  INSERT INTO finances (usuari_id, caixa, caixa_data, taquilla, patrocini, premis, despesa_planter, despesa_estadi, estadi_manteniment, estadi_cost_obra)
    VALUES (1, 500000, '2026-07-25', 30000, 20000, 5000, 2000, 9000, 6000, 200000);
  INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou, setmanes_contracte) VALUES (1,'especialista','metge',2,2040,4);
`);
const ctx = { env: { DB: db }, data: { usuari: { id: 1 } } };
const json = async (mod, fn = 'onRequestGet') => (await mod[fn](ctx)).json();

let comprovats = 0;
const igual = (vist, esperat, què) => { assert.deepEqual(vist, esperat, `golden: ${què}`); comprovats++; };

// ── ECONOMIA: cada xifra de la pantalla ix de l'avaluador ──
{
  const eco = await economia(db, 1);
  const vista = await json(apiEconomia);
  // El que la pantalla mostra com a caixa és el saldo DECLARAT, no una derivada.
  igual(vista.finances.caixa, eco.caixa, 'caixa de la pantalla = caixa de l\'avaluador');
  igual(eco.ingressos_recurrents, 30000 + 20000 + 5000, 'ingressos = taquilla + patrocini + premis');
  igual(eco.despeses_fixes, 5000 + 2000 + 9000 + 2040, 'despeses = nòmina + planter + estadi + personal');
  igual(eco.flux, eco.ingressos_recurrents - eco.despeses_fixes, 'flux');
  igual(eco.sou_sostenible, souSostenible(eco.flux, eco.nomina, eco.reserva_flux), 'sou sostenible');
  igual(eco.caixa_disponible, caixaDisponible(eco.caixa, eco.reserva_caixa), 'caixa disponible');
  // La divisió es va declarar en àrab: la pantalla NO pot mostrar el format cru.
  igual(eco.divisio, normalitzaDivisio('7'), 'divisió normalitzada, no el format declarat');
}

// ── MERCAT: les opcions i la seua eficiència ──
{
  const { estoc } = await json(apiMercat);
  const eco = await economia(db, 1);
  igual(estoc.caixa_disponible, eco.caixa_disponible, 'la caixa amb què compara');
  igual(estoc.sou_sostenible, eco.sou_sostenible, 'el sou que sosté');
  for (const o of estoc.opcions) {
    igual(o.eficiencia, eficiencia(o.guany, o.cost), `eficiència de l'opció ${o.tipus} ${o.lloc ?? ''}`);
    assert.ok(o.motiu, `l'opció ${o.tipus} porta motiu derivat`);
  }
  const est = estoc.opcions.find((o) => o.tipus === 'estadi');
  igual(est.delta_flux, 9000 - 6000, 'Δflux de l\'obra = manteniment actual − declarat');
  igual(est.cost, 200000, 'el cost de l\'obra és el DECLARAT, no un modelat');
  // La recomanada és la de més eficiència entre admissibles: cap altra tria.
  const admis = estoc.opcions.filter((o) => o.admissible && o.eficiencia != null);
  if (admis.length) {
    igual(estoc.recomanada.eficiencia, Math.max(...admis.map((o) => o.eficiencia)), 'la recomanada és la de més rendiment');
  }
}

// ── PERSONAL: el pla i els seus costos ──
{
  const { pla_flux } = await json(apiPersonal);
  const eco = await economia(db, 1);
  igual(pla_flux.flux_lliure, eco.flux - eco.reserva_flux, 'flux lliure = flux − reserva');
  for (const x of pla_flux.pla) {
    if (x.exclos) { igual(x.cost, 0, 'un tipus exclòs no consumix flux'); continue; }
    igual(x.cost, x.nivell ? costFlux(x.nivell, pla_flux.staff_cost_base) : 0, `cost de ${x.tipus}`);
    assert.ok(x.accio, `${x.tipus} porta acció derivada`);
  }
  const gastat = pla_flux.pla.reduce((a, x) => a + x.cost, 0);
  igual(gastat + pla_flux.flux_restant, pla_flux.flux_lliure, 'tot el flux queda comptat, res se\'n perd');
}

// ── VENDES: el preu i el valor net que la fitxa mostra ──
{
  sqlite.exec("INSERT INTO vendes (jugador_id, usuari_id, estat) VALUES (2,1,'pendent');");
  sqlite.exec("UPDATE categories_jugador SET categoria='venda' WHERE jugador_id=2;");
  const v = await json(apiVendes);
  for (const j of v.jugadors) {
    // Sense calibrar (invariant 7) la pantalla NO pot mostrar valor net ni despatxar.
    if (!j.calibrat) {
      igual(j.valor_net, null, `${j.nom}: sense calibrar, cap valor net`);
      igual(j.despatxar, false, `${j.nom}: sense calibrar, cap despatxar`);
    }
    if (j.preu_proposat != null) assert.ok(j.preu_estimacio_grossa || j.calibrat,
      `${j.nom}: tot preu ve etiquetat (calibrat o estimació grossa)`);
  }
}

// ── ALERTES: el nivell que pinta la vista ix de l'avaluador, no de llindes en codi ──
{
  const a = await json(apiAlertes);
  const llind = (clau) => Number(sqlite.prepare(
    "SELECT valor FROM plantilles_parametres WHERE plantilla='competitiva' AND clau=?").get(clau).valor);
  const llindars = { llindar_urgent: llind('llindar_urgent'), llindar_aviat: llind('llindar_aviat') };
  for (const x of a.alertes) igual(x.nivell, nivellAccio(x.urgencia, llindars), `nivell de l'alerta ${x.missatge_clau}`);
}

assert.ok(comprovats >= 25, `el golden ha de comprovar prou valors (${comprovats})`);
console.log(`OK — G3 golden-pantalla: ${comprovats} valors comprovats contra l'avaluador`);
