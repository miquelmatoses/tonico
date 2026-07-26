-- Tonico — migració 080 · fora l'alerta d'entrenament juvenil.
--
-- ALR_ENTRENAMENT_JUVENIL comparava l'entrenament juvenil DECLARAT amb el pipeline sènior. Però
-- l'entrenament juvenil no es declara: es PRESCRIU (ix del pipeline mateix), i la pantalla ara
-- diu «posa entrenament A: creativitat» i prou. Comparar la prescripció amb ella mateixa no pot
-- donar res mai: la regla no es podia disparar ni podent voler.
-- Les alertes ja emeses van primer: `regla_id` és la clau i s'ha de resoldre abans d'esborrar
-- la regla, si no queden files òrfenes parlant d'una comparació que ja no existix.
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_ENTRENAMENT_JUVENIL');
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_ENTRENAMENT_JUVENIL');
DELETE FROM regles WHERE codi = 'ALR_ENTRENAMENT_JUVENIL';
