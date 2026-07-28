-- Tonico — migració 106 · l'entrenador entra al sistema.
--
-- Tot el model escala amb els ingressos: el personal per `quota_personal`, els jugadors pel
-- residu, l'estadi pel PAS 8. L'ENTRENADOR NO. Estava a la banda dels FETS —es restava sencer
-- i no participava de res—, o siga que per molt que els ingressos es dupliquen, Tonico mai
-- diria que toca millorar-lo. És l'únic element amb cost conegut i efecte conegut sense
-- decisió, i amb els números de hui s'emporta el 9,8% dels ingressos: més que tot el
-- pressupost de personal junt.
--
-- ES FIXA COM A PERCENTATGE, igual que `quota_personal`: política declarada de la qual el
-- nivell és CONSEQÜÈNCIA. El 10% no és inventat, és el que ja se li dedica.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'quota_entrenador', '0.10', 'float');

-- LA BASE DEL SEU SOU, que existia i es va perdre. La migració 071 la va declarar dins de
-- `prioritat_personal` (`{"tipus":"entrenador","base":1250}`) i la 077 va reescriure eixe pom
-- sencer per a posar-hi la prioritat de la guia, i se la va emportar. El contracte encara
-- documenta les DUES bases —1.020 especialistes, 1.250 entrenador— i la dada ja no hi era.
--
-- I ara està confirmada per dos costats independents:
--   · l'informe real: 3 especialistes de nivell 2 (3 × 2.040) + entrenador = 11.120 € → 5.000
--   · l'escala: 5.000 = 1.250 × 2², o siga el NIVELL 3, i Miquel confirma que el seu és 3 de 5
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'entrenador_cost_base', '1250', 'int');

-- CINC NIVELLS CONTRACTABLES, no sis. La taula d'eficiència de la guia en té sis perquè
-- inclou «pobre», que no es pot contractar: és on DECAU un entrenador vell (la seua habilitat
-- es degrada després de la primera temporada). Els cinc que es contracten són fluix,
-- insuficient, passable, sòlid i excel·lent — i és el mateix rang que la taula de preus.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('entrenador_nivell_max', '5', 'int',
   'Nivells d''entrenador contractables (fluix..excel·lent). «Pobre» surt de la taula d''eficiència però no es contracta: és decaïment.');

-- L'ALERTA. El punt de tot açò: que quan els ingressos sostinguen un entrenador millor, ho
-- diga. No és una acció immediata —millorar-lo es paga d'un colp, de caixa, com un fitxatge—
-- però és el moment de decidir-ho, i abans no existia eixe moment.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_ENTRENADOR_MILLORABLE', 'personal', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_ENTRENADOR_MILLORABLE'), 'urgencia', '60', 'int');
