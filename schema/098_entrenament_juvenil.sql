-- Tonico — migració 098 · com entrena un juvenil segons on juga.
--
-- El text del joc (Equip Juvenil » Entrenament) diu tres graons i no dona cap xifra:
--   «Creativitat millora l'habilitat als jugadors que juguin de MIG CENTRES. Els EXTREMS
--    reben un efecte MENOR, i els ALTRES jugadors que juguin rebran un efecte ENCARA MENOR.»
--
-- Les xifres es DEDUÏXEN de les taules públiques de hattrick-youthclub.org, que publiquen
-- els matxos necessaris per nivell segons edat, nivell i POSICIÓ. Comparant la mateixa
-- taula canviant només la posició, els quocients ixen constants:
--
--   creativitat, 15 anys, 0→1:  mig centre 3,67 · extrem 7,33 · altres 24,43
--   ràtio extrem/mig centre = 2,000  a les 16 combinacions comprovades  → factor 0,50
--   ràtio altres/mig centre = 6,666  a les 16 combinacions comprovades  → factor 0,15
--
-- El tercer graó és UNIFORME: davanter i porter donen el mateix número. «Els altres
-- jugadors que juguin» és literal, porter inclòs.
--
-- És el mateix mètode amb què vam validar la fórmula de Schum per al sènior: no s'estima,
-- es contrasta contra una font que publica els números.
--
-- QUI ÉS DE CADA GRAÓ ja ho diuen les taules que tenim: `taula_entrenament` és el graó ple
-- i `taula_entrenament_baix` el mitjà (creativitat → extrem). La resta de posicions cauen al
-- residual. Ací només van els FACTORS, que és el que faltava.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('entrenament_juvenil_factors',
   '{"ple":1,"baix":0.5,"residual":0.15}',
   'text',
   'Factor d''entrenament juvenil segons el graó de la posició. Ple: taula_entrenament. Baix: taula_entrenament_baix. Residual: qualsevol altra posició que jugue (porter inclòs). Deduït de les taules de hattrick-youthclub.org (ràtios 2,000 i 6,666 constants).');

-- I EL LLINDAR DE REVELACIÓ. L'entrenador revela l'habilitat principal d'un juvenil quan
-- juga en «posició entrenable», i una posició del graó RESIDUAL no compta (confirmat per
-- Miquel el 2026-07-27, que ho veu als seus informes).
--
-- La conseqüència val més que el número: per a l'habilitat que entrenes, REVELAR I ENTRENAR
-- SÓN LA MATEIXA ACCIÓ. No cal traure mai un candidat bo de la seua posició per a descobrir-lo,
-- i per tant el pla de descobriment no pot demanar-ho.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('revelacio_factor_min',
   '0.5',
   'float',
   'Factor d''entrenament mínim perquè la posició compte com a «entrenable» i l''entrenador revele l''habilitat. El graó residual (0,15) no revela.');
