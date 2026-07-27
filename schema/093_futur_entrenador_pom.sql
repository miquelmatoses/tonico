-- Tonico — migració 093 · l'última resta del classificador.
--
-- `plantilles_categories` era la taula de política de l'embut: quines categories hi ha,
-- quantes places té cada una, quins requisits demana i amb quina fórmula es puntua. Retirat
-- el PAS 6, només en quedaven dues coses vives:
--
--   · la PUNTUACIÓ de `venda`, que era `habilitat_max×2 + especialitat×3 + edat + lleialtat
--     + qualificació`: una estimació de valor de mercat amb un altre nom, en un sistema que
--     diu que no n'estima cap. La vara de la venda ara és el SOBRECOST (PAS 7), que ix del
--     sou contra la taula de salaris i no d'endevinar què pagarà algú.
--   · si el pla té FUTUR ENTRENADOR, que és un sí/no. Una taula sencera per a un booleà.
--
-- El booleà passa a pom i la taula se'n va.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus)
  SELECT plantilla, 'te_futur_entrenador', '1', 'bool'
    FROM plantilles_categories WHERE categoria='futur_entrenador' AND aforament >= 1;
DROP TABLE IF EXISTS plantilles_categories;
