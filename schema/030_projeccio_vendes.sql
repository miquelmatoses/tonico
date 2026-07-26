-- Tonico — migració 030 (polit #5.1): la projecció d'inflexió compta el NEGOCI.
-- El balanç operatiu d'una fàbrica és negatiu per disseny; l'ingrés són els marges
-- de venda. Poms per estimar el flux (recalibrables amb vendes reals).
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'valor_estimat_defecte', '150000', 'int'),   -- venda sense comparable (estimació grossa)
  ('competitiva', 'valor_fornada_estimat', '300000', 'int');   -- valor per fornada que ix (recalibrable)
