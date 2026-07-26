-- Polit #11.5 — Estimacions amb peu a terra. Base d'estimació PER DIVISIÓ (VII molt
-- per davall dels valors actuals inflats). Es pren la divisió del pla (Miquel la
-- declara a config_usuari.divisio); si no n'hi ha, el defecte (VII). El
-- recalibratge amb vendes reals (comparables) substituïx el pom en quant hi haja dades.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('estimacio_per_divisio',
   '{"VII":2000,"VI":8000,"V":25000,"IV":70000,"III":180000,"II":450000,"I":1200000}',
   'text', 'Base d''estimació grossa per divisió (orientativa, NO calibrada). Poms tunejables.'),
  ('divisio_defecte', 'VII', 'text', 'Divisió per defecte quan el pla no la declara');
