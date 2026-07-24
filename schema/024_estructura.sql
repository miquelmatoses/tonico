-- Tonico — migració 024 (Àrea D): estructura i calendari. La divisió actual, el
-- tipus de setmana de partits (ab/un/copa) i la caducitat del Supporter viuen a
-- plans.parametres (JSON), sense esquema nou. Ací només la regla del Supporter.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_SUPPORTER', 'pla', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_SUPPORTER'), 'dies_avis', '7', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_SUPPORTER'), 'urgencia', '62', 'int');
