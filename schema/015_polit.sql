-- Tonico — migració 015: ajustos del polit #1.
-- Punt 2: urgència suau de la Junta (venda-pla no llistat = recordatori).
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_JUNTA_PORTER'), 'urgencia_suau', '45', 'int');

-- Punt 4: el mínim juvenil de Miquel és 10 (doctrina: menys jugadors = revelacions
-- i minuts menys diluïts = descobriment més ràpid). L'alerta operativa és la
-- predictiva (ALR_CRIDA_JUVENIL), no el mínim estàtic.
UPDATE regles_parametres SET valor='10'
 WHERE clau='minim' AND regla_id IN (SELECT id FROM regles WHERE codi IN ('ALR_PLANTILLA_JUVENIL_MINIMA','ALR_CRIDA_JUVENIL'));

-- Punt 5: reserva operativa (coixí que no s'invertix en fitxatges), pom de plantilla.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'reserva_operativa', '50000', 'int');

-- Punt 7: el capital objectiu de la inflexió és un pom que posa Miquel; els 430k
-- eren el cost de Salvatella (una partida), no el capital. Es lleva de defecte.
UPDATE plans SET parametres='{"temporada_inflexio":88}' WHERE plantilla='fabrica';

-- Punt 6: 15 anys «acceptar llevat que siga clarament fluix» (desconegut ≠ fluix).
UPDATE plantilles_parametres
   SET valor='{"15":{"compost_min":3,"per_defecte":"accepta"},"16":{"potencial_min":7,"compost_min":6},"17":{"mai":true}}'
 WHERE plantilla='fabrica' AND clau='crida_llindars';

-- Punt 5: alerta de compra accionable (filtre concret + pressupost màxim).
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_COMPRA_ENTRENABLE', 'mercat', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_COMPRA_ENTRENABLE'), 'urgencia', '72', 'int');
