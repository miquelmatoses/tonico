-- Tonico — migració 007: calendari de mercat (Fase 6.1, compartit amb 0.2) i
-- registre de revisions del parte (correcció 0.1).

-- Calendari de mercat: fase i modificador de valor per setmana de temporada.
-- Global i calibrable (poms en files). Modificador = ajust estimat del valor de venda.
CREATE TABLE calendari_mercat (
  setmana_temporada  INTEGER PRIMARY KEY,
  fase               TEXT NOT NULL,          -- 'recuperacio' | 'demanda_plena' | 'depressio_final'
  modificador_valor  REAL NOT NULL,          -- p.ex. +0.10, 0, -0.15
  nota               TEXT
);
INSERT INTO calendari_mercat (setmana_temporada, fase, modificador_valor) VALUES
  (1,'recuperacio',0.10),(2,'recuperacio',0.10),(3,'recuperacio',0.05),
  (4,'demanda_plena',0.0),(5,'demanda_plena',0.0),(6,'demanda_plena',0.0),(7,'demanda_plena',0.0),
  (8,'demanda_plena',0.0),(9,'demanda_plena',0.0),(10,'demanda_plena',0.0),(11,'demanda_plena',-0.05),
  (12,'depressio_final',-0.10),(13,'depressio_final',-0.12),(14,'depressio_final',-0.15),
  (15,'depressio_final',-0.15),(16,'depressio_final',-0.15);

-- Revisió del parte: contra quina instantània i amb quina config s'han generat
-- les alertes (per no dir «tot en orde» sense haver passat revista).
CREATE TABLE revisions_alertes (
  usuari_id      INTEGER PRIMARY KEY REFERENCES usuaris(id),
  instantania_id INTEGER,
  config_hash    TEXT,
  data           TEXT NOT NULL DEFAULT (date('now'))
);

-- Poms de mercat per a la plantilla fàbrica
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'mercat_espera_max', '4', 'int'),        -- setmanes màx que val la pena esperar el mercat
  ('fabrica', 'aniversari_perdua_pct', '8', 'int');    -- pèrdua estimada de valor per aniversari (%)

-- Ajust de la regla d'aniversari: també per a entrenables (FET), no sols venda.
UPDATE regles_parametres SET valor = 'venda,entrenable'
 WHERE regla_id = (SELECT id FROM regles WHERE codi = 'ALR_ANIVERSARI') AND clau = 'categories';
