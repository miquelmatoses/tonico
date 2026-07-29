-- Tonico — migració 111 · les dues capes, i totes dues sempre.
--
-- La 110 va mesurar el quocient entre les dues taules del wiki i jo el vaig prendre per «el pes
-- del sector». No ho és. Eixe quocient convertix HABILITAT → PUNTS DE QUALIFICACIÓ d'un sector.
-- No diu quant val guanyar eixe sector, i `pes_mig = 1,0` estava fent justament eixa segona
-- feina. Les tenia col·lapsades en un número, i per això el mig es veia set vegades inflat.
--
-- Amb la conversió sola, el LATERAL pesava més que el mig del camp (0,519 contra 0,442) —
-- mecànicament cert i contrari a la doctrina del full des del primer dia: el mig decidix qui té
-- l'ocasió, no on.
--
-- ─── DUES CAPES, I LES DUES A TOTS ELS PROCESSOS ──────────────────────────────────────
--   valor(jugador, lloc) = SUMA(columnes: aportació × conversió(sector) × importància(sector)
--                                        × habilitat(jugador))
--
-- La mateixa fórmula per a triar qui ocupa el lloc, per a repartir el pressupost i per a la
-- vara. Aplicar una capa a un procés i l'altra a un altre seria tornar a tindre dues nocions de
-- «què val un lloc» convivint, que és l'error que hem estat matant tot el projecte.
--
--   · CONVERSIÓ (`pesos_sector`, migració 110): MESURADA, 28 cel·les del wiki.
--   · IMPORTÀNCIA (`importancia_sector`): la distribució d'ocasions de la guia §5. NO es pot
--     mesurar de les taules, perquè les dues estan en punts de qualificació; el que val un punt
--     de mig del camp contra un de banda no ho publica ningú. Continua sent nostra — però ara
--     és UN paràmetre fent UNA feina, no un número tapant una mesura que faltava.
--
-- El resultat: el mig torna a pesar més que cap altre lloc (0,241), l'extrem recupera la seua
-- habilitat (29% del seu valor), el davanter l'anotació (49%), i un lateral amb defensa 6 i
-- extrem 8 val més (6,04) que un amb defensa 7 i extrem 2 (5,28), que és el cas que va obrir
-- tot això.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('importancia_sector',
   '{"mig":1.0,"defensa_central":0.36,"defensa_banda":0.255,"atac_central":0.36,"atac_banda":0.255}',
   'text',
   'Quant val guanyar cada sector (guia §5: 36% de les ocasions pel centre, 25,5% per costat; el mig decidix QUI té l''ocasió). NO CALIBRAT i no mesurable: les dues taules del wiki estan en punts de qualificació. Multiplica sempre `pesos_sector`, que és la conversió mesurada.');
