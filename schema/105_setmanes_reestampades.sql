-- Tonico — migració 105 · les setmanes econòmiques, reestampades amb l'àncora bona.
--
-- La identitat d'una setmana econòmica és (temporada, setmana), DERIVADA de la seua data. En
-- moure l'àncora de dissabte a diumenge (migració 104), eixa derivació canvia: la mateixa data
-- real cau en una setmana distinta. Les files ja escrites es van quedar amb la numeració vella,
-- i redeclarar la mateixa setmana n'escrivia una de NOVA amb la numeració nova.
--
-- Reproduït amb dades inventades, declarant dues setmanes reals abans i després del canvi:
--
--   T83 s0 · data 2026-07-19 · taquilla 90.000     ← la vella
--   T83 s1 · data 2026-07-26 · taquilla 90.000     ← LA MATEIXA, amb la data d'una altra
--   T83 s2 · data 2026-07-26 · taquilla 0
--
-- Tres files per a dues setmanes, amb els 90.000 comptats dos voltes. I la del mig porta una
-- data que contradiu els seus diners: el `ON CONFLICT` actualitzava els imports però NO la
-- data, o siga que la clau i el dia es podien separar. D'ahí ix la mitjana inflada, i de la
-- mitjana ix `sou_sostenible`, i d'ell TOTS els nivells objectiu.
--
-- Ací es tornen a estampar totes les files des de la seua DATA amb l'àncora vigent, i la data
-- es normalitza al PRIMER DIA de la setmana —que és el que la columna sempre ha dit que era—
-- perquè dues declaracions de la mateixa setmana no puguen tornar a caure en dues files.
-- Si dues files acaben en la mateixa setmana, guanya la declarada més tard.
CREATE TABLE setmanes_economiques_nou (
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  temporada   INTEGER NOT NULL,
  setmana     INTEGER NOT NULL,
  taquilla    INTEGER,
  patrocini   INTEGER,
  data        TEXT NOT NULL,          -- PRIMER DIA de la setmana, derivat del calendari
  declarada   TEXT NOT NULL,
  PRIMARY KEY (usuari_id, temporada, setmana)
);

INSERT INTO setmanes_economiques_nou (usuari_id, temporada, setmana, taquilla, patrocini, data, declarada)
WITH anc(adata, atemp, anydies, tempset) AS (
  SELECT (SELECT valor FROM constants_joc WHERE clau='calendari_ancora_data'),
         CAST((SELECT valor FROM constants_joc WHERE clau='calendari_ancora_temporada') AS INTEGER),
         CAST((SELECT valor FROM constants_joc WHERE clau='any_dies') AS INTEGER),
         CAST((SELECT valor FROM constants_joc WHERE clau='temporada_setmanes') AS INTEGER)
),
cru AS (
  -- La mateixa aritmètica que `calcularSetmana`: offset positiu primer, i llavors la divisió
  -- és exacta. CAST trunca cap a zero i el codi fa FLOOR: amb dates anteriors a l'àncora les
  -- dues discrepen en una temporada sencera.
  SELECT c.*,
         (c.dia - (((c.dia % c.anydies) + c.anydies) % c.anydies)) / c.anydies AS temporades,
         (((c.dia % c.anydies) + c.anydies) % c.anydies) / 7 + 1                AS setm
    FROM (SELECT s.rowid AS rid, s.usuari_id, s.data, s.taquilla, s.patrocini, s.declarada,
                 a.adata, a.atemp, a.anydies, a.tempset,
                 CAST(ROUND(julianday(s.data) - julianday(a.adata)) AS INTEGER) AS dia
            FROM setmanes_economiques s, anc a) c
),
calc AS (
  SELECT rid, usuari_id, taquilla, patrocini, declarada,
         CASE WHEN setm >= tempset THEN atemp + temporades + 1 ELSE atemp + temporades END AS temp_nova,
         CASE WHEN setm >= tempset THEN 0 ELSE setm END                                    AS set_nova,
         date(adata, '+' || (temporades * anydies + (setm - 1) * 7) || ' day')              AS data_nova
    FROM cru
)
SELECT usuari_id, temp_nova, set_nova, taquilla, patrocini, data_nova, declarada
  FROM calc c
 WHERE c.rid = (SELECT c2.rid FROM calc c2
                 WHERE c2.usuari_id = c.usuari_id AND c2.temp_nova = c.temp_nova
                   AND c2.set_nova = c.set_nova
                 ORDER BY c2.declarada DESC, c2.rid DESC LIMIT 1);

DROP TABLE setmanes_economiques;
ALTER TABLE setmanes_economiques_nou RENAME TO setmanes_economiques;
CREATE INDEX ix_setmanes_eco_usuari ON setmanes_economiques(usuari_id, temporada DESC, setmana DESC);
