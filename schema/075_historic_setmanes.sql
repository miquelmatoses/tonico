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

-- ─── BACKFILL: l'última declaració passa a l'històric ─────────────────────────────────
-- `taquilla_s1/s2` són la declaració vigent i NO es poden perdre. Es sembren com les dues
-- setmanes que són, amb la identitat derivada del calendari com fa l'API:
--   `caixa_data` és el dia de la declaració → eixa és «esta setmana» (s2)
--   i «la passada» (s1) és set dies abans.
-- L'aritmètica és la de `calcularSetmana` + `temporadaOperativa`, en SQL: dies des de
-- l'àncora → temporada i setmana, i l'última setmana d'una temporada és la 0 de la següent.
INSERT OR REPLACE INTO setmanes_economiques (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada)
WITH anc(adata, atemp, anydies, tempset) AS (
  SELECT (SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data'),
         CAST((SELECT valor FROM constants_joc WHERE clau='calendari_ancora_temporada') AS INTEGER),
         CAST((SELECT valor FROM constants_joc WHERE clau='any_dies') AS INTEGER),
         CAST((SELECT valor FROM constants_joc WHERE clau='temporada_setmanes') AS INTEGER)
),
decl(usuari_id, data, taquilla, patrocini, declarada) AS (
  SELECT usuari_id, date(caixa_data, '-7 day'), taquilla_s1, patrocini_s1, caixa_data
    FROM finances WHERE caixa_data IS NOT NULL AND (taquilla_s1 IS NOT NULL OR patrocini_s1 IS NOT NULL)
  UNION ALL
  SELECT usuari_id, caixa_data, taquilla_s2, patrocini_s2, caixa_data
    FROM finances WHERE caixa_data IS NOT NULL AND (taquilla_s2 IS NOT NULL OR patrocini_s2 IS NOT NULL)
),
cru AS (
  -- CAST trunca cap a ZERO i `calcularSetmana` fa FLOOR: amb una data anterior a l'àncora
  -- (una pretemporada) les dues coses discrepen en una temporada sencera. Es calcula
  -- l'offset positiu primer i la divisió és llavors exacta, sense arrodoniments.
  SELECT c.*,
         (c.dia - (((c.dia % c.anydies) + c.anydies) % c.anydies)) / c.anydies AS temporades,
         (((c.dia % c.anydies) + c.anydies) % c.anydies) / 7 + 1                AS setm
    FROM (SELECT d.usuari_id, d.data, d.taquilla, d.patrocini, d.declarada,
                 a.atemp, a.anydies, a.tempset,
                 CAST(ROUND(julianday(d.data) - julianday(a.adata)) AS INTEGER) AS dia
            FROM decl d, anc a) c
)
SELECT usuari_id,
       CASE WHEN setm >= tempset THEN atemp + temporades + 1 ELSE atemp + temporades END,
       CASE WHEN setm >= tempset THEN 0 ELSE setm END,
       taquilla, patrocini, data, declarada
  FROM cru;
