// Tonico — LA SECCIÓ D'ENTRENAMENT. node test/entrenament_seccio.mjs
//
// El que s'ENTRENA es prescriu i no es declara. El que es DECLARA és l'ENTRENADOR, perquè el
// seu nivell entra a la velocitat d'entrenament i no es deriva de res.
//
// EL FORAT QUE TAPA: la 077 va moure el nivell de l'entrenador a `coach_entrenament` (la
// paraula) i va deixar `nivell` a NULL. La fórmula de velocitat (085) llig l'escala NUMÈRICA
// de Schum (4..8), o siga que la columna «10(6)» dels entrenables eixia buida i ningú deia per
// què. El pont entre les dues escales és una constant amb la seua font, no una conversió.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import * as api from '../functions/api/entrenament.js';
import { carregaCoeficients, velocitat } from '../lib/entrenament_velocitat.js';

const { sqlite, db } = nova(import.meta.url);
sqlite.exec(`
  INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
  INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
    VALUES (1,'competitiva','ES','VII','cap',2);
  INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
  INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  INSERT INTO personal_membres (usuari_id, rol, tipus, nivell, sou) VALUES (1,'especialista','assistent',2,2040);
`);
const ctx = (body) => ({ request: new Request('http://t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { DB: db }, data: { usuari: { id: 1 } } });
const get = () => api.onRequestGet({ env: { DB: db }, data: { usuari: { id: 1 } } }).then((r) => r.json());

// ── 1. La prescripció es llig; l'entrenador encara no hi és ──
let d = await get();
assert.ok(d.prescrit?.skill, 'l\'entrenament A ix del pom, no d\'una tria');
assert.equal(d.intensitat, 100, 'intensitat prescrita');
assert.equal(d.resistencia, 10, 'i resistència: Miquel les va fixar com a prescripció');
assert.equal(d.entrenador, null, 'sense entrenador declarat no se n\'inventa cap');
assert.equal(d.assistents, 2, 'i els nivells d\'assistent se sumen dels especialistes');

// ── 2. Es declara, i el nivell ha de ser un dels de la taula ──
assert.equal((await api.onRequestPost(ctx({ coach_entrenament: 'inventat' }))).status, 400,
  'un nivell que no és a la taula d\'eficiències no s\'accepta');
await api.onRequestPost(ctx({ coach_entrenament: 'passable', coach_lideratge: 4, sou: 5000 }));
d = await get();
assert.equal(d.entrenador.coach_entrenament, 'passable');
assert.equal(d.entrenador.coach_lideratge, 4);
assert.equal(d.eficiencia.passable, 90.9, 'i la pantalla pot dir què val eixe nivell');

// ── 3. I EL PONT FUNCIONA: amb la paraula declarada, la fórmula ja dona velocitat ──
{
  const co = await carregaCoeficients(db);
  const base = { nivell: 6, edat: 18, habilitat: 'creativitat', assistents: 2, intensitat: 100, resistencia: 10 };
  assert.ok(velocitat(co, { ...base, entrenador: 'passable' }) > 0,
    'la paraula «passable» arriba a l\'escala 4..8 de Schum');
  assert.ok(velocitat(co, { ...base, entrenador: 'solid' }) > velocitat(co, { ...base, entrenador: 'passable' }),
    'i un entrenador millor entrena més ràpid');
  assert.equal(velocitat(co, { ...base, entrenador: null }), null,
    'sense entrenador declarat, cap velocitat: era això el que deixava el «10(6)» buit');
}

// ── 4. Editar-lo el substituïx, no en crea un segon ──
await api.onRequestPost(ctx({ coach_entrenament: 'solid', coach_lideratge: 6, sou: 10000 }));
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM personal_membres WHERE rol='entrenador'").get().n, 1,
  'un sol entrenador: editar no en crea un altre');
assert.equal((await get()).entrenador.coach_entrenament, 'solid');

console.log('OK — entrenament: la prescripció es llig, l\'entrenador es declara, i el pont a Schum funciona');
