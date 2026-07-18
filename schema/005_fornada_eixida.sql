-- Tonico — migració 005: paràmetre de l'horitzó d'eixida de fornades.
-- Edat de pic de venda (fàbrica): a partir d'ací el jugador es considera producte
-- a liquidar; l'horitzó d'eixida es deriva d'esta edat. Pom de calibratge.
INSERT OR IGNORE INTO plantilles_parametres (plantilla, clau, valor, tipus)
VALUES ('fabrica', 'edat_pic_venda', '20', 'int');
