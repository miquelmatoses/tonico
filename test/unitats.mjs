// Tonico — LA UNITAT D'UNA XIFRA ES DECLARA, no s'escriu a l'etiqueta. node test/unitats.mjs
//
// REGRESSIÓ REAL: en passar el model a bi-setmanal es va canviar el CÀLCUL del flux i no
// l'ETIQUETA. La targeta seguia dient «Flux setmanal» damunt d'una xifra de dues setmanes, i
// va estar així en producció fins que Miquel va preguntar com podien entrar 100.000 € cada
// setmana. Ningú se n'havia adonat perquè cap prova mirava la coherència entre les dues coses.
//
// La medicina és la mateixa que ja s'usa per als imports de les alertes (`diners`) i per a la
// concordança de nombre (`compte`): QUI CALCULA HO DECLARA, i la vista interpola. Amb la unitat
// com a DADA, una etiqueta no pot mentir perquè ja no diu la unitat.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UNITATS } from '../lib/economia.js';

const ca = JSON.parse(readFileSync(new URL('../public/i18n/ca-valencia.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../public/i18n/en.json', import.meta.url), 'utf8'));
const vista = readFileSync(new URL('../public/seccions.js', import.meta.url), 'utf8');

// ── 1. Tota unitat declarada és una de les tres conegudes ──
const LEGALS = new Set(['periode', 'setmana', 'estoc']);
for (const [camp, u] of Object.entries(UNITATS)) {
  assert.ok(LEGALS.has(u), `unitat desconeguda a ${camp}: ${u}`);
}

// ── 2. Les xifres que la pantalla pinta han de tindre unitat declarada ──
// Si algú afig una targeta nova amb una xifra econòmica i no en declara la unitat, peta ací.
for (const camp of ['caixa', 'flux', 'sou_sostenible', 'sou_sostenible_setmanal',
  'despeses.nomina', 'despeses.planter', 'despeses.manteniment_estadi', 'despeses.personal']) {
  assert.ok(UNITATS[camp], `xifra sense unitat declarada: ${camp}`);
}

// ── 3. LA REGLA QUE HAURIA CAÇAT EL BUG ──
// Cap etiqueta de xifra econòmica pot dir la periodicitat pel seu compte: la posa `unitat()`
// des de `e.unitats`. Si algú torna a escriure «Flux setmanal», ací es para.
const PERIODICITAT = /setmanal|setmanals|bisetmanal|per setmana|\/setm\b/i;
const ETIQUETES = ['economia.flux_et', 'economia.sou_sostenible_et', 'economia.caixa_et'];
for (const clau of ETIQUETES) {
  for (const [nom, cat] of [['ca', ca], ['en', en]]) {
    const txt = cat[clau];
    assert.ok(txt != null, `falta ${clau} a ${nom}`);
    assert.ok(!PERIODICITAT.test(txt),
      `${nom}/${clau} diu la periodicitat pel seu compte («${txt}»): ha d'eixir de e.unitats`);
  }
}

// ── 4. I la vista ha de consumir-la de veres ──
assert.ok(/e\.unitats\?\.\[camp\]/.test(vista), 'la vista ha de llegir la unitat de l\'avaluador');
assert.ok(/eco-unitat/.test(vista), 'i pintar-la al costat de la xifra');

// ── 5. Les CASELLES D'ENTRADA sí que poden dir la unitat: són el que Miquel escriu, i el que
// escriu és una constant setmanal declarada. Ací la periodicitat és informació, no una
// afirmació sobre una xifra calculada.
assert.ok(PERIODICITAT.test(ca['economia.despesa_estadi']),
  'el manteniment es declara en €/setmana i l\'etiqueta ho ha de dir');

console.log('OK — unitats: la periodicitat es declara a l\'avaluador i cap etiqueta la contradiu');
