-- Tonico — migració 115 · el mig del camp baixa a 0,85.
--
-- `importancia_sector` és el comandament del sistema: la conversió (`pesos_sector`) està
-- MESURADA del wiki i no es toca, però quant val GUANYAR cada sector no ho publica ningú i és
-- la nostra hipòtesi. El mig estava en 1,00 contra 0,36 del centre i 0,255 de les bandes.
--
-- Miquel el baixa un graó perquè el pressupost del mig centre estava molt per damunt de la
-- resta i eixos són justament els llocs que ENTRENEM: pugen sols, i gastar-hi sou és pagar per
-- una cosa que la corba d'entrenament ja et dona. El que es busca no és menysprear el mig, és
-- que la resta puge.
--
-- Amb 0,85, i amb el mateix sostre de sou de 10.291 €:
--   porter 789 → 837 · central 764 → 780 · extrem 946 → 949 · davanter 795 → 813
--   mig centre 1.243 → 1.197
-- Pugen tots quatre. Qui més se'n beneficia és el porter, i qui menys l'extrem — perquè
-- l'extrem també aporta molt al mig del camp i per tant també nota la baixada.
--
-- NO ES TOCA LA CONVERSIÓ. Si algun dia es vol moure la relació defensa/atac, eixe és un altre
-- número d'esta mateixa constant, no este.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('importancia_sector',
   '{"mig":0.85,"defensa_central":0.36,"defensa_banda":0.255,"atac_central":0.36,"atac_banda":0.255}',
   'text',
   'Quant val guanyar cada sector (guia §5: 36% de les ocasions pel centre, 25,5% per costat; el mig decidix QUI té l''ocasió). NO CALIBRAT i no mesurable: les dues taules del wiki estan en punts de qualificació. És el comandament per a afinar el sistema. Multiplica sempre `pesos_sector`, que és la conversió mesurada. El mig va baixar d''1,0 a 0,85 el 2026-08-01 (migració 115).');
