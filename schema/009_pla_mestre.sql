-- Tonico — migració 009: pla mestre (Fase 4). Esdeveniments clau del pla
-- Benifotrem T83→T91 com a dades, per als plans 'fabrica' existents (usuari-zero).
-- Fresh installs sense pla no insereixen res (els nous usuaris el fan al formulari).
UPDATE plans SET fase_actual = 'fabrica',
  parametres = '{"temporada_inflexio":88,"capital_objectiu":430000}'
 WHERE plantilla = 'fabrica';

INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 83, NULL, 'fabrica', '{"events":["Arrancada de la fàbrica"]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 84, NULL, 'fabrica', '{"eixides_fornada":["A1"],"entrades":["Moyano (X de Fotrem)"],"events":["Primera collita: ix A1"]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 85, NULL, 'fabrica', '{"eixides_fornada":["A2"],"events":["Comença l''eixida d''A2"]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 86, NULL, 'fabrica', '{"eixides_fornada":["A2","V"],"events":["Ix la resta d''A2 i els veterans (V)"]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 87, NULL, 'fabrica', '{"events":["Preparació de l''inflexió"]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 88, NULL, 'inflexio', '{"events":["INFLEXIÓ","Salvatella → entrenador (~430k€)","General → Tribuna","Pujada de resistència"],"canvi_fase":"inflexio"}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 89, NULL, 'competitiu', '{"events":["Primera temporada competitiva"]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 90, NULL, 'competitiu', '{"events":[]}' FROM plans WHERE plantilla='fabrica';
INSERT INTO plans_temporades (pla_id, temporada, divisio_prevista, mode, accions_previstes)
  SELECT id, 91, NULL, 'competitiu', '{"events":["Horitzó del pla"]}' FROM plans WHERE plantilla='fabrica';

-- Regles de fase (Fase 4)
INSERT INTO regles (codi, modul, activa, ambit) VALUES
  ('ALR_FINESTRA_VENDA_FORNADA', 'pla', 1, 'global'),
  ('ALR_CANVI_FASE',            'pla', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_FINESTRA_VENDA_FORNADA'), 'temporades_avis', '1', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_FINESTRA_VENDA_FORNADA'), 'urgencia', '65', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_CANVI_FASE'), 'temporades_avis', '1', 'int'),
  ((SELECT id FROM regles WHERE codi='ALR_CANVI_FASE'), 'urgencia', '85', 'int');
