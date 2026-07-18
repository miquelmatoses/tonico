-- Tonico — Fase 1, migració 003: classificador automàtic.
-- S'aplica SOBRE l'esquema ja desplegat (001/002). SQLite: ADD COLUMN d'un en un.
--
-- Model:
--  · La CONFIGURACIÓ (quines categories són funció, aforaments, fórmules i
--    els seus pesos, llindars) viu per PLANTILLA de pla (global, reusable),
--    no per usuari. Un usuari només diu quina plantilla segueix.
--  · La LÒGICA de cada fórmula és un mòdul de codi; els seus PARÀMETRES
--    (pesos, llindars) es lligen d'ací (principi «res hardcoded»).
--  · categories_jugador continua sent HISTÒRIC (s'apila): la categoria vigent
--    és l'última fila. Ara cada fila diu qui la va posar i per què.

-- ── categories_jugador: qui i per què ──
ALTER TABLE categories_jugador ADD COLUMN origen TEXT NOT NULL DEFAULT 'auto';  -- 'auto' | 'manual'
ALTER TABLE categories_jugador ADD COLUMN puntuacio REAL;      -- puntuació que la sustentava (a l'assignació)
ALTER TABLE categories_jugador ADD COLUMN justificacio TEXT;   -- clau i18n / codi de regla que la justifica

-- Fornades: rastre de com s'ha assignat (manual des de pantalla / auto per cohort).
-- Doctrina: només els entrenables tenen fornada.
ALTER TABLE fornades_jugadors ADD COLUMN origen TEXT NOT NULL DEFAULT 'auto';

-- ── Configuració de categories per PLANTILLA de pla ──
-- TOTA la política d'una categoria és CONTINGUT (files), mai codi. El motor és
-- universal: afegir una estratègia nova = INSERIR files ací, zero JS nou.
-- `parametres` (JSON) declara requisits, puntuació (combinació lineal) i places:
--   {"requisits":[{"camp":"creativitat","op":">=","valor":2}],
--    "puntuacio":{"termes":[{"camp":"creativitat","pes":1},
--                           {"camp":"edat_anys","pes":0.5,"desde":20}],"constant":0},
--    "llindar_minim":6,
--    "places":{"mc":6,"extrem":2}}
CREATE TABLE plantilles_categories (
  plantilla   TEXT NOT NULL,               -- 'fabrica','cicle','hibrid_esglaonat','manteniment'
  categoria   TEXT NOT NULL,               -- entrenable, futur_entrenador, experiencia, farciment, venda, alliberament...
  es_funcio   INTEGER NOT NULL DEFAULT 0,  -- 1 = compta com a «funció» (etapa 1 de l'embut)
  aforament   INTEGER,                     -- places totals; NULL = sense límit (o usa parametres.places)
  parametres  TEXT,                        -- JSON declaratiu: requisits, puntuació lineal, places
  ordre       INTEGER NOT NULL DEFAULT 0,  -- prioritat d'avaluació de l'embut
  PRIMARY KEY (plantilla, categoria)
);

-- ── Paràmetres escalars per plantilla (llindar d'intercanvi, regla de valor de mercat...) ──
CREATE TABLE plantilles_parametres (
  plantilla TEXT NOT NULL,
  clau      TEXT NOT NULL,
  valor     TEXT NOT NULL,
  tipus     TEXT NOT NULL DEFAULT 'int' CHECK (tipus IN ('int','float','text','bool','json')),
  PRIMARY KEY (plantilla, clau)
);

-- ── Intercanvis de plaça proposats (la «regla d'or»: desclassificar demana vistiplau) ──
-- Quan un candidat supera un titular de plaça per damunt del llindar, NO s'executa:
-- es desa ací com a decisió pendent. Un rebuig recorda la diferència d'eixe moment
-- (fre anti-soroll: no es replanteja fins que la diferència creix substancialment).
CREATE TABLE intercanvis (
  id                     INTEGER PRIMARY KEY,
  usuari_id              INTEGER NOT NULL REFERENCES usuaris(id),
  categoria              TEXT NOT NULL,          -- plaça en disputa
  entrant_id             INTEGER REFERENCES jugadors(id),   -- NULL = desclassificació en solitari (titular sense rival)
  eixent_id              INTEGER NOT NULL REFERENCES jugadors(id),
  puntuacio_entrant      REAL,
  puntuacio_eixent       REAL NOT NULL,
  diferencia             REAL,
  desti_eixent           TEXT,                   -- on cauria l'eixent si s'accepta (venda/alliberament/farciment)
  estat                  TEXT NOT NULL DEFAULT 'pendent'
                           CHECK (estat IN ('pendent','acceptat','rebutjat')),
  diferencia_al_rebutjar REAL,                   -- memòria del fre anti-soroll
  data                   TEXT NOT NULL DEFAULT (date('now'))
);
CREATE INDEX ix_intercanvis_usuari ON intercanvis(usuari_id, estat);
