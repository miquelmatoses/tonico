-- Tonico — CONTINGUT de l'estratègia `fabrica`. Tot açò són dades: el motor
-- (lib/classificador.js) no en sap res. Afegir una estratègia = un fitxer com
-- este amb altres files, zero codi nou. Els números són poms de calibratge.

-- Paràmetres escalars de la plantilla
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'llindar_intercanvi',   '1.0',                                        'float'),
  ('fabrica', 'valor_especialitats',  '["Potent","Ràpid","Joc aeri","Tècnic","Imprevisible"]', 'json'),
  ('fabrica', 'buckets_posicio',      '{"mc":["MC"],"extrem":["ED","EE"]}',         'json'),
  ('fabrica', 'categoria_terminal',   'alliberament',                               'text'),
  ('fabrica', 'fornada_finestra_dies','21',                                         'int'),
  ('fabrica', 'edat_pic_venda',       '20',                                         'int');

-- Categories de l'embut (ordre = prioritat). Farciment (cobertura) va ABANS
-- de la liquidació: qui no agafa plaça de cobertura cau a venda/alliberament.
INSERT INTO plantilles_categories (plantilla, categoria, es_funcio, aforament, ordre, parametres) VALUES
  ('fabrica', 'entrenable', 1, NULL, 1,
   '{"requisits":[{"camp":"creativitat","op":">=","valor":2},{"camp":"edat_anys","op":"<=","valor":23}],
     "buckets":{"mc":["MC"],"extrem":["ED","EE"]},
     "puntuacio":{"termes":[{"camp":"creativitat","pes":1},{"camp":"edat_anys","pes":0.5,"desde":20}]},
     "places":{"mc":6,"extrem":2}}'),

  ('fabrica', 'futur_entrenador', 1, 1, 2,
   '{"requisits":[{"camp":"experiencia","op":">=","valor":8}],
     "puntuacio":{"termes":[{"camp":"experiencia","pes":1}]}}'),

  ('fabrica', 'experiencia', 1, 2, 3,
   '{"requisits":[{"camp":"experiencia","op":">=","valor":6}],
     "puntuacio":{"termes":[{"camp":"experiencia","pes":1}]}}'),

  -- Farciment = cobertura estructural (DV=davanter; no hi ha laterals en fàbrica).
  -- Places per posició, restant qui ja cobrix la posició des d'una altra categoria
  -- (resta_ocupacio: Salvatella, futur_entrenador, juga de davanter → quota davanter
  -- efectiva 0). Puntuació INVERSA del valor de mercat: es reté el que menys valor
  -- deixa d'ingressar (menys jove, menys habilitat, sense especialitat, més barat).
  -- Cobertura mínima: mai es liquida l'últim ocupant possible d'una quota.
  ('fabrica', 'farciment', 1, NULL, 4,
   '{"buckets":{"porter":["PO"],"DC":["DC"],"davanter":["DV"]},
     "places":{"porter":{"n":1,"requisit":{"camp":"porteria","op":">=","valor":6}},
               "DC":{"n":2,"requisit":{"camp":"defensa","op":">=","valor":6}},
               "davanter":{"n":1,"requisit":{"camp":"anotacio","op":">=","valor":5}}},
     "resta_ocupacio":true,
     "cobertura_minima":true,
     "puntuacio":{"termes":[{"camp":"habilitat_max","pes":-2},{"camp":"especialitat_valuosa","pes":-3},
                            {"camp":"edat_anys","pes":-1,"desde":25},{"camp":"sou","pes":-0.001}]}}'),

  -- Valor de mercat: l''edat pesa FORT (jove = valuós). Baix del llindar → sense
  -- valor real → cau a la categoria terminal (alliberament).
  ('fabrica', 'venda', 0, NULL, 5,
   '{"puntuacio":{"termes":[{"camp":"habilitat_max","pes":2},{"camp":"especialitat_valuosa","pes":3},{"camp":"edat_anys","pes":1,"desde":25}]},
     "llindar_minim":12.5}'),

  ('fabrica', 'alliberament', 0, NULL, 6, NULL);
