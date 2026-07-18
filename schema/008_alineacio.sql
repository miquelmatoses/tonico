-- Tonico — migració 008: configuració d'alineació (Fase 3), contingut de fàbrica.
-- Formació 3-5-2 amb marca d'entrenament per posició; el motor és universal.
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'partits', '["lliga","amistos"]', 'json'),
  ('fabrica', 'buckets_alineacio',
   '{"porter":["PO"],"defensa":["DC"],"mc":["MC"],"extrem":["ED","EE"],"davanter":["DV"]}', 'json'),
  ('fabrica', 'formacio',
   '[{"codi":"POR","bucket":"porter","entrena":false},
      {"codi":"DC1","bucket":"defensa","entrena":false},
      {"codi":"DC2","bucket":"defensa","entrena":false},
      {"codi":"DC3","bucket":"defensa","entrena":false},
      {"codi":"MC1","bucket":"mc","entrena":true,"pct":100},
      {"codi":"MC2","bucket":"mc","entrena":true,"pct":100},
      {"codi":"MC3","bucket":"mc","entrena":true,"pct":100},
      {"codi":"EXT1","bucket":"extrem","entrena":true,"pct":50},
      {"codi":"EXT2","bucket":"extrem","entrena":true,"pct":50},
      {"codi":"DAV1","bucket":"davanter","entrena":false},
      {"codi":"DAV2","bucket":"davanter","entrena":false}]', 'json'),
  ('fabrica', 'suspensio_amonestacions', '3', 'int');   -- amonestacions que suposen sanció
