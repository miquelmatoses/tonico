-- Tonico — migració 011: mercat (Fase 6.2). Registre de preus observats
-- (comparables) i regla de finestra de compra.
CREATE TABLE preus_observats (
  id         INTEGER PRIMARY KEY,
  usuari_id  INTEGER NOT NULL REFERENCES usuaris(id),
  posicio    TEXT,
  edat       INTEGER,
  habilitat  INTEGER,          -- habilitat de referència del comparable
  preu       INTEGER NOT NULL,
  data       TEXT NOT NULL DEFAULT (date('now')),
  nota       TEXT
);
CREATE INDEX ix_preus_usuari ON preus_observats(usuari_id);

-- Poms de compra per a la plantilla fàbrica
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'compra_edat_max', '18', 'int'),
  ('fabrica', 'compra_creativitat_min', '6', 'int');

-- Regla de finestra de mercat (compra en depressió)
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_FINESTRA_MERCAT', 'mercat', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_FINESTRA_MERCAT'), 'setmanes_avis', '2', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_FINESTRA_MERCAT'), 'urgencia', '58', 'int');
