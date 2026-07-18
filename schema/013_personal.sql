-- Tonico — migració 013: personal i entrenament (Fase 8). Config esperada per
-- fase (contingut), estat declarat per l'usuari i alerta de desquadre.
CREATE TABLE fases_config (
  plantilla  TEXT NOT NULL,
  fase       TEXT NOT NULL,
  config     TEXT NOT NULL,       -- JSON: personal esperat, canvis amb costos
  PRIMARY KEY (plantilla, fase)
);
INSERT INTO fases_config (plantilla, fase, config) VALUES
  ('fabrica','fabrica',
   '{"personal":{"assistents":2,"metge":1,"psicoleg":0},"nota":"Fàbrica: 2 assistents alts + metge, sense psicòleg"}'),
  ('fabrica','inflexio',
   '{"personal":{"assistents":2,"metge":1,"psicoleg":1},"canvis":[{"nom":"Salvatella → entrenador (notable)","cost":430000},{"nom":"General → Tribuna","cost":0},{"nom":"Pujada de resistència","cost":0}],"nota":"Inflexió: paquet complet"}'),
  ('fabrica','competitiu',
   '{"personal":{"assistents":2,"metge":1,"psicoleg":1},"nota":"Competitiu"}');

-- Estat declarat per l'usuari (què té ara mateix)
CREATE TABLE personal_declarat (
  usuari_id  INTEGER NOT NULL REFERENCES usuaris(id),
  clau       TEXT NOT NULL,       -- assistents, metge, psicoleg...
  valor      INTEGER NOT NULL,
  PRIMARY KEY (usuari_id, clau)
);

-- Alerta si el personal declarat no quadra amb la fase actual del pla
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_PERSONAL_FASE', 'personal', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_PERSONAL_FASE'), 'urgencia', '52', 'int');
