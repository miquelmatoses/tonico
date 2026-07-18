-- Tonico — Fase 2, migració 006: motor de regles i alertes.
-- Regles inicials + els seus paràmetres (tot a BD). Ordenació per urgència.
ALTER TABLE alertes ADD COLUMN urgencia INTEGER NOT NULL DEFAULT 0;

INSERT INTO regles (codi, modul, activa, ambit) VALUES
  ('ALR_ANIVERSARI',              'aniversari', 1, 'global'),
  ('ALR_JUNTA_PORTER',            'junta',      1, 'global'),
  ('ALR_NUCLI_INCOMPLET',         'nucli',      1, 'global'),
  ('ALR_ENTRENABLE_SENSE_MINUTS', 'minuts',     1, 'global'),
  ('ALR_PROMOCIO_JUVENIL',        'juvenil',    1, 'global'),
  ('ALR_PLANTILLA_JUVENIL_MINIMA','juvenil',    1, 'global'),
  ('ALR_SENSE_CATEGORIA',         'categoria',  1, 'global');

INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_ANIVERSARI'), 'dies_avis', '14', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_ANIVERSARI'), 'categories', 'venda', 'text'),
  ((SELECT id FROM regles WHERE codi='ALR_ANIVERSARI'), 'urgencia', '70', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JUNTA_PORTER'), 'posicio_porter', 'PO', 'text'),
  ((SELECT id FROM regles WHERE codi='ALR_JUNTA_PORTER'), 'porteria_min', '5', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JUNTA_PORTER'), 'minuts_min', '60', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JUNTA_PORTER'), 'dies_sense_partit', '7', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JUNTA_PORTER'), 'urgencia', '90', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_NUCLI_INCOMPLET'), 'objectiu', '8', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_NUCLI_INCOMPLET'), 'urgencia', '60', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_ENTRENABLE_SENSE_MINUTS'), 'dies_sense_partit', '7', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_ENTRENABLE_SENSE_MINUTS'), 'urgencia', '80', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_PROMOCIO_JUVENIL'), 'dies_avis', '7', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_PROMOCIO_JUVENIL'), 'urgencia', '75', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_PLANTILLA_JUVENIL_MINIMA'), 'minim', '11', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_PLANTILLA_JUVENIL_MINIMA'), 'urgencia', '50', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_SENSE_CATEGORIA'), 'urgencia', '40', 'int');
