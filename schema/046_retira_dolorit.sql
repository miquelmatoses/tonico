-- Doctrina juvenil v3 bloc 2 · 5a — RETIRADA de «dolorit» sencer. Decisió de Miquel: la
-- font (CSV) no ho sap → Tonico no ho gestiona. S'esborra la taula de marques i els poms.
DROP TABLE IF EXISTS marca_dolorit;
DELETE FROM constants_joc WHERE clau='dolorit_caducitat_dies';
DELETE FROM plantilles_parametres WHERE clau='dolorit_descansa_aparador';
