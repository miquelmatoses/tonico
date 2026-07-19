-- Tonico — migració 014: el bucket NO és categoria (correcció de la regla d'or).
-- 'entrenable' passa a aforament PLA de 8 (els 8 millors per puntuació), sense
-- buckets MC/extrem. El repartiment de posicions és decisió d'ALINEACIÓ, no de
-- classificació: així la categoria és ESTABLE davant la posició de l'últim partit.
UPDATE plantilles_categories
   SET aforament = 8,
       parametres = '{"requisits":[{"camp":"creativitat","op":">=","valor":2},{"camp":"edat_anys","op":"<=","valor":23}],"puntuacio":{"termes":[{"camp":"creativitat","pes":1},{"camp":"edat_anys","pes":0.5,"desde":20}]}}'
 WHERE plantilla = 'fabrica' AND categoria = 'entrenable';

-- Posicions objectiu per al filtre de compra d'entrenables (ja no hi ha buckets).
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'compra_posicions', '["MC","ED","EE"]', 'json');
