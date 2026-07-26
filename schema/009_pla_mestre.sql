-- Tonico — migració 009: regles del pla.
--
-- USER-AGNOSTIC (contracte v3): esta migració portava el pla mestre d'UN equip concret
-- (temporades T83→T91 amb els seus esdeveniments, un nom propi, i el capital objectiu i la
-- temporada d'inflexió d'eixe usuari). Cap seed pot dur dades d'un equip: tot usuari nou
-- passa pel mateix onboarding i obté el mateix comportament amb les SEUES dades.
-- El pla per temporada era, a més, del model fàbrica: el v3 no en té —mana l'estratègia,
-- que viu a config_usuari (PAS 0)— i la taula es retira a la 057.
--
-- ALR_FINESTRA_VENDA_FORNADA també se'n va (les fornades es retiren a la 056).

INSERT INTO regles (codi, modul, activa, ambit) VALUES
  ('ALR_CANVI_FASE', 'pla', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_CANVI_FASE'), 'temporades_avis', '1', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_CANVI_FASE'), 'urgencia', '85', 'int');
