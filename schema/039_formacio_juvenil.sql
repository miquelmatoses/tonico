-- Polit #11.1 — Formació juvenil LEGAL. L'antiga era il·legal (5 MC → penalització de
-- sobrepoblació; a la guia els màxims s'acaben en 3). Nova: POR + 2 DC + 3 MC + 2 EXT +
-- 1 DAV = 9. Les places de revelació de creativitat són els 3 MC (1b).
UPDATE plantilles_parametres
   SET valor = '{"porter":1,"defensa":2,"mc":3,"extrem":2,"davanter":1}'
 WHERE plantilla = 'fabrica' AND clau = 'formacio_juvenil';

-- Màxims per posició (constants del joc, penalitzacions de sobrepoblació): l'alineador
-- juvenil I el sènior no els superen MAI. defensa = 3 DC + 2 laterals.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('maxims_posicio', '{"porter":1,"defensa":5,"mc":3,"extrem":2,"davanter":3}', 'text',
   'Màxims per bucket (sobrepoblacio de la guia): mai més d''estos a l''alineació');
