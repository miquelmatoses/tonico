-- Doctrina juvenil v3 bloc 2 · punt 1 — poms de la fórmula del NIVELL numèric (substituïx
-- els grups G1-G5). Tot config; la lògica és a lib/ranquing_juvenil.js.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'nivell_pes_a',        '1.0',  'float'),   -- pes de l'entrenament principal (A)
  ('competitiva', 'nivell_pes_b',        '0.66', 'float'),   -- pes del secundari (B)
  ('competitiva', 'nivell_f_marge',      '0.5',  'float'),   -- fracció del marge (potencial−actual) que compta
  ('competitiva', 'nivell_marge_esperat','3',    'float'),   -- marge assumit quan el potencial és desconegut
  ('competitiva', 'nivell_valor_desconegut_defecte', '5', 'float');  -- valor esperat d'un desconegut (autocalibra)
