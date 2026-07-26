-- L0 · RETIRADA DEL MODEL «FÀBRICA» (contracte v3)
-- El v3 retira l'estratègia fàbrica i tot el seu vocabulari. Ací cauen les FORNADES
-- (no són mecànica del joc), el SUPPORTER (no canvia cap decisió) i la regla de junta
-- per porter (el v3 lleva la clàusula de porter d'urgent(j)).
-- `edat_pic_venda` ES QUEDA: el v3 l'usa a horitzo_eixida(j).
-- ORDE: primer els fills (alertes → regles_parametres), després els pares (regles).

-- 1. Alertes emeses per regles retirades (alertes.regla_id → regles.id)
DELETE FROM alertes WHERE regla_id IN
  (SELECT id FROM regles WHERE codi IN ('ALR_FINESTRA_VENDA_FORNADA', 'ALR_SUPPORTER', 'ALR_JUNTA_PORTER'));

-- 2. Paràmetres i regles retirades
DELETE FROM regles_parametres WHERE regla_id IN
  (SELECT id FROM regles WHERE codi IN ('ALR_FINESTRA_VENDA_FORNADA', 'ALR_SUPPORTER', 'ALR_JUNTA_PORTER'));
DELETE FROM regles WHERE codi IN ('ALR_FINESTRA_VENDA_FORNADA', 'ALR_SUPPORTER', 'ALR_JUNTA_PORTER');

-- 3. Poms del model fàbrica que moren amb les fornades
DELETE FROM plantilles_parametres WHERE clau IN ('fornada_finestra_dies', 'valor_fornada_estimat');

-- 4. Fornades: subsistema sencer (fills primer)
DROP TABLE IF EXISTS fornades_jugadors;
DROP TABLE IF EXISTS fornades;
