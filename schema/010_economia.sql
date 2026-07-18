-- Tonico — migració 010: economia (Fase 5). La taula transaccions ja existix
-- des de la Fase 0. Ací només la regla que detecta moviments pendents d'apuntar.
INSERT INTO regles (codi, modul, activa, ambit) VALUES
  ('ALR_TRANSACCIO_PENDENT', 'economia', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_TRANSACCIO_PENDENT'), 'urgencia', '55', 'int');
