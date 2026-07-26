-- Tonico — migració 028: doctrina juvenil v2 + noms curts de rol (ORDE juvenils+UI).
-- Constants de mecànica del joc (3e) — contingut, no codi.
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('revelacio_minuts',        '44',                     'int',  'Minuts en posició entrenable per revelar habilitat'),
  ('revelacio_actual_via',    'principal',              'text', 'L''actual es revela jugant en la posició de l''habilitat principal'),
  ('revelacio_potencial_via', 'secundari',              'text', 'El potencial es revela via l''habilitat secundària'),
  ('juvenil_crida_15',        '1',                      'int',  'Crides de 15 anys: 1 de cada 3'),
  ('juvenil_crida_16',        '2',                      'int',  'Crides de 16 anys: 2 de cada 3'),
  ('comentari_entrenador',    'aleatori_no_descobert',  'text', 'El comentari va a info NO descoberta d''un jugador aleatori');

-- Poms de plantilla (fabrica).
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'juvenil_objectiu',      '10',     'int'),   -- plantilla exacta (coixí de lesions)
  ('competitiva', 'preu_esperat_min',      '100000', 'int'),   -- barra de valor per promocionar-i-vendre vs despatx
  ('competitiva', 'venda_termini_setmanes','2',      'int');   -- vendre els promocionats dins d''este termini

-- Punt 1: noms CURTS de rol (parametritzats per plantilla, com els llargs).
UPDATE plantilles_parametres
   SET valor='[{"id":"A","competitiu":true,"nom_clau":"rol.fabrica_a","nom_clau_curt":"rol.fabrica_a_curt"},{"id":"B","competitiu":false,"nom_clau":"rol.fabrica_b","nom_clau_curt":"rol.fabrica_b_curt"}]'
 WHERE plantilla='competitiva' AND clau='rols';

-- Regles noves: crida setmanal recurrent, sobrants a despatxar, i revelació dirigida.
INSERT INTO regles (codi, modul, activa, ambit) VALUES
  ('ALR_CRIDA_SETMANAL',  'juvenil', 1, 'global'),
  ('ALR_JUVENIL_SOBRANT', 'juvenil', 1, 'global'),
  ('ALR_REVELA_JUVENIL',  'juvenil', 1, 'global'),
  ('ALR_JUVENIL_SUPLENTS','juvenil', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_CRIDA_SETMANAL'),  'urgencia', '54', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JUVENIL_SOBRANT'), 'urgencia', '56', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_REVELA_JUVENIL'),  'urgencia', '58', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_JUVENIL_SUPLENTS'),'urgencia', '88', 'int');
