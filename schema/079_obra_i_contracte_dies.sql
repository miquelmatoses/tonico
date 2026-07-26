-- Tonico — migració 079 · l'obra que ja s'està fent, i el contracte comptat en DIES.
--
-- ─── 1. L'OBRA EN CONSTRUCCIÓ ──────────────────────────────────────────────────────────
-- El bucle d'estoc proposava l'obra d'estadi cada setmana, també quan ja s'estava fent: no
-- tenia manera de saber-ho. Una obra començada no és una decisió pendent, és un fet, i mentre
-- dura no competix amb res. Fa falta finestra per a declarar-la (invariant 17).
ALTER TABLE finances ADD COLUMN estadi_obra_inici TEXT;   -- data d'inici; NULL = cap obra

-- ─── 2. EL CONTRACTE ES MIRA EN DIES ──────────────────────────────────────────────────
-- El full deia «0 ≤ setmanes_restants ≤ `dies_avis_caducitat`»: comparava SETMANES amb un pom
-- de DIES, i el pom no existia ni tan sols — el codi queia al defecte 2. Amb la unitat mal
-- posada, un contracte a 13 dies del venciment (dues setmanes) ja donava avís i un a 20 no,
-- sense que la frontera volguera dir res. Ara la unitat és la mateixa als dos costats: DIES.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'dies_avis_contracte', '15', 'int');
UPDATE regles_parametres SET clau = 'dies_avis', valor = '15'
 WHERE clau = 'setmanes_avis' AND regla_id = (SELECT id FROM regles WHERE codi='ALR_CONTRACTE_PERSONAL');

-- ─── 3. L'EDAT DE COMPRA TÉ DOS EXTREMS ───────────────────────────────────────────────
-- El filtre només duia el màxim, i el cercador de HT demana un rang. 17 és l'edat mínima amb
-- què un jugador entra al mercat: el mínim és «tan jove com el joc permet».
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'compra_edat_min', '17', 'int');
