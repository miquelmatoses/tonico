-- Polit #10.3 — «L'informe és l'agenda d'hui». Els ítems amb acció FUTURA viuen a
-- la subsecció Agenda com a files estat='agenda' (reconstruïdes cada revisió). Cal
-- ampliar el CHECK d'estat. SQLite no permet ALTER del CHECK → reconstrucció de la
-- taula (patró migració 022), conservant urgencia (006) i data_accio (035).
CREATE TABLE alertes_nou (
  id            INTEGER PRIMARY KEY,
  usuari_id     INTEGER NOT NULL REFERENCES usuaris(id),
  regla_id      INTEGER NOT NULL REFERENCES regles(id),
  jugador_id    INTEGER REFERENCES jugadors(id),
  data          TEXT NOT NULL DEFAULT (date('now')),
  missatge_clau TEXT NOT NULL,
  parametres    TEXT,
  estat         TEXT NOT NULL DEFAULT 'nova'
                  CHECK (estat IN ('nova','vista','resolta','ignorada','agenda')),
  urgencia      INTEGER NOT NULL DEFAULT 0,
  data_accio    TEXT
);
INSERT INTO alertes_nou (id, usuari_id, regla_id, jugador_id, data, missatge_clau, parametres, estat, urgencia, data_accio)
  SELECT id, usuari_id, regla_id, jugador_id, data, missatge_clau, parametres, estat, urgencia, data_accio FROM alertes;
DROP TABLE alertes;
ALTER TABLE alertes_nou RENAME TO alertes;
CREATE INDEX ix_alertes_usuari ON alertes(usuari_id, estat);
