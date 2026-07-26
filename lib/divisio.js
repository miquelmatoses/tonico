// Tonico — DIVISIÓ: un únic format intern. Les taules del joc (estimació de preu per
// divisió, coeficients de patrocini de la guia §9) van en numerals ROMANS; l'usuari, en
// canvi, sol escriure el número àrab que veu al joc ("7"). Sense conversió, una taula
// falla EN SILENCI: la cerca no troba la clau i cau al valor per defecte sense dir res.
//
// Format intern = ROMÀ en majúscules (I…VIII). Tota entrada es normalitza; tota vista es
// formata. Cap punt de decisió veu mai un format cru.

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// Entrada → format intern. Accepta romà (qualsevol caixa), àrab (número o text) i espais.
// Torna null si no és una divisió reconeixible: qui la consumix ha de demanar-la, no
// suposar-la.
export function normalitzaDivisio(valor) {
  if (valor == null) return null;
  const net = String(valor).trim().toUpperCase().replace(/^DIV(ISI[ÓO])?\.?\s*/i, '');
  if (!net) return null;
  if (ROMANS.includes(net)) return net;
  if (/^\d+$/.test(net)) {
    const n = parseInt(net, 10);
    return n >= 1 && n <= ROMANS.length ? ROMANS[n - 1] : null;
  }
  return null;
}

// Format intern → número àrab (per a vistes que el mostren així). null si no és vàlid.
export function divisioArab(valor) {
  const rom = normalitzaDivisio(valor);
  return rom ? ROMANS.indexOf(rom) + 1 : null;
}

// Format intern → text de vista. La vista no fa aritmètica: només tria representació.
export function mostraDivisio(valor) {
  return normalitzaDivisio(valor) ?? '';
}

export const DIVISIONS = ROMANS;
