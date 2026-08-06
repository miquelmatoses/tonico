-- Tonico — migració 117 · la defensa puja un graó.
--
-- CALIBRACIÓ CONTRA RESULTATS, que és per a això que existix `importancia_sector`. Miquel ha
-- perdut tots els partits, també contra bots, i li marquen massa gols. El full sempre ha dit
-- que este pom és la primera hipòtesi i el comandament per a afinar el sistema; és la primera
-- vegada que s'afina amb dades de partit i no amb aritmètica.
--
-- ─── QUÈ ES MOU I QUÈ NO ──────────────────────────────────────────────────────────────
-- La CONVERSIÓ (`pesos_sector`) no es toca: està mesurada del wiki, 90 cel·les. El que es mou
-- és quant val GUANYAR cada sector, que és la nostra interpretació de la guia §5 i l'única
-- peça del motor que no està mesurada.
--
--   defensa_central  0,36  → 0,414      defensa_banda  0,255 → 0,293      (×1,15)
--
-- L'atac i el mig es queden on estaven.
--
-- ─── QUÈ CANVIA ───────────────────────────────────────────────────────────────────────
-- Amb el sostre d'ara (~15.000 €/setmana):
--   pes del porter   0,1532 → 0,1761      (el porter només aporta a sectors defensius)
--   pes del central  0,1427 → 0,1593
--   perfil del central  DF10 CR8 → DF10 CR9      porter  PO7 DF9 → PO8 DF9
--
-- I es col·loca sol el cas que portàvem dos dies encallats: un central de 32 anys que abans
-- eixia d'extrem —perquè l'extrem pesava un 22% més i la decisió era un empat de 0,03%— ara
-- juga de central, i la plaça d'entrenament de l'extrem la recupera un de 20 anys.
--
-- Val la pena deixar-ho escrit: la solució no era cap regla nova sobre l'entrenament, era
-- el número que decidia la tria. Vam provar tres regles i cap aguantava.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('importancia_sector',
   '{"mig":0.85,"defensa_central":0.414,"defensa_banda":0.293,"atac_central":0.36,"atac_banda":0.255}',
   'text',
   'Quant val guanyar cada sector. NO MESURAT: és la nostra hipòtesi sobre la guia §5, i el comandament per a afinar el sistema. Multiplica sempre `pesos_sector`, que és la conversió mesurada del wiki. Historial: mig 1,0 → 0,85 el 2026-08-01 (115); defensa ×1,15 el 2026-08-06 per encaixar massa gols (117).');
