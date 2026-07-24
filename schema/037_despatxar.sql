-- Polit #10.6 — Categoria «despatxar» amb criteri econòmic. valor_net = preu_esperat
-- − cost_llistat − sous fins a la venda estimada; si valor_net < llindar, llistar és
-- tirar diners → despatxar (alliberar). Tot en poms (res hardcoded); el llistat a 1 €
-- queda com a override manual de Miquel.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('cost_llistat',            '1000', 'int', 'Cost fix de llistar un jugador (taxa de subhasta)'),
  ('despatxar_llindar',       '0',    'int', 'Si el valor net estimat < llindar → despatxar en lloc de llistar'),
  ('setmanes_venda_estimada', '3',    'int', 'Setmanes estimades fins a vendre (per a comptar els sous meritats)');
