-- Tonico — migració 104 · la setmana comença en DIUMENGE, i l'àncora ha de caure-hi.
--
-- L'àncora era 2026-07-25, que és DISSABTE. Tota la graella de setmanes penja d'ella —
-- `calcularSetmana` compta dies des de l'àncora i els divideix per set—, o siga que amb
-- l'àncora en dissabte TOTES les vores de setmana quedaven desplaçades sis dies i la
-- temporada 83 començava una setmana tard.
--
-- Miquel ho declara: diumenge 19/07/2026 és el primer dia de la setmana 1 de la temporada 83.
UPDATE constants_joc SET valor='2026-07-19',
  nota='Primer dia (diumenge) de la setmana 1 de la T83. Tota la graella de setmanes penja d''ací.'
  WHERE clau='calendari_ancora_data';

-- I EL DIA, declarat, perquè es puga comprovar. Sense això, que l'àncora caiga en diumenge és
-- una coincidència que ningú vigila; amb això, és un invariant que el guardià verifica.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('setmana_primer_dia', '0', 'int',
   'Primer dia de la setmana (0=diumenge … 6=dissabte). L''àncora del calendari ha de caure en este dia.');
