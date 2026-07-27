-- Tonico — migració 096 · qui pot fer de porter suplent.
--
-- Abans es DEDUÏA de les habilitats: era porter qui tenia la porteria estrictament per damunt
-- de totes les altres. Deixava fora porters de veres —un que llança faltes té la pilota
-- aturada igual o més alta, que a Hattrick és de la casa— i eixos se n'anaven a VENDA mentres
-- la mateixa pantalla demanava comprar un porter suplent. El mateix home a les dues fitxes.
--
-- Ara és un LLINDAR i prou: amb `porter_suplent_porteria_min` de porteria ja pots posar-te
-- sota pals al segon onze, tingues el que tingues a la resta. El segon onze no és per a
-- guanyar: és per a que el titular no haja de doblar, que és l'únic que no pot fer.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus)
  SELECT plantilla, 'porter_suplent_porteria_min', '4', 'int'
    FROM (SELECT DISTINCT plantilla FROM plantilles_parametres);
