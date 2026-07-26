-- L6 · EL VOCABULARI DE LA PLANTILLA passa al del contracte v3 (invariant 14).
--   core · rotatiu · titular · porter · cos · venda
-- Desapareixen entrenable, farciment, experiencia, alliberament i nucli_competitiu: eren
-- del model fàbrica. `futur_entrenador` es queda: el v3 encara el reconeix a max_partits.
--
-- Correspondència de les categories ja assignades (SQLite no permet alterar un CHECK:
-- cal refer la taula).

CREATE TABLE categories_nou (
  id               INTEGER PRIMARY KEY,
  jugador_id       INTEGER NOT NULL REFERENCES jugadors(id),
  categoria        TEXT NOT NULL CHECK (categoria IN
                     ('core','rotatiu','titular','porter','cos','venda','futur_entrenador')),
  data_assignacio  TEXT NOT NULL DEFAULT (date('now')),
  nota             TEXT,
  origen           TEXT NOT NULL DEFAULT 'auto',
  puntuacio        REAL,
  justificacio     TEXT
);

-- entrenable → core (era el nucli que entrena); farciment → cos (era el cos barat);
-- experiencia i alliberament → venda (el v3 no els reconeix i el sobrant és una
-- categoria sencera); nucli_competitiu → titular.
INSERT INTO categories_nou (id, jugador_id, categoria, data_assignacio, nota, origen, puntuacio, justificacio)
  SELECT id, jugador_id,
         CASE categoria
           WHEN 'entrenable' THEN 'core'
           WHEN 'farciment' THEN 'cos'
           WHEN 'nucli_competitiu' THEN 'titular'
           WHEN 'experiencia' THEN 'venda'
           WHEN 'alliberament' THEN 'venda'
           ELSE categoria END,
         data_assignacio, nota, origen, puntuacio, justificacio
    FROM categories_jugador;

DROP TABLE categories_jugador;
ALTER TABLE categories_nou RENAME TO categories_jugador;
CREATE INDEX IF NOT EXISTS ix_categories_jugador ON categories_jugador(jugador_id);

-- Pom del PAS 6: el mínim d'habilitat entrenada per a entrar al core. Declarat (política
-- de tall), no mecànica de joc: defecte 0 = no filtra.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'core_a_min', '0', 'int');

-- La config de categories (que encara alimenta la cerca de mercat, PAS 8) passa al
-- vocabulari nou. Les categories que el v3 no reconeix desapareixen.
UPDATE plantilles_categories SET categoria='core'    WHERE categoria='entrenable';
UPDATE plantilles_categories SET categoria='cos'     WHERE categoria='farciment';
UPDATE plantilles_categories SET categoria='titular' WHERE categoria='nucli_competitiu';
DELETE FROM plantilles_categories WHERE categoria IN ('experiencia','alliberament');

-- Els noms dels dos onzes no són «de la fàbrica»: són l'onze A (competitiu) i el B
-- (d'entrenament). Vocabulari v3.
UPDATE plantilles_parametres
   SET valor = replace(valor, 'rol.fabrica_', 'rol.onze_')
 WHERE clau = 'rols' AND valor LIKE '%rol.fabrica_%';
UPDATE regles SET codi='ALR_NUCLI_SENSE_MINUTS' WHERE codi='ALR_ENTRENABLE_SENSE_MINUTS';
