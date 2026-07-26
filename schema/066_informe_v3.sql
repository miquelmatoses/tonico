-- L12 · INFORME I AGENDA (contracte v3, PAS 12)
--   urgencia(acció) = BUSCA(`urgencia_tipus`; tipus(acció))    [pom; MAI a la vista]
--   nivell(acció)   = SI(urgencia ≥ `llindar_urgent`; "urgent";
--                     SI(urgencia ≥ `llindar_aviat`; "aviat"; "normal"))
-- Les llindes vivien a la VISTA (seccions.js), que és exactament el que l'invariant 12
-- prohibix. Passen a poms i les llig l'avaluador.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'llindar_urgent', '70', 'int'),
  ('competitiva', 'llindar_aviat',  '55', 'int');
