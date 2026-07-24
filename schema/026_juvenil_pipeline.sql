-- Tonico — migració 026 (Àrees F/G): regles del pipeline juvenil i especialitats.
-- Validació de l'entrenament juvenil declarat (F.12) i alerta d'un juvenil amb
-- especialitat descoberta (G.14 — valor a protegir en decidir eixides).
INSERT INTO regles (codi, modul, activa, ambit) VALUES
  ('ALR_ENTRENAMENT_JUVENIL', 'juvenil', 1, 'global'),
  ('ALR_JOVE_ESPECIALITAT',   'juvenil', 1, 'global'),
  ('ALR_JOVE_FORA_PIPELINE',  'juvenil', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_ENTRENAMENT_JUVENIL'), 'urgencia', '55', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JOVE_ESPECIALITAT'),   'urgencia', '48', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JOVE_FORA_PIPELINE'),  'urgencia', '50', 'int');
