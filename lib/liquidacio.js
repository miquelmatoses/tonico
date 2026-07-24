// Tonico — UNA SOLA FONT de «llistable ara». L'alerta agregada de liquidació i les
// marques de les fitxes de venda ixen d'ACÍ, del mateix conjunt derivat, perquè el
// recompte i el sou total no puguen divergir mai:
//
//   llistable ara = venda − llistats − lesionats − retinguts per cobertura
//
// Estats possibles d'una fitxa de venda (i no n'hi ha més):
//   · llistat                      (Transferible=1 o fitxa llistada) → no juga, ja està al mercat
//   · retingut per cobertura       (amb el càlcul: «es retenen N: X de camp + Y porters»)
//   · lesionat                     (llistable en recuperar-se)
//   · llistable ara                (la resta: el valor no espera)
import { retencioCobertura } from './cobertura.js';
import { esLesionat } from '../public/format.js';

export function conjuntLiquidacio(venda, opts = {}) {
  const sans = (venda || []).filter((j) => !esLesionat(j.lesio));
  const lesionats = (venda || []).filter((j) => esLesionat(j.lesio));
  // Un lesionat no cobrix res: la retenció es decidix només entre els sans. La retenció
  // protegix TOT el mínim (camp I porteria) i torna el desglossament per classe.
  const ret = retencioCobertura(sans, opts);
  return {
    llistables: sans.filter((j) => !ret.ids.has(j.jugador_id)),
    retinguts: sans.filter((j) => ret.ids.has(j.jugador_id)),
    lesionats,
    retingutsSet: ret.ids,
    retinguts_camp: ret.camp,
    retinguts_porters: ret.porters,
  };
}

// Estat d'una fitxa a partir del conjunt (per a la vista; mateixa font que l'alerta).
export function estatLiquidacio(j, { retingutsSet }) {
  if (j.estat === 'llistat' || j.transferible === 1) return 'llistat';
  if (esLesionat(j.lesio)) return 'lesionat';
  if (retingutsSet.has(j.jugador_id)) return 'retingut';
  return 'llistable';
}
