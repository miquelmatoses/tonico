-- Polit #11.2c — Regla: un jugador LLISTAT que està lesionat. Els compradors veuen la
-- lesió → esperar que es recupere abans de tindre'l al mercat. Mòdul 'mercat' (corre
-- sense acadèmia).
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_LESIO_VENDA', 'mercat', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_LESIO_VENDA'), 'urgencia', '80', 'int');
