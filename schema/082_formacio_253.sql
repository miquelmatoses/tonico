-- Tonico — migració 082 · la formació passa a 2-5-3.
--
-- Miquel: 1 porter, 2 defenses, 3 mig centres, 2 extrems, 3 davanters.
--
-- PER QUÈ IMPORTA MÉS DEL QUE SEMBLA. El pressupost de sou es reparteix entre els llocs per
-- pes, o siga que el nombre de llocs de cada tipus decidix quant diner va a cada línia. Els
-- pesos PER LLOC ja posaven el davanter (0,8946) per damunt del defensa (0,7426) —això ve de
-- la matriu d'aportació de la guia i no s'ha tocat—, però amb 3 defenses i 2 davanters el BLOC
-- defensiu s'enduia més (2,23 contra 1,79). Amb 2-5-3 s'invertix: 1,49 contra 2,68.
--
-- Els llocs que ENTRENEN no canvien: els 3 MC al 100% i els 2 extrems al 50%. Per tant `N_core`
-- (5) i el pipeline d'entrenament (creativitat + passades) es queden igual.
UPDATE plantilles_parametres
   SET valor = '[{"codi":"POR","bucket":"porter","entrena":false},
      {"codi":"DC1","bucket":"defensa","entrena":false},
      {"codi":"DC2","bucket":"defensa","entrena":false},
      {"codi":"MC1","bucket":"mc","entrena":true,"pct":100},
      {"codi":"MC2","bucket":"mc","entrena":true,"pct":100},
      {"codi":"MC3","bucket":"mc","entrena":true,"pct":100},
      {"codi":"EXT1","bucket":"extrem","entrena":true,"pct":50},
      {"codi":"EXT2","bucket":"extrem","entrena":true,"pct":50},
      {"codi":"DAV1","bucket":"davanter","entrena":false},
      {"codi":"DAV2","bucket":"davanter","entrena":false},
      {"codi":"DAV3","bucket":"davanter","entrena":false}]'
 WHERE plantilla = 'competitiva' AND clau = 'formacio';
