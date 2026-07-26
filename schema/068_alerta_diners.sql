-- Diagnòstic D2 · LES UNITATS LES DECLARA L'AVALUADOR (invariant 12)
-- La vista tenia una llista de NOMS de paràmetre que formatava com a import
-- ('pressupost','objectiu','falta','sou'…). Un «objectiu» de 8 JUGADORS eixia formatat com
-- si fóra diners. Ara cada alerta declara quines claus són imports i la vista només formata.
ALTER TABLE alertes ADD COLUMN diners TEXT;   -- JSON: claus de `parametres` que són imports
