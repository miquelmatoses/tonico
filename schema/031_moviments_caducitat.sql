-- Tonico — migració 031 (polit #6.4): els moviments executats caduquen a l'historial
-- després de N dies o de la pujada següent. La vista mostra només els recents; el
-- Desfés segueix disponible des de l'historial mentres siga reversible.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'moviment_caducitat_dies', '7', 'int');
