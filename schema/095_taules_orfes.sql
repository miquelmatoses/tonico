-- Tonico — migració 095 · tres taules que ja no obri ningú.
--
-- Les tres estan BUIDES en producció i cap consulta les toca; l'única menció que en queda al
-- codi són comentaris que diuen justament que no es llegixen.
--
--   `transaccions`      → no hi ha comptabilitat de moviments (072). Amb la caixa declarada i
--                         el flux eixint de taquilla+patrocini, apuntar moviment a moviment no
--                         alimenta cap decisió: el diner d'una venda apareix a la caixa.
--   `preus_observats`   → l'estimació de preu se'n va anar al v3.1. El preu ara es DECLARA per
--                         tipus de fitxatge (`preus_referencia`, 088).
--   `personal_declarat` → la font viva és `personal_membres` (023).
DROP TABLE IF EXISTS transaccions;
DROP TABLE IF EXISTS preus_observats;
DROP TABLE IF EXISTS personal_declarat;
