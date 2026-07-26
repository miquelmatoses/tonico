-- Tonico — migració 072 · L'ECONOMIA SÓN QUATRE COSES I RES MÉS (ordre de Miquel, 26-07).
--
-- De l'informe de HT es declara NOMÉS això:
--   taquilla i patrocinadors  → de la SETMANA PASSADA i d'ESTA (les dos del període)
--   diners disponibles        → la caixa
--   manteniment de l'estadi   → constant fins a la remodelació
--
-- Tot lo altre fora. El v3.1 va llevar l'ESTIMACIÓ de preu però va deixar en peu tot el que
-- hi penjava: el formulari de moviments, la llista de transaccions i els camps de preu de la
-- fitxa de venda. Seguia preguntant per coses que ja no decidixen res.

-- ─── Les dues setmanes del període, literals ──────────────────────────────────────────
-- Abans hi havia `taquilla` (per període) + `patrocini` (setmanal, que es multiplicava per 2).
-- Declarar les DOS setmanes lleva la multiplicació d'enmig: el període és la suma de les dues,
-- i no hi ha cap factor 2 que es puga esmunyir (l'error que l'invariant 16 vigila).
ALTER TABLE finances ADD COLUMN taquilla_s1  INTEGER;   -- setmana passada
ALTER TABLE finances ADD COLUMN patrocini_s1 INTEGER;
ALTER TABLE finances ADD COLUMN taquilla_s2  INTEGER;   -- esta setmana
ALTER TABLE finances ADD COLUMN patrocini_s2 INTEGER;

-- `taquilla`, `patrocini` i `periode_data` deixen de llegir-se. Les columnes es queden amb el
-- seu valor (dades de l'usuari, no es toquen). La data de frescor la porta `caixa_data`, que ja
-- existia i ja s'omplia sola: un camp menys per a demanar.

-- ─── Fora la comptabilitat de moviments ───────────────────────────────────────────────
-- `transaccions` deixa de llegir-se i d'escriure's. Amb la caixa DECLARADA («diners
-- disponibles») i el flux eixint de taquilla+patrocini, apuntar moviment a moviment no
-- alimentava cap decisió: era comptabilitat per plaer. El diner d'una venda apareix a la caixa
-- del període següent, que és on Tonico el mira.
--   La TAULA es queda (té apunts fets per Miquel i esborrar-la seria destructiu), però ja no
--   hi ha ni formulari ni llista ni API.
--
-- I amb ella cau l'alerta que demanava l'import d'una venda: si l'import no entra a cap
-- fórmula, reclamar-lo és soroll. El que SÍ que importa del PAS 7 —«venut o deserta»— es
-- queda, perquè d'ahí ix si un sobrant s'acomiada.
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_TRANSACCIO_PENDENT');
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_TRANSACCIO_PENDENT');
DELETE FROM regles WHERE codi = 'ALR_TRANSACCIO_PENDENT';

-- ─── Fora els preus de la fitxa de venda ──────────────────────────────────────────────
-- `preu_eixida` i `preu_venut` deixen de llegir-se i d'escriure's: eren l'última porta per on
-- Tonico encara preguntava per un preu. La fitxa es queda amb l'estat i la data de llistat, que
-- són el que mou el rellotge de la subhasta. Les columnes no es toquen.
-- `un_euro` (override d'1 €) es queda com a ESTAT, sense import.
