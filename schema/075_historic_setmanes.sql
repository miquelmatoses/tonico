-- Tonico — migració 075 · HISTÒRIC ECONÒMIC PER SETMANA (contracte v3.1, PAS 3).
--
-- PER QUÈ PER SETMANA I NO PER PERÍODE. Cada declaració dona «la setmana passada» i «esta».
-- La setmana següent, la que era «esta» es torna a declarar com a «passada»: les declaracions
-- SE SOLAPEN. Guardant PERÍODES, cada setmana comptaria dues vegades i la mitjana eixiria
-- trucada. Guardant SETMANES, el solapament és simplement una actualització.
--
-- I la identitat de cada setmana no cal demanar-la: ix de `f_calendari` (data → temporada +
-- setmana des de l'àncora), que ja és la font única del calendari.

CREATE TABLE setmanes_economiques (
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  temporada   INTEGER NOT NULL,
  setmana     INTEGER NOT NULL,
  taquilla    INTEGER,
  patrocini   INTEGER,
  data        TEXT NOT NULL,          -- primer dia de la setmana, derivat del calendari
  declarada   TEXT NOT NULL,          -- quan es va declarar (frescor)
  PRIMARY KEY (usuari_id, temporada, setmana)
);
CREATE INDEX ix_setmanes_eco_usuari ON setmanes_economiques(usuari_id, temporada DESC, setmana DESC);

-- Quantes setmanes fan falta per a fiar-se de la mitjana. Miquel: «no proposar desfer-se dels
-- jugadors que s'alineen fins a no tindre 8 setmanes de flux».
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'setmanes_mitjana', '8', 'int');

-- ─── Les columnes mortes de `finances` ────────────────────────────────────────────────
-- `finances` arrossegava 17 columnes i només se'n llegien 10. Estes sis fa lots que no les
-- llig ningú: el total heretat i el seu desglossament (substituïts per l'històric), els premis
-- (que són estoc), el planter (derivat) i la data de període (que ara ix del calendari).
-- SQLite admet DROP COLUMN des de la 3.35; D1 hi va per damunt.
ALTER TABLE finances DROP COLUMN ingres_setmanal;
ALTER TABLE finances DROP COLUMN taquilla;
ALTER TABLE finances DROP COLUMN patrocini;
ALTER TABLE finances DROP COLUMN premis;
ALTER TABLE finances DROP COLUMN despesa_planter;
ALTER TABLE finances DROP COLUMN periode_data;

-- `taquilla_s1/s2` i `patrocini_s1/s2` es queden de moment: són l'ÚLTIMA declaració i la
-- migració de dades les llig per a sembrar l'històric. Es lleven quan l'històric estiga viu
-- a prod i verificat — una migració no destruïx la seua pròpia font.
