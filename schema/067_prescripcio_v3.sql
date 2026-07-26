-- L·P1 · L'ENTRENAMENT ÉS PRESCRIPCIÓ, NO CONFIGURACIÓ (contracte v3, PAS 1)
--
--   (A, B) = (creativitat, passades) · intensitat 100% · resistència `resistencia_pct`
--
-- Raó del full: el motor de partit decidix per possessió del mig del camp, i el mercat de
-- MC és el més líquid → és l'entrenament que competix i finança alhora. Per tant NO es
-- tria: es prescriu. Deixa de vindre de `fases_config` (model retirat) i passa a ser el
-- contracte mateix.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'entrenament_a',   'creativitat', 'text'),
  ('competitiva', 'entrenament_b',   'passades',    'text'),
  ('competitiva', 'intensitat_pct',  '100',         'int'),
  ('competitiva', 'resistencia_pct', '10',          'int');

-- L'override per pla desapareix: si l'entrenament es prescriu, no es configura.
UPDATE plans SET parametres = json_remove(COALESCE(parametres, '{}'), '$.entrenament_senior')
 WHERE parametres IS NOT NULL;
