// Tonico — L'ASSIGNACIÓ D'ESTRUCTURA viu a test/onze_estructura.mjs.
//
// Este fitxer provava `alineaOnzes`, l'alineació VELLA: repartia sobre les categories del PAS 6
// (core, rotatiu, titular, cos) i ningú la cridava des que els dos onzes es componen damunt de
// l'assignació d'estructura. Amb ella se'n va l'últim lector de `edat_pic_venda` fora de la
// classificació, i les seues proves amb ella.
import assert from 'node:assert/strict';
import * as onze from '../lib/onze.js';

assert.equal(onze.alineaOnzes, undefined, 'l\'alineació vella se n\'ha anat del tot');
assert.equal(onze.valorEn, undefined, 'i el seu criteri de valor també');
assert.ok(typeof onze.assignaEstructura === 'function', 'el que queda és l\'assignació d\'estructura');

console.log('OK — l\'alineació vella ja no existix; l\'assignació viu a onze_estructura');
