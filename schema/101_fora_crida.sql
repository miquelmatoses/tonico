-- Tonico — migració 101 · fora la maquinària de la crida al cercapromeses.
--
-- Qui es crida i si l'oferta val la pena són decisions que Miquel pren amb criteri propi,
-- fora del sistema: Tonico no veu la proposta i no la pot jutjar. Amb això se'n van
-- l'avaluador d'ofertes, el rellotge de la finestra i l'alerta que en penjava.
--
-- I `formacio_juvenil` també: era una DECISIÓ CONGELADA com a configuració. Declarava un sol
-- davanter quan el joc en permet tres, i deixava l'alineador sense poder proposar el
-- repartiment bo. La capacitat de veres són els màxims per posició del joc.
DELETE FROM regles_parametres WHERE regla_id IN (SELECT id FROM regles WHERE codi='ALR_CRIDA_DISPONIBLE');
DELETE FROM alertes WHERE regla_id IN (SELECT id FROM regles WHERE codi='ALR_CRIDA_DISPONIBLE');
DELETE FROM regles WHERE codi='ALR_CRIDA_DISPONIBLE';
DROP TABLE IF EXISTS crides;
DELETE FROM constants_joc WHERE clau IN ('crida_reinici_dia', 'crida_reinici_hora');
DELETE FROM plantilles_parametres WHERE clau IN ('crida_llindars', 'formacio_juvenil');
