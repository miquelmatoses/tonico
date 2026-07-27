-- Tonico — migració 091 · fora ALR_SENSE_CATEGORIA.
--
-- Era la xarxa de seguretat del classificador: un jugador que l'embut no col·locava en cap
-- categoria eixia assenyalat un per un. Amb l'assignació d'estructura això ja no pot passar
-- —onze ∪ entrenables ∪ futur entrenador ∪ porter suplent ∪ venda ∪ despatxar cobrix la
-- plantilla sencera per construcció— i l'únic cas que quedava era «no hi ha formació
-- configurada», que fa saltar la regla per a TOTS els jugadors alhora: la pitjor manera
-- possible de dir «et falta la formació». Això ja ho diu la pantalla de configuració.
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_SENSE_CATEGORIA');
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_SENSE_CATEGORIA');
DELETE FROM regles WHERE codi='ALR_SENSE_CATEGORIA';
