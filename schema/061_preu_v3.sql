-- L7 · PREU I DESTÍ (contracte v3, PAS 7)
--
-- 1. `depressio_profunda` passa a FRACCIÓ. Estava en enters (−20) i es comparava amb un
--    modificador de mercat que no baixa de −0,15: la branca d'ajornar per depressió NO
--    S'ACTIVAVA MAI. Ara −0,20, les mateixes unitats que el modificador.
UPDATE regles_parametres SET valor = '-0.20', tipus = 'float'
 WHERE clau = 'depressio_profunda';

-- 2. `min_mostres`: quantes mostres calen per a dir que un preu està calibrat. Abans era
--    implícit (≥1 comparable). Declarat: política de prudència, no mecànica de joc.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'min_mostres', '3', 'int');

-- 3. `base_preu_divisio`: el preu de referència quan no hi ha comparables. Reaprofita la
--    taula d'estimació per divisió que ja hi havia (mateixos valors, nom del contracte).
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota)
  SELECT 'base_preu_divisio', valor, tipus,
         'Preu de referència per divisió quan no hi ha comparables (PAS 7). NO CALIBRAT: no és una taula publicada.'
    FROM constants_joc WHERE clau = 'estimacio_per_divisio';
DELETE FROM constants_joc WHERE clau = 'estimacio_per_divisio';

-- 4. `dies_urgencia`: el v3 unifica el nom (abans `dies_aniversari` a la regla de venda).
UPDATE regles_parametres SET clau = 'dies_urgencia' WHERE clau = 'dies_aniversari';
