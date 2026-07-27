-- Tonico — migració 085 · la velocitat d'entrenament (fórmula de Schum).
--
-- D'ON IX. Hattrick no publica quant costa pujar un nivell. La fórmula que gasta la comunitat
-- és de Schum, i Hattrick Organizer la documenta sencera amb els enllaços al fòrum:
--   src/main/java/core/training/WeeklyTrainingType.java
--
--   T = f(nivell) × K(entrenador) × K(assistents) × K(intensitat) × K(resistència)
--       × K(habilitat) × K(edat) × K(minuts) × 0,01        → increment d'habilitat en 1 setmana
--   setmanes per nivell = 1 / T
--
-- CONTRASTADA amb una segona implementació independent (HT-Tools, ventouris/hattricktools):
-- les dues donen el mateix dins de mig setmana en tot el rang. La referència del wiki que jo
-- havia agafat (6,5 setmanes per a sòlid→excel·lent) no quadra amb cap de les dues: era jo qui
-- l'havia llegida mal, no les fórmules.
INSERT OR REPLACE INTO constants_joc (clau, valor, nota) VALUES
  ('entrenament_f_nivell', '{"tall":9,"baix_a":16.289,"baix_b":-0.1396,"alt_a":54.676,"alt_b":-1.438}',
   'Schum: f(n) = 16,289·e^(−0,1396·n) per davall de 9; 54,676/n − 1,438 a partir de 9.'),
  ('entrenament_k_habilitat', '{"porteria":5.10,"defensa":2.88,"creativitat":3.36,"extrem":4.80,"passades":3.60,"anotacio":3.24,"pilota_aturada":14.70}',
   'Schum: K(habilitat) en %. La pilota aturada puja molt més ràpid perquè parteix de molt més avall.'),
  ('entrenament_k_entrenador', '{"4":0.7343,"5":0.8324,"6":0.9200,"7":1.0000,"8":1.0375}',
   'Schum: K(entrenador) per nivell 4..8 (fluix..excel·lent). Sòlid = 1, que és la referència.'),
  ('entrenament_k_assistents', '{"base":1,"per_nivell":0.035,"max":10}',
   'Schum: K(assistents) = 1 + nivells×0,035, fins a 10 nivells (2 assistents de nivell 5).'),
  ('entrenament_k_edat', '{"numerador":54,"suma":37}',
   'Schum: K(edat) = 54/(edat+37). Als 17 val 1 i baixa suau: als 20, 0,947; als 25, 0,871.');

-- PRESCRIPCIÓ, no decisió: Miquel no tria estos dos, són com l'entrenament mateix.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'entrenament_intensitat', '100', 'int'),
  ('competitiva', 'entrenament_resistencia', '10', 'int');
