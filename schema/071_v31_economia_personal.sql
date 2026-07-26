-- Tonico — migració 071 · CONTRACTE v3.1 (correccions sobre dades reals de HT).
-- Diagnòstic complet a docs/FORATS.md; el full manda (docs/FORMULES.md v3.1).
--
-- 1. L'economia és BI-SETMANAL (en lliga: un partit a casa i un fora).
-- 2. La reserva és una FRACCIÓ dels ingressos, no un import absolut.
-- 3. El planter es DERIVA de sistema_juvenil + n_cercapromeses.
-- 4. L'entrenador NO cobra com la resta de personal: dues bases, no una.
-- 5. L'estadi té PRIORITAT ABSOLUTA i els seus números caduquen.

-- ─── PAS 3: període, reserva com a fracció, costos del planter ───────────────────────
-- `reserva_flux` (import absolut) queda SUBSTITUÏDA per `reserva_flux_pct`: les despeses
-- recurrents no poden passar del 95% dels ingressos recurrents. És política de risc
-- declarada per Miquel, no mecànica de joc.
DELETE FROM plantilles_parametres WHERE clau = 'reserva_flux';
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'setmanes_periode',            '2',    'int'),
  ('competitiva', 'reserva_flux_pct',            '0.05', 'float'),
  ('competitiva', 'cost_instalacions_juvenils',  '5000', 'int'),
  ('competitiva', 'cost_cercapromeses',          '5000', 'int'),
  ('competitiva', 'setmanes_caducitat_estadi',   '10',   'int'),
  ('competitiva', 'setmanes_avis_dades',         '1',    'int');

-- Pom mort: `reserva_operativa` era del subsistema de projecció que va caure a L3. Cap
-- fitxer de lib/ la llig; se'n va perquè un pom sense lector és una trampa.
DELETE FROM plantilles_parametres WHERE clau = 'reserva_operativa';

-- ─── PAS 11: DUES BASES DE PERSONAL ──────────────────────────────────────────────────
-- L'informe real de HT: 3 especialistes de nivell 2 (3 × 2.040) + entrenador de nivell 3
-- (5.000) = 11.120 €. Amb una sola base de 1.020 els 5.000 € són IMPOSSIBLES: tota suma
-- de nivells és múltiple de 1.020, i 5.000 no ho és. La base viu dins de la prioritat,
-- que ja és el que dirigix el bucle → dades, no codi (invariant 8).
UPDATE plantilles_parametres
   SET valor = '[{"tipus":"assistent","quants":2},{"tipus":"entrenador","base":1250},'
            || '{"tipus":"metge"},{"tipus":"psicoleg"}]'
 WHERE plantilla = 'competitiva' AND clau = 'prioritat_personal';

-- ─── PAS 0: n_cercapromeses (el cercapromeses SEMPRE hi és; el mode no diu quants) ────
ALTER TABLE config_usuari ADD COLUMN n_cercapromeses INTEGER NOT NULL DEFAULT 1
  CHECK (n_cercapromeses BETWEEN 1 AND 3);

-- BACKFILL: el defecte d'1 canviaria el planter d'algú que ja en té 3 SENSE DIR-HO (de 20.000
-- a 10.000 €/setmana). No s'inventa el valor: s'INVERTIX de `despesa_planter` ja declarat, que
-- és la fórmula del PAS 3 llegida al revés. Els costos ixen dels poms, no de literals.
UPDATE config_usuari
   SET n_cercapromeses = MIN(3, MAX(1,
         ( (SELECT f.despesa_planter FROM finances f WHERE f.usuari_id = config_usuari.usuari_id)
           - (CASE WHEN sistema_juvenil = 'academia'
                THEN (SELECT CAST(valor AS INTEGER) FROM plantilles_parametres
                       WHERE plantilla = config_usuari.estrategia AND clau = 'cost_instalacions_juvenils')
                ELSE 0 END)
         ) / (SELECT CAST(valor AS INTEGER) FROM plantilles_parametres
               WHERE plantilla = config_usuari.estrategia AND clau = 'cost_cercapromeses') ))
 WHERE EXISTS (SELECT 1 FROM finances f
                WHERE f.usuari_id = config_usuari.usuari_id AND f.despesa_planter IS NOT NULL);

-- ─── PAS 3: període declarat i ingressos bi-setmanals ────────────────────────────────
-- Sense saber DE QUIN PERÍODE és la declaració no es pot dir que és vella (invariant 18),
-- i la «setmana actual» de l'informe no es declara mai: no està consolidada (invariant 16).
ALTER TABLE finances ADD COLUMN periode_data TEXT;   -- data del període TANCAT declarat

-- `premis`, `ingres_setmanal` i `despesa_planter` deixen de LLEGIR-SE (premis és estoc; el
-- planter es deriva; el total setmanal ja té finestres pròpies). Les columnes es queden AMB EL
-- SEU VALOR: són dades declarades per l'usuari i no es toquen.
--
-- I NO es passa `ingres_setmanal` a `taquilla`. Semblava el traspàs obvi i és corrupció
-- silenciosa: el valor declarat és el total de la setmana EN CURS (patrocini inclòs) i la
-- setmana en curs té la taquilla a 0, perquè el partit era fora. Escriure'l a `taquilla`
-- diria que la taquilla del període val 41.450 € quan valia 0. Taquilla i patrocini es queden
-- NULL i Paco els demana del període TANCAT, que és l'única cosa honesta que es pot fer.

-- ─── PAS 12: dues alertes noves ──────────────────────────────────────────────────────
-- Dada vella ≠ absent ≠ zero (invariant 18): si fa més d'un període que no es declara,
-- el sistema HO DIU en compte de seguir raonant en silenci sobre xifres velles.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_DADES_VELLES', 'economia', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_DADES_VELLES'), 'urgencia', '68', 'int');

-- Els números de la calculadora d'estadi caduquen a `setmanes_caducitat_estadi`.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_ESTADI_CADUC', 'economia', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_ESTADI_CADUC'), 'urgencia', '55', 'int');

-- ─── PAS 7: fora l'estimació de preu de venda ────────────────────────────────────────
-- No canviava cap decisió: l'orde de venda el porta `sobrecost` i «es ven o s'acomiada»
-- el decidix la subhasta. Amb ella cauen `valor_net` i `valor_net_promo` (PAS 10).
DELETE FROM plantilles_parametres WHERE clau IN
  ('base_preu_divisio', 'min_mostres', 'llindar_despatx', 'nivell_referencia_preu',
   'bonus_club_mare', 'cost_promocio');
