-- Polit #10.2 — Llindar de la Junta corregit. Font: guia de Hattrick, secció
-- transferències: la Junta reté porters «Notable+» = nivell 7 (no 5). Amb el 5,
-- Castelló (PO6) i Erarrizaga (PO5) generaven alertes FALSES (la Junta no els
-- retindria). Puja el pom a 7.
UPDATE regles_parametres SET valor = '7'
 WHERE clau = 'porteria_min'
   AND regla_id = (SELECT id FROM regles WHERE codi = 'ALR_JUNTA_PORTER');
