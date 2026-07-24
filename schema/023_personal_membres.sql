-- Tonico — migració 023 (Àrea B): personal ric. El model pla clau→int
-- (personal_declarat) no captura sou ni contracte; passem a membres amb nivell,
-- sou i setmanes de contracte. L'entrenador principal és un membre més (rol).
CREATE TABLE personal_membres (
  id                  INTEGER PRIMARY KEY,
  usuari_id           INTEGER NOT NULL REFERENCES usuaris(id),
  rol                 TEXT NOT NULL CHECK (rol IN ('entrenador','especialista')),
  tipus               TEXT,     -- especialista: 'assistents'|'metge'|'psicoleg'|…; entrenador: NULL
  nivell              INTEGER,
  sou                 INTEGER,   -- €/setmana
  setmanes_contracte  INTEGER
);
CREATE INDEX ix_personal_membres_usuari ON personal_membres(usuari_id);

-- Regla: a un contracte de personal li queden poques setmanes.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_CONTRACTE_PERSONAL', 'personal', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_CONTRACTE_PERSONAL'), 'setmanes_avis', '2', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_CONTRACTE_PERSONAL'), 'urgencia', '58', 'int');
