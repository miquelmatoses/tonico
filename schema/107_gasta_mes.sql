-- Tonico — migració 107 · que es diga quan gastes més del que entra, i tres residus.
--
-- ─── 1. L'ALERTA QUE FALTAVA ──────────────────────────────────────────────────────────
-- El sistema calcula el flux cada volta que s'obri Economia i NO el diu enlloc: la píndola es
-- va llevar de la pantalla (marejava al costat dels ingressos) i el mecanisme que hauria
-- d'actuar —el `sobrecost`, que diu qui sobra pel sou— està tancat mentre no hi haja
-- `setmanes_mitjana` declarades. Amb els números de hui: 53.313 de despesa contra 51.064
-- d'ingressos, i cap paraula.
--
-- El llindar no és zero, és LA RESERVA: el contracte ja diu que les despeses recurrents no
-- poden passar del (1 − `reserva_flux_pct`) dels ingressos. Menjar-se la reserva ja és el
-- senyal; quedar-se en negatiu és el mateix senyal més fort, i per això és una sola regla amb
-- dos missatges.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_GASTA_MES', 'economia', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_GASTA_MES'), 'urgencia', '90', 'int');

-- ─── 2. EL LLINDAR DE SANCIÓ, que es va perdre ────────────────────────────────────────
-- `suspensio_amonestacions` es va esborrar a la 092 per «sense lector» — i era cert, no en
-- tenia. Però el contracte declara `sancionat(j) = amonestacions ≥ llindar` des de sempre, i
-- el pla juvenil comprovava un camp `expulsat` QUE NO EXISTIX enlloc: ni a l'esquema, ni a
-- l'adaptador. La condició de «bloquejat per roja» d'un juvenil no s'ha executat mai.
--
-- I ara sabem quin és el valor, perquè Miquel ha jugat un partit amb una groga i una roja:
-- LES DUES VAN A LA MATEIXA COLUMNA, i una roja s'escriu com un 3 — el mateix que tres
-- grogues. O siga que el llindar de sanció i «té roja» són el mateix número.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'amonestacions_suspensio', '3', 'int');

-- ─── 3. UNA REGLA MORTA VIVA ──────────────────────────────────────────────────────────
-- `ALR_JOVE_FORA_PIPELINE` deia el mateix que `ALR_JUVENIL_SOBRANT` per un camí distint. Se li
-- va llevar l'avaluador i la fila es va quedar activa: inert, però una mentida a la taula.
UPDATE regles SET activa = 0 WHERE codi = 'ALR_JOVE_FORA_PIPELINE';
