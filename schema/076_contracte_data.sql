-- Tonico — migració 076 · el contracte del personal es DATA, no es compta.
--
-- `setmanes_contracte` era un COMPTE de setmanes que ningú decrementa: els quatre membres de
-- Miquel diuen «16» des del dia que els va declarar, i per tant el venciment no arriba MAI.
-- Un compte es podrix; una data no. `setmanes_restants` passa a DERIVAR-SE de la data i del
-- dia de veres — el mateix criteri que la resta del sistema (derivar > preguntar).
--
-- I fins ara no hi havia on declarar-la: el formulari demanava les setmanes i prou. Vore
-- l'invariant 17 (finestra de declaració).
ALTER TABLE personal_membres ADD COLUMN data_fi_contracte TEXT;

-- ─── QUOTES DEL JOC (guia «Staff») ────────────────────────────────────────────────────
-- El consell only admet 4 especialistes en total, 2 assistents com a màxim i 1 de cada altre
-- tipus. Tonico no ho sabia i podia proposar-ne més dels que el joc permet.
-- L'ENTRENADOR PRINCIPAL no és un especialista: la guia no el llista i no gasta plaça.
INSERT OR REPLACE INTO constants_joc (clau, valor, nota) VALUES
  ('quotes_personal',
   '{"total":4,"per_tipus":{"assistent":2,"metge":1,"psicoleg":1,"forma":1,"tactic":1,"financer":1}}',
   'Guia «Staff»: màxim 4 especialistes, 2 assistents, 1 de cada altre tipus. L''entrenador principal no compta.'),
  ('nivell_max_personal', '5', 'Guia «Staff»: els especialistes van de nivell 1 a 5.');

-- L'escala de Tonico (1.020 · 2.040 · 4.080 · 8.160 · 16.320) és la tarifa de CONTRACTE DE 16
-- SETMANES de la guia, que és la més barata per setmana (un contracte d'1 setmana val 2.115 €
-- per al nivell 1, el doble). Queda escrit perquè `setmanes_contracte`=16 no és una convenció
-- arbitrària: és el que fa que eixa escala siga la correcta.
UPDATE plantilles_parametres
   SET valor = valor
 WHERE plantilla='competitiva' AND clau='setmanes_contracte';
