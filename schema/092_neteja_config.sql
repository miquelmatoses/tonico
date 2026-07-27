-- Tonico — migració 092 · neteja de configuració que ja no llig ningú.
--
-- Poms i constants que van quedar arrere en retirades anteriors (el model fàbrica, el
-- classificador, l'estimació de preu del v3.1, els moviments, l'alineació vella). Cap codi
-- els consulta; es queden a la base fent soroll i, pitjor, fent creure que hi ha una palanca
-- on no n'hi ha cap. El que el CONTRACTE encara nomena NO es toca, encara que el codi no
-- l'use: això és un forat de reconstrucció, no brossa.

-- ── Categories de la classificació retirada (PAS 6) ──
-- Només se'n llig `venda` (la fórmula de puntuació) i `futur_entrenador` (l'aforament).
DELETE FROM plantilles_categories WHERE categoria IN ('core', 'cos');

-- ── Poms sense lector ──
--   llindar_intercanvi       → la taula `intercanvis`, esborrada a la 090
--   buckets_posicio          → el filtre de cerca gasta `buckets_alineacio`
--   categoria_terminal       → apuntava a `alliberament`, categoria esborrada a la 060
--   compra_creativitat_min   → el llistó de veres és `entrenable_creativitat_min`
--   compra_posicions         → el cercador gasta `buckets_alineacio`
--   moviment_caducitat_dies  → el subsistema de moviments va caure a la 072
--   mc_entrenament / pes_entrenament → l'alineació vella
--   la resta: mai cap lector des del dia que es van sembrar
DELETE FROM plantilles_parametres WHERE clau IN (
  'llindar_intercanvi', 'buckets_posicio', 'categoria_terminal', 'aniversari_perdua_pct',
  'suspensio_amonestacions', 'compra_creativitat_min', 'compra_posicions', 'preu_esperat_min',
  'venda_termini_setmanes', 'moviment_caducitat_dies', 'mc_entrenament', 'pes_entrenament');

-- ── Constants sense lector ──
-- `base_preu_divisio`: el contracte diu literalment que es va llevar al v3.1 (Tonico no diu
-- quant val un jugador). La fila es va quedar perquè el DELETE de la 071 apuntava a l'altra
-- taula. Els percentatges d'entrenament viuen dins de `formacio`; els llindars de crida, dins
-- de `crida_llindars`; la divisió, a `config_usuari`.
DELETE FROM constants_joc WHERE clau IN (
  'temporada_jornades', 'calendari_ancora_hora', 'entrenament_extrem_pct', 'entrenament_mc_pct',
  'revelacio_actual_via', 'revelacio_potencial_via', 'juvenil_crida_15', 'juvenil_crida_16',
  'comentari_entrenador', 'crida_reinici_hora', 'despatxar_llindar', 'setmanes_venda_estimada',
  'divisio_defecte', 'bonus_club_mare', 'mercat_modificadors_calibrats', 'base_preu_divisio',
  'coach_preu_extern', 'coach_setmanes_minimes');

-- ── Regles sense implementació al motor ──
-- `ALR_DEPRECIACIO_MECANICA` (desactivada a la 049, amb la doctrina de liquidació) i
-- `ALR_REVELA_JUVENIL` (substituïda per `ALR_REVELACIO_JUVENIL` a la 029). El motor fa
-- `REGLES[codi]` i s'empassa en silenci el que no hi és: una fila sense codi és una regla
-- que sembla activa i no ho és.
DELETE FROM regles_parametres WHERE regla_id IN
  (SELECT id FROM regles WHERE codi IN ('ALR_DEPRECIACIO_MECANICA', 'ALR_REVELA_JUVENIL'));
DELETE FROM alertes WHERE regla_id IN
  (SELECT id FROM regles WHERE codi IN ('ALR_DEPRECIACIO_MECANICA', 'ALR_REVELA_JUVENIL'));
DELETE FROM regles WHERE codi IN ('ALR_DEPRECIACIO_MECANICA', 'ALR_REVELA_JUVENIL');
