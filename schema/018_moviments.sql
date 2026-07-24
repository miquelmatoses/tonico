-- Tonico — migració 018: doctrina «ACTUA, INFORMA, DESFÉS» (polit #3.1).
-- La taula intercanvis passa a guardar moviments EXECUTATS (amb la categoria
-- prèvia de l'entrant per poder desfer) i afig els estats 'executat'/'desfet'.
CREATE TABLE intercanvis_nou (
  id                       INTEGER PRIMARY KEY,
  usuari_id                INTEGER NOT NULL REFERENCES usuaris(id),
  categoria                TEXT NOT NULL,
  entrant_id               INTEGER REFERENCES jugadors(id),
  eixent_id                INTEGER NOT NULL REFERENCES jugadors(id),
  puntuacio_entrant        REAL,
  puntuacio_eixent         REAL NOT NULL,
  diferencia               REAL,
  desti_eixent             TEXT,
  categoria_previa_entrant TEXT,               -- per desfer: on tornar l'entrant
  estat                    TEXT NOT NULL DEFAULT 'pendent'
                             CHECK (estat IN ('pendent','acceptat','rebutjat','executat','desfet')),
  diferencia_al_rebutjar   REAL,
  data                     TEXT NOT NULL DEFAULT (date('now'))
);
INSERT INTO intercanvis_nou (id, usuari_id, categoria, entrant_id, eixent_id, puntuacio_entrant, puntuacio_eixent, diferencia, desti_eixent, estat, diferencia_al_rebutjar, data)
  SELECT id, usuari_id, categoria, entrant_id, eixent_id, puntuacio_entrant, puntuacio_eixent, diferencia, desti_eixent, estat, diferencia_al_rebutjar, data FROM intercanvis;
DROP TABLE intercanvis;
ALTER TABLE intercanvis_nou RENAME TO intercanvis;
CREATE INDEX ix_intercanvis_usuari ON intercanvis(usuari_id, estat);
