-- Polit #11.4 — Rellotge de depreciació mecànica (tercer rellotge d'agenda). Un porter
-- notable en venda sense entrenament de porteria (Castelló, PO6) perd valor cada
-- setmana → entra al primer lot d'agenda de llistat. Mòdul 'mercat'.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_DEPRECIACIO_MECANICA', 'mercat', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_DEPRECIACIO_MECANICA'), 'posicio_porter', 'PO', 'text'),
  ((SELECT id FROM regles WHERE codi='ALR_DEPRECIACIO_MECANICA'), 'porteria_min', '6', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_DEPRECIACIO_MECANICA'), 'urgencia', '55', 'int');
