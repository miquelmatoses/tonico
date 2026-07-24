-- Tonico — migració 033 (polit #9): mecànica del llistat (el tercer dia) + onze
-- juvenil legal. Constants del joc (contingut, no codi).
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('dies_subhasta',   '3', 'int', 'La subhasta tanca a llistat + 3 dies'),
  ('minim_jugadors',  '9', 'int', 'Mínim de jugadors en camp per a un partit viable (òptim juvenil: 8 + porter)');

-- Recordatori: la subhasta d'un jugador llistat tanca demà (no la perdes).
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_SUBHASTA_TANCA', 'mercat', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_SUBHASTA_TANCA'), 'urgencia', '85', 'int');
