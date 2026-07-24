-- Tonico — CORRECCIÓ POST-AUDITORIA #1 (piles A + neteja C).
-- Migració en bloc: un concepte-un llindar, neteja de poms morts, i etiqueta de
-- calibratge del calendari de mercat. El codi (regles.js, orquestra) i els docs
-- s'actualitzen a banda; ací només les dades.

-- ── Punt 1 · UN CONCEPTE, UN LLINDAR: «porter notable» = 7, font única ──
-- Constant única del concepte (guia §2: Notable = nivell 7; §17: la Junta reté
-- porters «Notable+»). Cap regla torna a definir el llindar pel seu compte: tant
-- ALR_JUNTA_PORTER com el rellotge de depreciació d'ALR_LLISTAR_VENDA la referencien.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('porter_notable_min', '7', 'int', 'Nivell de Porteria a partir del qual un porter és «notable» (guia §2/§17). Font ÚNICA del concepte; cap regla el redefinix.');

-- Fora els llindars locals que duplicaven (i contradeien) el concepte.
DELETE FROM regles_parametres WHERE clau='porteria_min'
  AND regla_id IN (SELECT id FROM regles WHERE codi IN ('ALR_JUNTA_PORTER','ALR_DEPRECIACIO_MECANICA'));
DELETE FROM regles_parametres WHERE clau='porteria_deprecia'
  AND regla_id=(SELECT id FROM regles WHERE codi='ALR_LLISTAR_VENDA');

-- ── Punt 3 · NETEJA DE LLEGAT (poms) ──
-- ALR_ANIVERSARI: el codi exclou 'venda' (la governa ALR_LLISTAR_VENDA). El pom
-- 'categories' es cabla al seu ús real: només ENTRENABLE.
UPDATE regles_parametres SET valor='entrenable'
  WHERE clau='categories' AND regla_id=(SELECT id FROM regles WHERE codi='ALR_ANIVERSARI');

-- juvenil_bo_min: constant MORTA (cap referència a codi; grep buit). El rànquing és
-- NIVELL continu, no G1-G5. S'elimina (documentat a DECISIONS).
DELETE FROM constants_joc WHERE clau='juvenil_bo_min';

-- ── Punt 6 · CALENDARI DE MERCAT: modificadors «no calibrats» ──
-- Direcció confirmada (devblog oficial: preus baixos a final de temporada), però les
-- MAGNITUDS són nostres i encara no calibrades amb vendes pròpies. Etiqueta llegible
-- per la config perquè la UI puga advertir-ho; pla de calibratge a DECISIONS.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('mercat_modificadors_calibrats', 'no', 'text', 'Els modificadors de calendari_mercat tenen direcció confirmada (devblog) però magnituds SENSE calibrar amb vendes pròpies. Calibratge en curs.');
