-- Tonico — MOTOR D'ENTRENAMENT SÈNIOR GENERAL. L'usuari tria l'entrenament i el sistema
-- deriva quines posicions entrenen i a quin %, la cobertura, les alineacions i els anells.
--
-- La `taula_entrenament` (ja existent) és el mapa 100% (habilitat → buckets d'efecte
-- màxim). Ací s'afig el mapa 50% (efecte baix, guia §6): «extrems entrenant creativitat
-- i defensors laterals entrenant extrem». Només eixos dos casos els diu la guia
-- explícitament; la resta d'habilitats no tenen bucket de baix efecte.
-- ponytail: la guia §6 nomena estos dos 50%; rates fines per posició (passades, etc.)
-- no s'hi detallen — s'afegiran si apareixen a la font.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('taula_entrenament_baix',
   '{"creativitat":["extrem"],"extrem":["defensa"]}',
   'text',
   'Buckets que entrenen al 50% (efecte baix, guia §6) per habilitat. El 100% viu a taula_entrenament.');
