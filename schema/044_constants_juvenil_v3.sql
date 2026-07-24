-- Doctrina juvenil v3 · punt 1 — constants VERIFICADES (fonts a DECISIONS).
-- 1a) Promoció: màxim UNA per setmana (wiki HT). Elegibilitat = DUES condicions
--     INDEPENDENTS (no una edat combinada): edat >= 17 ANYS (NO 17a+112d, que serien ~18)
--     I antiguitat a l'acadèmia >= 112 DIES (temps a l'acadèmia, a banda de l'edat).
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('promocio_max_setmana',      '1',   'int', 'Màxim de promocions juvenils per setmana (wiki HT)'),
  ('promocio_edat_min_anys',    '17',  'int', 'Edat mínima per a promocionar (anys)'),
  ('promocio_dies_min_academia','112', 'int', 'Dies mínims a l''acadèmia per a promocionar'),
-- 1b) Bonus de club mare: +1,5 nivells a TOTES les habilitats en promocionar (fins a la
--     venda). Entra a l'estimador del promocionar-per-vendre.
  ('bonus_club_mare',           '1.5', 'float', 'Nivells afegits a totes les habilitats en promocionar (bonus de club mare, fins a la venda)');

-- 1c) Reinici de la crida: 1 HORA DESPRÉS de l'actualització econòmica del país.
--     Economia dissabte 01:00 → crida disponible dissabte 02:00. CORRECCIÓ de la finestra
--     vigent: era divendres 18:00 (dues fonts velles, v. DECISIONS); ara dissabte 02:00.
--     El moment és pom PER USUARI (l'actualització econòmica varia per país).
UPDATE constants_joc SET valor='6',     nota='Dia de reinici de la crida (0=diumenge…6=dissabte). Economia+1h. Pom per usuari a Estructura.' WHERE clau='crida_reinici_dia';
UPDATE constants_joc SET valor='02:00', nota='Hora de reinici de la crida (actualització econòmica del país + 1h). Pom per usuari.' WHERE clau='crida_reinici_hora';

-- Doctrina juvenil v3 · punt 2 — MOTOR DE VALOR DE PLAÇA. Taula config
-- entrenament→buckets entrenables (de la guia; tunejable). Zero al codi.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('taula_entrenament',
   '{"porteria":["porter"],"defensa":["defensa"],"creativitat":["mc"],"passades":["mc","extrem","davanter"],"extrem":["extrem"],"anotacio":["davanter"],"pilota_aturada":["porter"]}',
   'text', 'Taula entrenament→buckets entrenables (guia HT). El motor de valor de plaça la creua.');
-- Els dos entrenaments de la plantilla (A i B) per a classificar les places.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'entrenament_a', 'creativitat', 'text'),
  ('fabrica', 'entrenament_b', 'passades', 'text');

-- Doctrina juvenil v3 · punt 3 — llindar «bo» de l'habilitat actual per al rànquing.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('juvenil_bo_min', '4', 'int', 'Nivell actual mínim per a considerar «bo» una habilitat juvenil (rànquing G1-G5)');
