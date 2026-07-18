-- Tonico — el planter de Puchades
-- Esquema D1 (SQLite). Fase 0, Bloc B.
--
-- Principis aplicats:
--  · usuari_id a tota taula amb dades d'usuari (multiusuari en l'esquema).
--  · Edat SEMPRE en dos camps (anys + dies), mai decimal.
--  · Els jugadors NO s'esborren mai: una baixa marca estat/data, no DELETE.
--  · Cap número de política ací: llindars i constants viuen a
--    regles_parametres / constants_joc / configuracio_app (dades, no codi).
--
-- Nomenclatura en valencià. PRAGMA foreign_keys s'activa per connexió a D1.

-- ───────────────────────── NUCLI ─────────────────────────

CREATE TABLE usuaris (
  id                INTEGER PRIMARY KEY,
  correu            TEXT NOT NULL UNIQUE,
  contrasenya       TEXT NOT NULL,        -- hash, mai en clar
  idioma            TEXT NOT NULL DEFAULT 'ca-valencia',
  correu_verificat  INTEGER NOT NULL DEFAULT 0,   -- estructura preparada, inactiva
  data_verificacio  TEXT,
  data_alta         TEXT NOT NULL DEFAULT (date('now'))
);

-- Verificació de correu: PREPARADA, no activa (interruptor a configuracio_app:
-- registre_verificacio_activa). L'enviament real de correus és una decisió
-- oberta (proveïdor extern, p.ex. Resend); ara enviarCorreuVerificacio és stub.
CREATE TABLE tokens_verificacio (
  id          INTEGER PRIMARY KEY,
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  token_hash  TEXT NOT NULL,             -- SHA-256 del token, mai el token en clar
  caducitat   TEXT NOT NULL,
  usat        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_tokens_usuari ON tokens_verificacio(usuari_id);

CREATE TABLE equips (
  id            INTEGER PRIMARY KEY,
  usuari_id     INTEGER NOT NULL REFERENCES usuaris(id),
  nom           TEXT NOT NULL,
  tipus         TEXT NOT NULL CHECK (tipus IN ('senior','juvenil')),
  id_hattrick   INTEGER,
  UNIQUE (usuari_id, tipus)               -- un sènior i un juvenil per usuari
);
CREATE INDEX ix_equips_usuari ON equips(usuari_id);

-- Un jugador viu per sempre: venut o alliberat, la fila es queda (historial
-- de la fàbrica i base de l'anàlisi econòmica). La baixa és estat + data.
CREATE TABLE jugadors (
  id               INTEGER PRIMARY KEY,
  equip_id         INTEGER NOT NULL REFERENCES equips(id),
  id_hattrick      INTEGER NOT NULL,
  nom              TEXT NOT NULL,
  nacionalitat     TEXT,
  especialitat     TEXT,                  -- 'Ràpid','Potent','Joc aeri',... o NULL
  data_alta_club   TEXT,                  -- primera vegada que el veiem
  estat            TEXT NOT NULL DEFAULT 'actiu'
                     CHECK (estat IN ('actiu','pendent_de_motiu','baixa')),
  data_baixa_club  TEXT,                  -- data de la instantània on ja no hi és
  motiu_baixa      TEXT                   -- NULL fins que l'usuari el declara (Fase 1)
                     CHECK (motiu_baixa IN ('venda','alliberament','promocio') OR motiu_baixa IS NULL),
  -- Un juvenil promocionat rep un id_hattrick sènior NOU (Hattrick no els
  -- vincula). Este camp lliga el sènior amb la seua fila juvenil d'origen.
  -- L'ompli el formulari de motius de Fase 1 en declarar una promoció; la
  -- 'Bonificació per club d'origen' del CSV serveix per suggerir el vincle.
  jugador_origen_juvenil_id INTEGER REFERENCES jugadors(id),
  UNIQUE (equip_id, id_hattrick)
);
CREATE INDEX ix_jugadors_equip ON jugadors(equip_id);

-- ─────────────────────── INSTANTÀNIES ───────────────────────

CREATE TABLE instantanies (
  id                INTEGER PRIMARY KEY,
  equip_id          INTEGER NOT NULL REFERENCES equips(id),
  data              TEXT NOT NULL,        -- data de la pujada / exportació
  font              TEXT NOT NULL DEFAULT 'csv' CHECK (font IN ('csv','chpp','manual')),
  temporada         INTEGER,              -- calculat des de l'àncora del calendari
  setmana_temporada INTEGER,             -- 1..16
  UNIQUE (equip_id, data, font)
);
CREATE INDEX ix_instantanies_equip ON instantanies(equip_id, data);

-- Sènior: una fila per jugador i instantània. Edat en anys + dies.
CREATE TABLE instantanies_jugadors (
  instantania_id        INTEGER NOT NULL REFERENCES instantanies(id),
  jugador_id            INTEGER NOT NULL REFERENCES jugadors(id),
  edat_anys             INTEGER,
  edat_dies             INTEGER,
  tsi                   INTEGER,
  sou                   INTEGER,
  setmanes_club         INTEGER,
  forma                 INTEGER,
  resistencia           INTEGER,
  experiencia           INTEGER,
  lideratge             INTEGER,
  lleialtat             INTEGER,          -- 'Fidelitat' al CSV
  bonificacio_origen    INTEGER,          -- 'Bonificació per club d'origen' (0/1)
  transferible          INTEGER,          -- 'Transferible' (0/1)
  -- habilitats
  porteria              INTEGER,
  defensa               INTEGER,
  creativitat           INTEGER,
  extrem                INTEGER,
  passades              INTEGER,
  anotacio              INTEGER,
  pilota_aturada        INTEGER,
  -- estat físic/disciplinari
  lesio                 TEXT,             -- text del CSV (buit = sa)
  amonestacions         INTEGER,
  -- últim partit
  posicio_ultim_partit  TEXT,            -- 'PO','DV','DC','ED','EE','MC',...
  qualificacio_ultim_partit REAL,        -- p. ex. 3.5 (única excepció decimal: és una nota)
  data_ultim_partit     TEXT,
  categoria_hattrick    TEXT,            -- columna 'Categoria' del CSV (etiqueta del joc)
  PRIMARY KEY (instantania_id, jugador_id)
);

-- Juvenil: ídem base + habilitats en parells actual/potencial.
-- Els valors es guarden com a TEXT per preservar TRES estats distints:
--   número ('4')  → valor conegut
--   'desconegut'  → revelat però sense valor ('?' al CSV): és informació
--   NULL          → no revelat encara (cel·la buida al CSV): absència de dada
CREATE TABLE instantanies_juvenils (
  instantania_id          INTEGER NOT NULL REFERENCES instantanies(id),
  jugador_id              INTEGER NOT NULL REFERENCES jugadors(id),
  edat_anys               INTEGER,
  edat_dies               INTEGER,
  dies_restants_promocio  INTEGER,       -- 'Dies restants per poder ser promocionat'
  edat_promocio           INTEGER,       -- 'Edat a la promoció'
  dies_al_promocionar     INTEGER,       -- 'Dies al moment de promocionar'
  porteria_actual         TEXT, porteria_potencial       TEXT,
  defensa_actual          TEXT, defensa_potencial        TEXT,
  creativitat_actual      TEXT, creativitat_potencial    TEXT,
  extrem_actual           TEXT, extrem_potencial         TEXT,
  passades_actual         TEXT, passades_potencial       TEXT,
  anotacio_actual         TEXT, anotacio_potencial       TEXT,
  pilota_aturada_actual   TEXT, pilota_aturada_potencial TEXT,
  lesio                   TEXT,
  amonestacions           INTEGER,
  posicio_ultim_partit    TEXT,
  qualificacio_ultim_partit REAL,
  data_ultim_partit       TEXT,
  PRIMARY KEY (instantania_id, jugador_id)
);

-- ───────────── DECISIONS I DOCTRINA (s'editen amb formularis) ─────────────

CREATE TABLE categories_jugador (
  id               INTEGER PRIMARY KEY,
  jugador_id       INTEGER NOT NULL REFERENCES jugadors(id),
  categoria        TEXT NOT NULL CHECK (categoria IN
                     ('entrenable','venda','alliberament','farciment',
                      'experiencia','futur_entrenador','nucli_competitiu')),
  data_assignacio  TEXT NOT NULL DEFAULT (date('now')),
  nota             TEXT
);
CREATE INDEX ix_categories_jugador ON categories_jugador(jugador_id);

CREATE TABLE fornades (
  id                      INTEGER PRIMARY KEY,
  usuari_id               INTEGER NOT NULL REFERENCES usuaris(id),
  lletra                  TEXT NOT NULL,      -- 'A','A1','A2','B',...
  temporada_entrada       INTEGER,
  temporada_eixida_prevista INTEGER,
  estat                   TEXT
);
CREATE INDEX ix_fornades_usuari ON fornades(usuari_id);

CREATE TABLE fornades_jugadors (
  fornada_id  INTEGER NOT NULL REFERENCES fornades(id),
  jugador_id  INTEGER NOT NULL REFERENCES jugadors(id),
  PRIMARY KEY (fornada_id, jugador_id)
);

CREATE TABLE transaccions (
  id          INTEGER PRIMARY KEY,
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  jugador_id  INTEGER REFERENCES jugadors(id),   -- opcional
  tipus       TEXT NOT NULL CHECK (tipus IN
                ('compra','venda','sou_setmanal','ingres_patrocini',
                 'taquilla','personal','estadi','altres')),
  import      INTEGER NOT NULL,                   -- enters (moneda del joc)
  data        TEXT NOT NULL,
  nota        TEXT
);
CREATE INDEX ix_transaccions_usuari ON transaccions(usuari_id, data);

CREATE TABLE plans (
  id          INTEGER PRIMARY KEY,
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  plantilla   TEXT NOT NULL CHECK (plantilla IN
                ('fabrica','cicle','hibrid_esglaonat','manteniment')),
  fase_actual TEXT,
  parametres  TEXT                                -- JSON
);
CREATE INDEX ix_plans_usuari ON plans(usuari_id);

CREATE TABLE plans_temporades (
  pla_id            INTEGER NOT NULL REFERENCES plans(id),
  temporada         INTEGER NOT NULL,
  divisio_prevista  TEXT,
  mode              TEXT,
  accions_previstes TEXT,                          -- JSON
  PRIMARY KEY (pla_id, temporada)
);

-- ───────────────────────── MOTOR DE REGLES ─────────────────────────

CREATE TABLE regles (
  id      INTEGER PRIMARY KEY,
  codi    TEXT NOT NULL UNIQUE,                    -- 'ALR_ANIVERSARI',...
  modul   TEXT,
  activa  INTEGER NOT NULL DEFAULT 1,
  ambit   TEXT NOT NULL DEFAULT 'global'
            CHECK (ambit IN ('global','plantilla_pla','usuari'))
);

CREATE TABLE regles_parametres (
  regla_id  INTEGER NOT NULL REFERENCES regles(id),
  clau      TEXT NOT NULL,
  valor     TEXT NOT NULL,
  tipus     TEXT NOT NULL DEFAULT 'int'            -- int|float|text|bool
              CHECK (tipus IN ('int','float','text','bool')),
  PRIMARY KEY (regla_id, clau)
);

CREATE TABLE alertes (
  id            INTEGER PRIMARY KEY,
  usuari_id     INTEGER NOT NULL REFERENCES usuaris(id),
  regla_id      INTEGER NOT NULL REFERENCES regles(id),
  jugador_id    INTEGER REFERENCES jugadors(id),   -- opcional
  data          TEXT NOT NULL DEFAULT (date('now')),
  missatge_clau TEXT NOT NULL,                      -- referència i18n
  parametres    TEXT,                               -- JSON per interpolar el missatge
  estat         TEXT NOT NULL DEFAULT 'nova'
                  CHECK (estat IN ('nova','vista','resolta','ignorada'))
);
CREATE INDEX ix_alertes_usuari ON alertes(usuari_id, estat);

-- Dades del joc (guia de Hattrick). clau→valor + tipus.
CREATE TABLE constants_joc (
  clau   TEXT PRIMARY KEY,
  valor  TEXT NOT NULL,
  tipus  TEXT NOT NULL DEFAULT 'int' CHECK (tipus IN ('int','float','text','bool')),
  nota   TEXT
);

-- Identitat i configuració parametritzada (res hardcoded, tampoc el personatge).
CREATE TABLE configuracio_app (
  clau   TEXT PRIMARY KEY,
  valor  TEXT NOT NULL,
  nota   TEXT
);
