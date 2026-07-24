-- Derivació de l'estat LLISTAT de la columna Transferible del CSV. Quan un llistat deixa
-- de ser transferible sense venda apuntada, cal preguntar el resultat (deserta o venut?).
ALTER TABLE vendes ADD COLUMN resultat_pendent INTEGER NOT NULL DEFAULT 0;
