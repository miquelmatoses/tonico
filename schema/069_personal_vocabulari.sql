-- V3 · VOCABULARI ÚNIC DEL PERSONAL (invariant 14) i identitat del membre.
-- Les dades deien `assistents` (plural, heretat de quan era un COMPTADOR) i l'entrenador
-- anava per `rol` amb `tipus` buit. El pla de personal, que busca per `tipus`, no trobava
-- mai cap declarat: proposava contractar el que ja hi havia.
-- Un sol nom per tipus, en SINGULAR, i el compte el porta el nombre de files.
UPDATE personal_membres SET tipus = 'assistent' WHERE tipus IN ('assistents', 'assistent');
UPDATE personal_membres SET tipus = 'entrenador' WHERE rol = 'entrenador' AND (tipus IS NULL OR tipus = '');
UPDATE personal_membres SET tipus = 'psicoleg'  WHERE tipus IN ('psicolegs', 'psicoleg');
UPDATE personal_membres SET tipus = 'metge'     WHERE tipus IN ('metges', 'metge');
