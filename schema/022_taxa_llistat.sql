-- Tonico — migració 022 (Àrea A.3): tipus de moviment 'taxa_llistat' (cost fix
-- de posar un jugador al mercat, p.ex. 1.000 €). Cal reconstruir la taula perquè
-- el tipus viu en un CHECK.
CREATE TABLE transaccions_nou (
  id          INTEGER PRIMARY KEY,
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  jugador_id  INTEGER REFERENCES jugadors(id),
  tipus       TEXT NOT NULL CHECK (tipus IN
                ('compra','venda','sou_setmanal','ingres_patrocini',
                 'taquilla','personal','estadi','taxa_llistat','altres')),
  import      INTEGER NOT NULL,
  data        TEXT NOT NULL,
  nota        TEXT
);
INSERT INTO transaccions_nou (id, usuari_id, jugador_id, tipus, import, data, nota)
  SELECT id, usuari_id, jugador_id, tipus, import, data, nota FROM transaccions;
DROP TABLE transaccions;
ALTER TABLE transaccions_nou RENAME TO transaccions;
CREATE INDEX ix_transaccions_usuari ON transaccions(usuari_id, data);
