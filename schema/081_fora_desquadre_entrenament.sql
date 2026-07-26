-- Tonico — migració 081 · fora l'alerta de desquadre d'entrenament.
--
-- ALR_ENTRENAMENT_DESQUADRE comparava l'entrenament CONFIRMAT a Hattrick amb el prescrit. La
-- finestra per a confirmar-lo era el panell d'entrenament de Personal, que se n'ha anat: oferir
-- un panell per a declarar l'entrenament era oferir una decisió que no existix, perquè
-- l'entrenament es prescriu. Sense el costat esquerre, la comparació no pot donar res.
--
-- És el mateix cas que ALR_ENTRENAMENT_JUVENIL (migració 080). Si algun dia la secció
-- d'Entrenament té una finestra de confirmació de veres, es tornarà a donar d'alta ací.
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_ENTRENAMENT_DESQUADRE');
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_ENTRENAMENT_DESQUADRE');
DELETE FROM regles WHERE codi = 'ALR_ENTRENAMENT_DESQUADRE';
