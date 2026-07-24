-- Tonico — migració 020: els partits són ROLS, no tipus de calendari (polit #4.2).
-- «Lliga»/«Amistós» eren noms estructurals; passen a ser rols, contingut de
-- l'estratègia. En fàbrica: un rol COMPETITIU (aparador) i un NOMÉS D'ENTRENAMENT.
-- El nom visible de cada rol és una clau i18n (parametritzable per plantilla).
UPDATE plantilles_parametres
   SET clau = 'rols',
       valor = '[{"id":"A","competitiu":true,"nom_clau":"rol.fabrica_a"},{"id":"B","competitiu":false,"nom_clau":"rol.fabrica_b"}]'
 WHERE plantilla = 'fabrica' AND clau = 'partits';
