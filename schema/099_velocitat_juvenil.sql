-- Tonico — migració 099 · quants partits costa pujar un nivell de creativitat a un juvenil.
--
-- És l'equivalent juvenil de la fórmula de Schum del sènior, però ací no cal desxifrar-la:
-- hattrick-youthclub.org publica la taula. Files = edat, columnes = transició de nivell.
--
-- LA CLAU DE L'EDAT és «anys.dies» tal com la publica la font: 15.56 vol dir 15 anys i 56
-- dies, que és mitja temporada (112 dies l'any). Els graons són de mitja temporada.
--
-- ELS NÚMEROS SÓN PARTITS DE LLIGA amb entrenament PRINCIPAL i en posició del graó PLE (el
-- mig centre, per a creativitat). Per a la resta de posicions no cal una altra taula: es
-- dividix pel factor de la 098 (extrem 0,5 → el doble de partits; residual 0,15 → 6,66
-- vegades més). Eixa és tota la raó per la qual valia la pena deduir els factors.
--
-- AVÍS D'ÚS: la font assumeix UN PARTIT DE LLIGA PER SETMANA I CAP AMISTÓS. Els juvenils
-- també entrenen dels amistosos (efecte menor) i se'n pot concertar un cada tres setmanes,
-- o siga que qui en programe anirà una mica més ràpid que la taula. Partits, no setmanes.
--
-- No s'inclou la columna «8⇒8.1» que publica la font: és un tros de nivell que no sabem
-- interpretar, i preferim que falte a que estiga mal.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('velocitat_juvenil_creativitat',
   '{"15.0":[3.67,4.21,4.69,5.13,5.50,5.83,6.10,6.32],
     "15.56":[3.91,4.49,5.01,5.47,5.88,6.23,6.52,6.75],
     "16.0":[4.18,4.79,5.35,5.84,6.28,6.65,6.96,7.21],
     "16.56":[4.46,5.12,5.71,6.24,6.70,7.10,7.43,7.69],
     "17.0":[4.76,5.47,6.10,6.66,7.15,7.58,7.93,8.22],
     "17.56":[5.09,5.84,6.51,7.11,7.64,8.09,8.47,8.77],
     "18.0":[5.43,6.23,6.95,7.59,8.16,8.64,9.04,9.37],
     "18.56":[5.80,6.65,7.42,8.11,8.71,9.22,9.65,10.00]}',
   'text',
   'Partits de lliga amb entrenament principal en posició de graó PLE per a pujar un nivell de creativitat. Clau: edat «anys.dies» (112 dies l''any). Índex de la llista: transició 0→1, 1→2, … 7→8. Altres posicions: dividir pel factor de entrenament_juvenil_factors. Font: hattrick-youthclub.org/site/trainingsspeed (training/6, position/4).');
