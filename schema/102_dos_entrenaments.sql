-- Tonico — migració 102 · el sènior i l'acadèmia entrenen coses distintes.
--
-- Hattrick té DOS entrenaments independents, i no tenen ni la mateixa forma:
--
--   PRIMER EQUIP   una habilitat  +  intensitat  +  resistència
--   ACADÈMIA       principal  +  secundari         (i cap intensitat)
--
-- El doble entrenament és exclusiu de l'acadèmia. El model els tenia fusionats en un sol joc
-- de poms —`entrenament_a`, `entrenament_b`, `intensitat_pct`, `resistencia_pct`— i això
-- produïa dos errors alhora: la pantalla del sènior li demanava a Miquel un «entrenament B»
-- que el primer equip no té enlloc, i TOT el PAS 10 penjava de l'habilitat del sènior. Amb
-- els dos coincidint no es notava; el dia que divergiren, el pla juvenil hauria planificat
-- per a l'habilitat equivocada sense dir res.
--
-- Els dos són PRESCRITS, no triats: el sènior entrena el que alimenta els llocs del motor, i
-- l'acadèmia entrena el que fabrica entrenables. Per això són poms i no declaracions.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus)
  SELECT plantilla, 'entrenament_juvenil_a', 'creativitat', 'text'
    FROM (SELECT DISTINCT plantilla FROM plantilles_parametres);
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus)
  SELECT plantilla, 'entrenament_juvenil_b', 'passades', 'text'
    FROM (SELECT DISTINCT plantilla FROM plantilles_parametres);

-- I fora el «B» del sènior, que era el secundari de l'acadèmia posat on no tocava. Les places
-- del primer equip ja es deriven només de `entrenament_a` (vore placesEntrenament).
DELETE FROM plantilles_parametres WHERE clau = 'entrenament_b';

-- L'ESTAT MANUAL D'UN JUVENIL (seguiment / elegit / cua d'eixida) se'n va: el pla del PAS 10
-- ja decidix qui juga, qui sobra i qui es promociona, o siga que el desplegable era una
-- decisió que el sistema ignorava — un control que mentia. I la seua columna `nota` no la
-- podia escriure ningú (el formulari només enviava l'estat) ni la llegia ningú.
DROP TABLE IF EXISTS juvenils_estat;
