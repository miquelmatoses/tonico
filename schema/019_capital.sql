-- Tonico — migració 019: poms per estimar el capital d'inflexió, desglossat
-- (Polit #3.5). Paco deixa de demanar-lo en fred: el proposa i l'usuari confirma
-- o edita. Tots són poms editables (cap xifra al codi).
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'inflexio_cost_reconversio', '430000', 'int'),   -- Salvatella → entrenador
  ('competitiva', 'inflexio_fitxatges_n',      '2',      'int'),   -- fitxatges «P» previstos
  ('competitiva', 'inflexio_sostre_fitxatge',  '200000', 'int'),   -- sostre per fitxatge si no hi ha comparables
  ('competitiva', 'inflexio_setmanes_coixi',   '8',      'int');   -- setmanes de nòmina de coixí
