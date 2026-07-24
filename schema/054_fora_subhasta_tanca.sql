-- Tonico — FORA ALR_SUBHASTA_TANCA (acció impossible sobre un jugador llistat).
-- Una vegada un jugador està a la subhasta, Hattrick NO deixa canviar el preu ni
-- retirar-lo; per tant «última oportunitat de revisar el preu o retirar-lo» és una
-- acció que no es pot fer. Viola el principi #3 (l'informe és l'agenda de hui: si no
-- hi ha acció executable HUI, no és alerta). A més, la data de tancament ja viu a la
-- fitxa de Vendes (columna «tancament previst»). Es desactiva; el flux del resultat
-- (desert/venut) el cobrix la pregunta de resultat_pendent quan la subhasta tanca.
UPDATE regles SET activa=0 WHERE codi='ALR_SUBHASTA_TANCA';
