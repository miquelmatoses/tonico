-- Tonico — migració 012: Fotrem complet (Fase 7). Decisió per juvenil (elegit /
-- seguiment / cua d'eixida), llindars d'acceptació de crides i alerta predictiva.
CREATE TABLE juvenils_estat (
  jugador_id  INTEGER PRIMARY KEY REFERENCES jugadors(id),
  estat       TEXT NOT NULL DEFAULT 'seguiment'
                CHECK (estat IN ('seguiment','elegit','cua_eixida')),
  nota        TEXT
);

-- Llindars d'acceptació de crides (doctrina existent), com a pom de plantilla.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'crida_llindars',
   '{"15":{"compost_min":3},"16":{"potencial_min":7,"compost_min":6},"17":{"mai":true}}', 'json');

-- Alerta predictiva: la plantilla juvenil baixarà del mínim per promocions previstes.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_CRIDA_JUVENIL', 'juvenil', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_CRIDA_JUVENIL'), 'dies_avis', '30', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_CRIDA_JUVENIL'), 'minim', '11', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_CRIDA_JUVENIL'), 'urgencia', '68', 'int');
