-- Doctrina de LIQUIDACIÓ — el valor no espera. Un jugador de venda es llista HUI per
-- defecte; els únics ajornaments són lesió i depressió profunda sense rellotge d'urgència.
-- Substituïx la recomanació d'aniversari-venda i la depreciació com a agendes d'espera.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_LLISTAR_VENDA', 'mercat', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'urgencia',           '72', 'int'),   -- amb rellotge d'urgència (aniversari/depreciació)
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'urgencia_normal',    '55', 'int'),   -- llistar ja, sense urgència especial
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'urgencia_lesionat',  '40', 'int'),   -- ajornat per lesió
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'dies_aniversari',    '14', 'int'),   -- aniversari «a la vora»
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'posicio_porter',     'PO', 'text'),
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'porteria_deprecia',  '6',  'int'),   -- porter notable+ = depreciació mecànica
  ((SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA'), 'depressio_profunda', '-20', 'int');  -- modificador de mercat per davall = depressió profunda

-- La depreciació mecànica queda plegada dins de la liquidació (rellotge d'urgència).
UPDATE regles SET activa=0 WHERE codi='ALR_DEPRECIACIO_MECANICA';
