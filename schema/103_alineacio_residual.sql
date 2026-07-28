-- Tonico — migració 103 · com s'ompli l'alineació juvenil quan l'entrenament no diu res.
--
-- Les places d'entrenament les reparteixen les dues passades del PAS 10 (creativitat i
-- passades). Però hi ha un cas que fins ara eixia com un guió: el de la plantilla ROÏNA. Si
-- tots estan capats per davall del llistó, cap passada col·loca ningú, i la pantalla es
-- limitava a dir «–» deu vegades. Justament quan més falta fa saber què fer.
--
-- L'ORDE per a omplir el que queda fins als nou de l'alineació legal el declara Miquel:
-- primer el porter, després els cinc defenses, i per últim els tres davanters. Mig centres i
-- extrems NO entren ací: eixes places són d'entrenament, i posar-hi algú que ningú entrena
-- només serviria per a gastar-les.
--
-- Els números no van ací: les capacitats ja les diu `maxims_posicio` (migració 039). Açò és
-- només l'ORDE, que és la decisió.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('orde_alineacio_residual',
   '["porter","defensa","davanter"]',
   'text',
   'Orde per a omplir l''alineació juvenil amb els que no ocupen plaça d''entrenament: porter, defenses, davanters. Les capacitats les diu maxims_posicio. Mig centres i extrems queden fora: són places d''entrenament.');
