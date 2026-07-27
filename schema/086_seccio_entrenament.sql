-- Tonico — migració 086 · l'entrenador es declara, i el seu nivell parla amb la fórmula.
--
-- EL FORAT. La 077 va moure el nivell de l'entrenador a `coach_entrenament` (la paraula:
-- «passable») i va deixar `nivell` a NULL, perquè l'entrenador no cobra per l'escala dels
-- especialistes. Però la fórmula de velocitat d'entrenament (085) llig un nivell NUMÈRIC de
-- l'escala de Schum, que va de 4 a 8. Resultat: `nivell` era NULL, la velocitat eixia null i
-- la columna «10(6)» dels entrenables estava buida sense dir per què.
--
-- EL PONT entre les dues escales. Schum indexa l'entrenador de 4 a 8 i posa el sòlid a 1,0,
-- que és la referència. La nostra escala ve de la guia «Coach» i té sis graons; el més baix
-- («pobre») cau per davall del rang de Schum i s'hi arrima al mínim, que és el que fa la
-- implementació d'Hattrick Organizer («coachLevel = 4; // calc minimum»).
INSERT OR REPLACE INTO constants_joc (clau, valor, nota) VALUES
  ('coach_nivell_schum', '{"pobre":4,"fluix":4,"insuficient":5,"passable":6,"solid":7,"excellent":8}',
   'El nivell d''entrenador de la guia «Coach» en l''escala 4..8 de la fórmula de Schum. Sòlid = 7 = 1,0.');
