// Tonico — capa «Font de dades», adaptador CSV.
// Únic mòdul que coneix el format CSV de Hattrick. La resta de l'app només
// veu el MODEL INTERN que retorna. Substituir el CSV per CHPP = un adaptador
// nou ací amb la mateixa eixida; cap altre mòdul canvia (principi 5).
//
// Entrada: files ja tokenitzades (string[][], capçalera inclosa). Qui
// tokenitza (split simple al servidor, PapaParse al navegador) és
// indiferent — este mòdul no llig cap fitxer.

// ── Utilitats de conversió ──
const enter = (s) => { const v = (s ?? '').trim(); return v === '' ? null : parseInt(v, 10); };
const real  = (s) => { const v = (s ?? '').trim(); return v === '' ? null : parseFloat(v); };
const text  = (s) => { const v = (s ?? '').trim(); return v === '' ? null : v; };
const dataIso = (s) => {                      // '15-07-2026' → '2026-07-15'
  const v = (s ?? '').trim();
  if (v === '') return null;
  const [d, m, a] = v.split('-');
  return `${a}-${m}-${d}`;
};
// Habilitat juvenil: tres estats. '' → null (no revelat); '?' o '/?' →
// 'desconegut' (revelat sense valor); número (amb o sense '/') → text del número.
const habilitat = (s) => {
  const v = (s ?? '').replace('/', '').trim();
  if (v === '') return null;
  if (v === '?') return 'desconegut';
  return v;
};

const netejaBom = (s) => (s ?? '').replace(/^﻿/, '');

// ── Sènior ──
export function modelSenior(files, dataExport) {
  const cos = capValides(files, 'Nacionalitat', 'ID del jugador');
  return {
    tipus: 'senior',
    data: dataExport,
    jugadors: cos.map((c) => ({
      identitat: {
        id_hattrick: enter(c[3]),
        nom: text(c[2]),
        nacionalitat: text(c[0]),
        especialitat: text(c[5]),
      },
      instantania: {
        edat_anys: enter(c[10]), edat_dies: enter(c[11]),
        tsi: enter(c[12]), sou: enter(c[13]),
        setmanes_club: enter(c[14]),
        experiencia: enter(c[15]), lideratge: enter(c[16]), lleialtat: enter(c[17]),
        forma: enter(c[18]), resistencia: enter(c[19]),
        bonificacio_origen: enter(c[6]), transferible: enter(c[9]),
        porteria: enter(c[20]), defensa: enter(c[21]), creativitat: enter(c[22]),
        extrem: enter(c[23]), passades: enter(c[24]), anotacio: enter(c[25]),
        pilota_aturada: enter(c[26]),
        lesio: text(c[7]), amonestacions: enter(c[8]),
        posicio_ultim_partit: text(c[29]),
        qualificacio_ultim_partit: real(c[28]),
        data_ultim_partit: dataIso(c[27]),
        categoria_hattrick: text(c[30]),
      },
    })),
  };
}

// ── Juvenil ──
export function modelJuvenil(files, dataExport) {
  const cos = capValides(files, 'Nacionalitat', 'Dies restants per poder ser promocionat');
  return {
    tipus: 'juvenil',
    data: dataExport,
    jugadors: cos.map((c) => ({
      identitat: {
        id_hattrick: enter(c[3]),
        nom: text(c[2]),
        nacionalitat: text(c[0]),
        especialitat: text(c[4]),
      },
      instantania: {
        edat_anys: enter(c[7]), edat_dies: enter(c[8]),
        dies_restants_promocio: enter(c[9]),
        edat_promocio: enter(c[10]), dies_al_promocionar: enter(c[11]),
        porteria_actual: habilitat(c[12]), porteria_potencial: habilitat(c[13]),
        defensa_actual: habilitat(c[14]), defensa_potencial: habilitat(c[15]),
        creativitat_actual: habilitat(c[16]), creativitat_potencial: habilitat(c[17]),
        extrem_actual: habilitat(c[18]), extrem_potencial: habilitat(c[19]),
        passades_actual: habilitat(c[20]), passades_potencial: habilitat(c[21]),
        anotacio_actual: habilitat(c[22]), anotacio_potencial: habilitat(c[23]),
        pilota_aturada_actual: habilitat(c[24]), pilota_aturada_potencial: habilitat(c[25]),
        lesio: text(c[5]), amonestacions: enter(c[6]),
        posicio_ultim_partit: text(c[28]),
        qualificacio_ultim_partit: real(c[27]),
        data_ultim_partit: dataIso(c[26]),
      },
    })),
  };
}

// Valida la capçalera (fallar ràpid si puges el fitxer equivocat) i torna
// només les files amb dades (descarta buides).
function capValides(files, capEsperada0, capClau) {
  if (!files || files.length < 1) throw new Error('CSV buit');
  const cap = files[0].map(netejaBom);
  if (cap[0] !== capEsperada0 || !cap.includes(capClau)) {
    throw new Error(`Capçalera CSV inesperada: ${cap.slice(0, 4).join(',')}…`);
  }
  return files.slice(1).filter((c) => (c[3] ?? '').trim() !== '');  // ha de tindre ID
}
