-- Tonico — migració 029: principi «el parte no parla de l'alineació» (auditoria) +
-- onze juvenil + acadèmia opcional.

-- Punt 0: es desactiven les alertes que es RESOLEN alineant (passen a les seccions
-- d'alineació amb el motiu visible). Es lleva la instrucció de revelar (per jugador).
UPDATE regles SET activa=0 WHERE codi IN
  ('ALR_ENTRENABLE_SENSE_MINUTS', 'ALR_JUVENIL_SUPLENTS', 'ALR_REVELA_JUVENIL');

-- Punt 2c: la REVELACIÓ d'una habilitat és un FET del món (celebrable al parte),
-- no una instrucció d'alineació.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_REVELACIO_JUVENIL', 'juvenil', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_REVELACIO_JUVENIL'), 'urgencia', '40', 'int');

-- Punt 2b: formació de l'onze juvenil (contingut de plantilla, defecte 2-5-2 + porter).
-- El bucket entrenable (mc, per al pipeline de creativitat) són les places de descobriment.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'formacio_juvenil', '{"porter":1,"defensa":2,"mc":5,"davanter":2}', 'json');
