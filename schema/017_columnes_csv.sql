-- Tonico — migració 017: explotar columnes del CSV (polit #2.7).
-- 7c FORMA: tercer rellotge de venda (esperar que es pose en forma per a l'aparador).
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'forma_minima_venda', '6', 'int');

-- 7d LIDERATGE: la puntuació de futur_entrenador pondera experiència (cost de
-- reconversió) I lideratge (qualitat de l'entrenador resultant).
UPDATE plantilles_categories
   SET parametres='{"requisits":[{"camp":"experiencia","op":">=","valor":8}],"puntuacio":{"termes":[{"camp":"experiencia","pes":1},{"camp":"lideratge","pes":1}]}}'
 WHERE plantilla='fabrica' AND categoria='futur_entrenador';

-- 7e FIDELITAT i QUALIFICACIÓ: pesos xicotets a l'estimació de valor de mercat.
UPDATE plantilles_categories
   SET parametres='{"puntuacio":{"termes":[{"camp":"habilitat_max","pes":2},{"camp":"especialitat_valuosa","pes":3},{"camp":"edat_anys","pes":1,"desde":25},{"camp":"lleialtat","pes":0.05},{"camp":"qualificacio_ultim_partit","pes":0.2}]},"llindar_minim":12.5}'
 WHERE plantilla='fabrica' AND categoria='venda';
