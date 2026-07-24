// Tonico — polit #9.1: mecànica del llistat (el tercer dia). La recomanació de
// venda raona sobre la DATA DE TANCAMENT (llistat + dies_subhasta) i Paco recorda
// el dia abans del tancament. node test/subhasta.mjs
import assert from 'node:assert/strict';
import { REGLES } from '../lib/regles.js';

const base = { dataInstantania: '2026-07-21', any_dies: 112, dies_subhasta: 3 };

// ── ALR_LLISTAR_VENDA (liquidació): en depressió PROFUNDA i sense urgència, el tancament
// s'ajorna fins al primer dia FORA de depressió (vora de setmana + finsRecuperacio); si no,
// es llista HUI. Vore el detall a test/regles.mjs; ací només la mecànica de dates.
{
  const p = { urgencia: 72, urgencia_normal: 55, urgencia_lesionat: 40, dies_aniversari: 14, posicio_porter: 'PO', porteria_deprecia: 6, depressio_profunda: -20 };
  const ctx = { ...base, setmana_inici_data: '2026-07-18',
    jugadors: [{ jugador_id: 1, nom: 'SensePos', categoria: 'venda', edat_dies: 40, edat_anys: 22 }],
    mercat: { depressio: true, modificador: -30, finsRecuperacio: 1, esperaMax: 4 } };
  const a = REGLES.ALR_LLISTAR_VENDA(ctx, p)[0];
  assert.equal(a.agenda, true, 'depressió profunda sense urgència → agenda');
  assert.equal(a.data_accio, '2026-07-22', 'llistat programat per al primer dia fora de depressió (dimecres)');
  assert.equal(a.parametres.data_tancament, '2026-07-25', 'tanca el primer dia de la recuperació (dissabte)');
}

// ALR_SUBHASTA_TANCA retirada (migració 054): una vegada llistat, HT no deixa canviar
// el preu ni retirar-lo → no és una acció executable. La data de tancament viu a Vendes.

console.log('OK — subhasta: recomanació de llistat per data de tancament');
