-- L2 · CONFIG DEL v3 + USER-AGNOSTIC (contracte v3, V i PAS 0)
-- La config és l'ÚNICA entrada d'usuari inicial: { estrategia, pais, divisio,
-- sistema_juvenil, partits_setmana }. Caixa, ingressos, despeses, personal i estadi es
-- demanen a l'informe després de la primera pujada, mai a l'entrada.
--
-- USER-AGNOSTIC: la clau de plantilla deixa de ser 'fabrica' (un model retirat) i passa a
-- ser l'ESTRATÈGIA. Tot usuari nou passa pel mateix onboarding i obté el mateix
-- comportament amb les SEUES dades.

CREATE TABLE IF NOT EXISTS config_usuari (
  usuari_id       INTEGER PRIMARY KEY REFERENCES usuaris(id),
  estrategia      TEXT NOT NULL DEFAULT 'competitiva'
                    CHECK (estrategia IN ('competitiva', 'cycle')),
  pais            TEXT,                    -- NULL → Paco el demana a l'informe
  divisio         TEXT,                    -- NULL → Paco el demana a l'informe
  sistema_juvenil TEXT NOT NULL DEFAULT 'cap'
                    CHECK (sistema_juvenil IN ('academia', 'cercapromeses', 'cap')),
  partits_setmana INTEGER                  -- NULL → Paco el demana a l'informe
                    CHECK (partits_setmana IS NULL OR partits_setmana IN (1, 2))
);

-- MIGRACIÓ DEL COMPTE EXISTENT: passa a 'competitiva' amb la divisió i el sistema juvenil
-- JA DECLARATS. El que falta (país, partits_setmana) es queda NULL: es demana a l'informe,
-- no es dóna per suposat. Cap dada seua es perd: instantànies, vendes, transaccions i
-- preus observats no es toquen.
INSERT OR IGNORE INTO config_usuari (usuari_id, estrategia, pais, divisio, sistema_juvenil, partits_setmana)
SELECT u.id,
       'competitiva',
       NULL,
       (SELECT json_extract(p.parametres, '$.divisio_actual') FROM plans p WHERE p.usuari_id = u.id),
       CASE WHEN EXISTS (SELECT 1 FROM equips e WHERE e.usuari_id = u.id AND e.tipus = 'juvenil')
            THEN 'academia' ELSE 'cap' END,
       NULL
  FROM usuaris u;

-- La clau de configuració passa de 'fabrica' (model retirat) a l'estratègia.
-- (En una BD nova els seeds ja diuen 'competitiva': estes línies són no-op.)
UPDATE plantilles_parametres SET plantilla = 'competitiva' WHERE plantilla = 'fabrica';
UPDATE plantilles_categories SET plantilla = 'competitiva' WHERE plantilla = 'fabrica';
UPDATE fases_config          SET plantilla = 'competitiva' WHERE plantilla = 'fabrica';

-- Poms del model retirat que ja no manen res (la divisió viu ara a config_usuari;
-- l'entrenament és prescripció; el Supporter i la inflexió han desaparegut).
UPDATE plans SET parametres = json_remove(
  COALESCE(parametres, '{}'),
  '$.supporter_caducitat', '$.temporada_inflexio', '$.entrenament_senior', '$.divisio_actual'
) WHERE parametres IS NOT NULL;

-- Vocabulari v3 (invariant 14): el destí d'un juvenil útil és PROMOCIONAR (proveïdor de
-- rotatius); «fàbrica» ja no és vocabulari legal.
UPDATE fases_config SET config = json_set(json_remove(config, '$.entrenament.fabrica_min'),
       '$.entrenament.util_min', json_extract(config, '$.entrenament.fabrica_min'))
 WHERE json_extract(config, '$.entrenament.fabrica_min') IS NOT NULL;

-- El PLA MESTRE per temporades era del model fàbrica: files amb les temporades CONCRETES
-- d'un equip (T83…T91). El v3 no té pla per temporada —l'estratègia mana— i el
-- user-agnostic exigix que cap seed porte dades d'un equip. La divisió, que era l'única
-- cosa viva d'eixes files, ja viu a config_usuari.
DROP TABLE IF EXISTS plans_temporades;

-- plans.plantilla passa a ser l'ESTRATÈGIA del v3. El CHECK vell no l'admetia, i SQLite
-- no permet alterar-lo: cal refer la taula (ja sense fills que hi apunten).
CREATE TABLE plans_nou (
  id          INTEGER PRIMARY KEY,
  usuari_id   INTEGER NOT NULL REFERENCES usuaris(id),
  plantilla   TEXT NOT NULL CHECK (plantilla IN ('competitiva','cycle')),
  fase_actual TEXT,
  parametres  TEXT
);
INSERT INTO plans_nou (id, usuari_id, plantilla, fase_actual, parametres)
  SELECT id, usuari_id, 'competitiva', 'competitiva', parametres FROM plans;
DROP TABLE plans;
ALTER TABLE plans_nou RENAME TO plans;
CREATE INDEX IF NOT EXISTS ix_plans_usuari ON plans(usuari_id);
