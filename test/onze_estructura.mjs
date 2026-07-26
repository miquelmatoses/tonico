// Tonico — L'ONZE D'ESTRUCTURA: tots els jugadors col·locats lloc a lloc.
// node test/onze_estructura.mjs
//
// EL FORAT QUE TAPA. Per a mesurar la mancança d'un lloc fa falta saber QUI L'OCUPA, i el full
// deia «el jugador assignat al lloc (PAS 8)» — un pas que va DESPRÉS. L'avaluador se'l
// fabricava: agafava el millor retingut de cada BUCKET. Amb tres llocs de MC, això mesurava
// només el millor MC i MC2 i MC3 no existien per al sistema; la vara mesurava CINC jugadors
// dels onze. I calia decidir abans qui es quedava (PAS 6) per a poder assignar ningú.
//
// Ara es col·loquen TOTS, lloc a lloc, i els que sobren són el residu de l'assignació.
import assert from 'node:assert/strict';
import { nova } from './_d1shim.mjs';
import { assignaEstructura } from '../lib/onze.js';
import { onzeEstructura } from '../lib/onze_estructura.js';

// ── 1. La mecànica, en net. Els llocs arriben en l'ORDE DE LA FORMACIÓ (el davanter primer)
// per a que es veja que qui mana en la tria és el PES i no la posició a la llista. ──
const llocs = [
  { lloc: 'DAV1', bucket: 'davanter', habilitat: 'anotacio', pes: 0.89 },
  { lloc: 'MC1', bucket: 'mc', habilitat: 'creativitat', pes: 1.46 },
  { lloc: 'MC2', bucket: 'mc', habilitat: 'creativitat', pes: 1.46 },
];
const jug = (id, creativitat, anotacio, sou = 1000) => ({ id, nom: 'J' + id, creativitat, anotacio, sou });
{
  const { onze, sobrants } = assignaEstructura(
    [jug(1, 9, 2), jug(2, 7, 8), jug(3, 4, 9), jug(4, 1, 1)], llocs);
  // L'eixida va en l'orde de la formació (DAV1, MC1, MC2), però la TRIA l'han feta els MC
  // primer per pes: s'enduen els dos millors creatius i al davanter li queda el 3.
  assert.deepEqual(onze.map((l) => l.jugador?.id), [3, 1, 2],
    'els llocs de MÉS PES trien primer, encara que a la llista vagen després');
  assert.deepEqual(sobrants.map((j) => j.id), [4], 'i el que no entra és el residu');
  // MC2 s\'ha quedat el 2 (creativitat 7) encara que el 3 fora millor davanter: qui tria és el
  // lloc, per orde de pes, i el davanter tria després amb el que li queda.
  assert.equal(onze.find((l) => l.lloc === 'DAV1').jugador.id, 3);
  assert.equal(onze[0].lloc, 'DAV1', 'i l\'eixida respecta l\'orde de la formació, per a llegir-la');
}

// ── 2. UN JUGADOR, UN LLOC. Sense això el millor ocuparia tots els llocs de la seua habilitat
// i les mancances de MC2 i MC3 desapareixerien — que és exactament el forat d'abans. ──
{
  const { onze } = assignaEstructura([jug(1, 9, 9), jug(2, 3, 3), jug(3, 2, 2)], llocs);
  const ids = onze.map((l) => l.jugador?.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'cap jugador es repetix en dos llocs');
}

// ── 3. Un lloc sense ningú es queda BUIT, i eixe és el senyal fort ──
{
  const { onze, sobrants } = assignaEstructura([jug(1, 9, 9)], llocs);
  assert.equal(onze.filter((l) => l.jugador == null).length, 2, 'dos llocs sense ocupant');
  assert.deepEqual(sobrants, [], 'i cap sobrant: no en quedaven');
}

// ── 4. DETERMINISTA: a igualtat d'habilitat, el més barat; i a igualtat de sou, l'id. Si no,
// l'onze ballaria a cada pujada sense que haguera canviat res. ──
{
  const a = assignaEstructura([jug(5, 7, 0, 900), jug(6, 7, 0, 900), jug(7, 7, 0, 500)], llocs);   // eslint-disable-line
  const b = assignaEstructura([jug(7, 7, 0, 500), jug(6, 7, 0, 900), jug(5, 7, 0, 900)], llocs);
  assert.deepEqual(a.onze.map((l) => l.jugador?.id), b.onze.map((l) => l.jugador?.id),
    'el mateix conjunt dona el mateix onze, arribe en l\'orde que arribe');
  assert.equal(a.onze.find((l) => l.lloc === 'MC1').jugador.id, 7,
    'a igualtat d\'habilitat, el més barat');
}

// ── 5. I d'extrem a extrem, amb la formació de veres: 2-5-3 ──
{
  const { sqlite, db } = nova(import.meta.url);
  sqlite.exec(`
    INSERT INTO usuaris (id, correu, contrasenya) VALUES (1,'z','x');
    INSERT INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
      VALUES (1,'competitiva','ES','VII','cap',2);
    INSERT INTO plans (usuari_id, plantilla, fase_actual) VALUES (1,'competitiva','competitiva');
    INSERT INTO equips (id, usuari_id, nom, tipus) VALUES (1,1,'E','senior');
  `);
  const plantilla = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1, nom: 'J' + (i + 1), sou: 1000,
    porteria: i === 0 ? 9 : 1, defensa: i < 4 ? 8 - i : 1,
    creativitat: i >= 4 && i < 8 ? 9 - i % 4 : 1,
    extrem: i >= 8 && i < 11 ? 7 : 1, anotacio: i >= 11 ? 8 : 1,
  }));
  const { onze, sobrants } = await onzeEstructura(db, 1, plantilla);
  assert.equal(onze.length, 11, 'onze llocs');
  const compta = onze.reduce((a, l) => ({ ...a, [l.bucket]: (a[l.bucket] ?? 0) + 1 }), {});
  assert.deepEqual(compta, { porter: 1, defensa: 2, mc: 3, extrem: 2, davanter: 3 },
    '1 porter · 2 defenses · 3 mig centres · 2 extrems · 3 davanters');
  assert.equal(onze.length + sobrants.length, 14, 'tots els jugadors estan comptats: onze i residu');
  const ids = onze.map((l) => l.jugador?.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'i cap repetit');
}

console.log('OK — l\'onze d\'estructura: tots els jugadors, lloc a lloc, un jugador un lloc');
