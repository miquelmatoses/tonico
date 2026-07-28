-- Tonico — migració 100 · el que li faltava al PAS 10.
--
-- La 099 va guardar la matriu de velocitat de CREATIVITAT. Ací va la de PASSADES i els tres
-- poms que la rutina del PAS 10 necessita.
--
-- PASSADES: mateixa font i mateix format que la de creativitat (matxos de lliga amb
-- entrenament principal, posició de graó ple, per edat i nivell de partida). Comprovat que
-- el DAVANTER dona exactament els mateixos números que el mig centre: per a passades, mig
-- centre, extrem i davanter són el mateix graó, i tota la resta cau al 0,15 de sempre.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('velocitat_juvenil_passades',
   '{"15.0":[3.19,3.67,4.09,4.47,4.80,5.08,5.32,5.51],
     "15.56":[3.41,3.91,4.37,4.77,5.12,5.43,5.68,5.88],
     "16.0":[3.64,4.18,4.66,5.09,5.47,5.79,6.06,6.28],
     "16.56":[3.89,4.46,4.98,5.44,5.84,6.19,6.47,6.71],
     "17.0":[4.15,4.76,5.31,5.81,6.24,6.60,6.91,7.16],
     "17.56":[4.43,5.09,5.67,6.20,6.66,7.05,7.38,7.65],
     "18.0":[4.73,5.43,6.06,6.62,7.11,7.53,7.88,8.16],
     "18.56":[5.05,5.80,6.47,7.07,7.59,8.04,8.41,8.72]}',
   'text',
   'Partits de lliga amb entrenament principal en posició de graó PLE per a pujar un nivell de passades. Mateix format que velocitat_juvenil_creativitat. Font: hattrick-youthclub.org/site/trainingsspeed (training/5, position/4; comprovat idèntic a position/5).');

-- EL SECUNDARI rendix 2/3 del principal, o siga que costa 1,5 vegades més matxos. Tonico
-- entrena passades com a secundària: sense esta correcció la projecció eixiria un terç
-- massa optimista.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('entrenament_juvenil_secundari_divisor', '1.5', 'float',
   'Multiplicador de matxos quan l''habilitat s''entrena com a SECUNDÀRIA (rendix 2/3 del principal).');

-- EL SUB-NIVELL. «Creativitat 4» vol dir en algun punt de [4,00 · 5,00) i el CSV no diu on.
-- Tonico assumix la vora ALTA: descartar algú per una suposició pessimista seria inventar-se
-- un motiu, i ací només es descarta pel que es veu. Amb el terra, dos jugadors de la primera
-- prova canviaven de veredicte per 0,3 i 0,6 — la navalla la creava el supòsit, no la dada.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('sub_nivell_desconegut', '0.9', 'float',
   'On se suposa que està un jugador dins del seu nivell quan no se sap. Vora alta: no es descarta ningú per pessimisme. Deixa de fer falta quan puja de nivell, perquè llavors el joc publica on està.');

-- EL LLISTÓ DE PASSADES. El de creativitat és `entrenable_creativitat_min`, el mateix amb què
-- es compra: l'acadèmia i el mercat fabriquen el mateix producte. El de passades és més baix
-- perquè passades no és el producte — és el RESCAT del que ja no arribarà per creativitat:
-- que en lloc de roín arribe a mediocre i valga alguna cosa.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus)
  SELECT plantilla, 'juvenil_passades_min', '5', 'int'
    FROM (SELECT DISTINCT plantilla FROM plantilles_parametres);
