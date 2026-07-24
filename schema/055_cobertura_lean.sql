-- Tonico — COBERTURA MÍNIMA v3 (LEAN). Fora el pom marge_absencies: el mínim és
-- EXACTAMENT el que els dos onzes necessiten en setmana neta (sense coixí permanent).
-- Les absències reals es gestionen quan passen (jugar amb 10), no amb un marge fix.
-- porters_minims (1 per partit, cap reserva) es manté.
DELETE FROM plantilles_parametres WHERE clau='marge_absencies';
