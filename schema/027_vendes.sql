-- Tonico — migració 027 (Àrea E): fitxa de venda per jugador. Preu d'eixida
-- (proposat des de comparables, editable), data de llistada i estat del procés.
-- Els comparables de mercat s'introduïxen des de la secció Mercat (preus_observats).
CREATE TABLE vendes (
  jugador_id     INTEGER PRIMARY KEY REFERENCES jugadors(id),
  usuari_id      INTEGER NOT NULL REFERENCES usuaris(id),
  preu_eixida    INTEGER,     -- objectiu d'eixida (proposat o editat)
  data_llistada  TEXT,
  estat          TEXT NOT NULL DEFAULT 'pendent'
                   CHECK (estat IN ('pendent','llistat','venut','desert','despatxat')),
  preu_venut     INTEGER      -- import real en tancar la venda
);
CREATE INDEX ix_vendes_usuari ON vendes(usuari_id);
