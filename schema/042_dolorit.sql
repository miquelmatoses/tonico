-- Polit #12.1b — Marca MANUAL «dolorit» (molèsties/creueta a HT). NO és derivable de
-- l'export (limitació de la font, resoluble amb CHPP → v. ENTRADES_MANUALS). És un
-- OVERRIDE opcional: mai demanat, mai requerit (regla dels overrides). Si l'usuari la
-- posa, l'alineador mostra l'avís de risc (recaiguda probable) i un pom de fase decidix
-- si els dolorits en venda descansen de l'aparador. S'esborra sola si el jugador passa
-- a lesionat N o en passar el termini (pom dolorit_caducitat_dies).
CREATE TABLE marca_dolorit (
  jugador_id  INTEGER PRIMARY KEY REFERENCES jugadors(id),
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  data_marca  TEXT NOT NULL
);
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('dolorit_caducitat_dies', '14', 'int', 'Dies fins que la marca manual de dolorit caduca sola');
-- Pom de fase: en fàbrica (no competitiu) els dolorits en venda descansen de l'aparador.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'dolorit_descansa_aparador', 'true', 'bool');
