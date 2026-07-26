-- L10 · BUCLE D'ESTOC (contracte v3, PAS 8): comprar jugadors i obrar l'estadi competixen
-- pel mateix diner amb la mateixa unitat.
--
-- ESTADI: la guia §10 delega en calculadores CHPP. Per tant NO es modela: es DEMANA.
-- L'usuari va a la calculadora, mira la configuració NRG i declara el que li dona.
ALTER TABLE finances ADD COLUMN estadi_manteniment INTEGER;   -- €/setmana de la config NRG
ALTER TABLE finances ADD COLUMN estadi_cost_obra   INTEGER;   -- despesa puntual de l'obra
ALTER TABLE finances ADD COLUMN estadi_data        TEXT;      -- quan es va consultar

INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('url_calculadora_estadi', 'https://nrgjack.altervista.org/tools/eco', 'text',
   'Calculadora d''estadi (la guia §10 hi delega). L''usuari en declara manteniment i cost d''obra.');
