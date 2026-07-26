-- Tonico — migració 078 · les decisions d'ESTRUCTURA també arriben a l'informe, i urgents.
--
-- El pla de personal i el bucle d'estoc calculaven accions que NO generaven cap alerta: només
-- es veien entrant a la seua secció. Si Miquel té una plaça de personal lliure o una obra
-- d'estadi que compensa, això ha d'eixir dalt de tot, que és on mira.
--
-- Van per damunt de `llindar_urgent` (70) perquè són decisions que muntanyen el sostre de tot
-- el sistema: l'estadi mou el flux i el personal multiplica l'entrenament.

-- L'obra d'estadi té PRIORITAT ABSOLUTA al PAS 8: si és admissible, va abans que cap fitxatge.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_ESTADI_OBRA', 'economia', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_ESTADI_OBRA'), 'urgencia', '85', 'int');

-- Plaça de personal lliure dins de la quota del joc: és la compra de més rendiment que hi ha
-- (omplir una plaça rendix sis vegades més que pujar-ne una de nivell).
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_PERSONAL_PLACA', 'personal', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_PERSONAL_PLACA'), 'urgencia', '78', 'int');

-- El venciment d'un contracte és l'ÚNIC moment en què el nivell es pot canviar sense pagar
-- l'acomiadament: si passa, es perd fins d'ací a 16 setmanes. Puja per damunt del llindar.
UPDATE regles_parametres SET valor = '75'
 WHERE clau = 'urgencia' AND regla_id = (SELECT id FROM regles WHERE codi='ALR_CONTRACTE_PERSONAL');
-- Els números de la calculadora caducats bloquegen la decisió d'obra: també urgent.
UPDATE regles_parametres SET valor = '72'
 WHERE clau = 'urgencia' AND regla_id = (SELECT id FROM regles WHERE codi='ALR_ESTADI_CADUC');
