-- Tonico — data llavor de Fase 0.
-- Constants del joc i configuració. Res d'això és hardcoded al codi:
-- el codi ho llig d'ací. Actualitzable quan Hattrick canvie mecàniques.

-- ── Calendari Hattrick (base de tots els càlculs d'edat i setmana) ──
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('any_dies',                 '112',        'int',  'L''any Hattrick té 112 dies'),
  ('temporada_setmanes',       '16',         'int',  '14 jornades + final de temporada'),
  ('temporada_jornades',       '14',         'int',  'Jornades de lliga per temporada'),
  ('calendari_ancora_temporada','83',        'int',  'Temporada de l''àncora'),
  ('calendari_ancora_data',    '2026-07-25', 'text', 'Primer partit T83 (data)'),
  ('calendari_ancora_hora',    '15:00',      'text', 'Primer partit T83 (hora)'),
  -- ── Entrenament (percentatges de la guia) ──
  ('entrenament_extrem_pct',   '50',         'int',  'L''extrem entrena al 50%'),
  ('entrenament_mc_pct',       '100',        'int',  'El migcampista entrena al 100%');

-- ── Configuració de l'app (identitat parametritzada) ──
INSERT INTO configuracio_app (clau, valor, nota) VALUES
  ('app_nom',        'Tonico',                 'Marca'),
  ('app_descriptor', 'el planter de Puchades', 'Subtítol'),
  ('secretari_nom',  'Paco Meseguer',          'El secretari tècnic que parla a l''usuari'),
  ('registre_verificacio_activa', 'false',     'Interruptor de verificació de correu (estructura preparada, inactiva)');
