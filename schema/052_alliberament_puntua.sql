-- Tonico — EL DESPLAÇAT SEMPRE AMB PUNTUACIÓ (arrel del bug de punts buits, 3a aparició).
-- CAUSA: 'alliberament' era l'ÚNICA categoria sense spec de `puntuacio`. Sense spec, el
-- derivador tornava null i la fila queia al valor DESAT (null en els auto-assignats) →
-- cel·la buida. No era un problema de la vista: era una categoria sense vara de mesurar.
--
-- ESMENA: la categoria terminal puntua amb la MATEIXA vara que la venda (què val el que
-- deixem anar). Així tota recategorització té puntuació i motiu, i el guardià de punts
-- buits pot exigir-ho per a TOTES les categories, no només per a les del nucli.
UPDATE plantilles_categories
   SET parametres = '{"puntuacio":{"termes":[{"camp":"habilitat_max","pes":2},{"camp":"especialitat_valuosa","pes":3},{"camp":"edat_anys","pes":1,"desde":25},{"camp":"lleialtat","pes":0.05},{"camp":"qualificacio_ultim_partit","pes":0.2}]}}'
 WHERE plantilla='competitiva' AND categoria='alliberament';
