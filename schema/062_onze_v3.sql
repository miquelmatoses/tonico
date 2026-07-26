-- L8 · ALINEACIONS (contracte v3, PAS 9)
-- `pes_entrenament`: el valor que té ENTRENAR en un lloc que entrena, contra l'habilitat
-- que aportaria un altre jugador. Va alt a posta: la setmana d'entrenament del nucli és el
-- que el model protegix. Declarat i etiquetat: NO és mecànica de joc.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'pes_entrenament', '1000', 'int');
