-- Tonico — migració 087 · qui val la pena entrenar, i fins quan.
--
-- 1 · LA CREATIVITAT MÍNIMA. Fins ara els entrenables es triaven només per edat: si el residu
-- eren tres xavals de creativitat 1, Tonico els posava com a entrenables i deia quantes
-- setmanes els faltava per a pujar al 2. I la incoherència era doble, perquè per a COMPRAR ja
-- s'exigia `compra_creativitat_min` = 6: la mateixa decisió —en qui inverteixes setmanes
-- d'entrenament— amb dos criteris, i un d'ells buit.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'entrenable_creativitat_min', '6', 'int'),

-- 2 · FINS QUAN. El tall d'abans era pla: als 20 anys i un dia, fora. Això llevava un jugador
-- que encara tenia una pujada regalada i mantenia un altre que no pujaria a temps.
--
-- L'òptim és vendre'l JUST DESPRÉS d'una pujada, entre els 20 i els 21. Amb la fórmula de
-- velocitat (085) això no s'ha d'aproximar: se sap quan li caurà la pròxima pujada, i si li cau
-- passats els 21 ja no val la pena entrenar-lo. La conseqüència ix sola: quan puja, la següent
-- li cau més tard i ell és més vell, o siga que a la volta següent el criteri el trau — i el
-- trau just després d'haver cobrat la pujada.
  ('competitiva', 'entrenable_edat_limit', '21', 'int');
