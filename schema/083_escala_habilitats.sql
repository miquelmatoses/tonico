-- Tonico — migració 083 · les dues escales d'habilitat, i la que les lliga.
--
-- LA TAULA DE SALARIS DE LA GUIA (§8) NO COMENÇA ON COMENÇA L'ESCALA D'HABILITATS. Comença en
-- «Inadequate», que és el CINQUÉ esglaó de Hattrick (disastrous · wretched · poor · weak ·
-- inadequate). Els quatre primers es van deixar fora perquè per a tot el que no és porteria
-- valen 250 € igual i no distingixen res.
--
-- Per tant el nostre nivell N és el nivell N+4 de Hattrick, i es comprova als sis camps:
--   el nostre 5 val 2.250 (porteria) · 850 (creativitat) · 730 (defensa) · 590 (passades)
--   · 550 (extrem) · 790 (anotació) — i eixa fila de la guia és «Formidable», el HT 9.
--
-- EL FORAT QUE TAPA. Les habilitats dels jugadors es guarden EN BRUT, en l'escala sencera de
-- Hattrick (al CSV van d'1 a 20). El PAS 5 restava les dues coses directament:
--
--   mancança = MAX(0; nivell_objectiu − hab(jugador))     ← 5 − 8 = 0
--
-- Amb un objectiu de «Formidable» (HT 9) i un jugador amb CR 8 (Excellent), la mancança real és
-- 1 i eixia 0. TOTES les mancances eixien quatre nivells curtes, i com que la mancança és la
-- mètrica única, això arrossegava la prioritat del PAS 8 i el sobrecost del PAS 7.
INSERT OR REPLACE INTO constants_joc (clau, valor, nota) VALUES
  ('nivell_habilitat_offset', '4',
   'Guia §8: la taula de salaris comença en «Inadequate», el 5é esglaó de Hattrick. El nivell N de la taula és el nivell N+4 de l''escala d''habilitats.');
