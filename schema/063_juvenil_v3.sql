-- L9 · JUVENILS (contracte v3, PAS 10): proveïdors de rotatius.
-- `hores_pais`: dia i hora de l'actualització econòmica per país (marca el reinici de la
-- crida). NO CALIBRAT: la guia no publica la taula per país. Es sembra només amb el que
-- l'usuari puga confirmar; qui no hi siga, es demana.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('hores_pais', '{}', 'text',
   'Dia (0=diumenge) i hora UTC de l''actualització econòmica per país. NO CALIBRAT: es declara per usuari.');

-- Poms del PAS 10 que el full nomena i el codi no llegia.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'cost_promocio', '0', 'int'),      -- declarat: el joc no el publica
  ('competitiva', 'promocio_max_setmana', '1', 'int');  -- fet del joc

-- `bonus_club_mare` deixa de ser una constant morta: el v3 l'usa a valor_net_promo.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus)
  SELECT 'competitiva', 'bonus_club_mare', valor, tipus FROM constants_joc WHERE clau='bonus_club_mare';
