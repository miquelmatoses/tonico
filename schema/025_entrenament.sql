-- Tonico — migració 025 (Àrea C): el tipus d'entrenament és PARÀMETRE DE FASE,
-- no una constant. Cada fase prescriu tipus + intensitat + % de resistència, i
-- defineix el PIPELINE (habilitat principal/secundària) del qual deriven els
-- juvenils, i les habilitats VENDIBLES per a l'excepció «promocionar-i-vendre».
-- Fàbrica: creativitat / 100% / 10%; pipeline creativitat→passades.
-- fabrica_min: potencial de l'habilitat principal per ser candidat a fàbrica en
-- promocionar. sostre_min: potencial principal ≤ açò → fora de pipeline. vendible_min:
-- potencial en una habilitat vendible per activar «promocionar-i-vendre als 17».
-- parells_permesos: habilitats on principal=secundari juvenil és acceptable.
UPDATE fases_config SET config = json_set(config, '$.entrenament',
  json('{"tipus":"creativitat","intensitat":100,"resistencia":10,"principal":"creativitat","secundari":"passades","vendibles":["anotacio","extrem","defensa"],"fabrica_min":5,"sostre_min":2,"vendible_min":5,"parells_permesos":["defensa","anotacio","creativitat"]}'))
 WHERE plantilla = 'fabrica';

-- Alerta si l'entrenament configurat a HT (confirmat per l'usuari) no coincidix
-- amb el que prescriu la fase.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_ENTRENAMENT_DESQUADRE', 'personal', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_ENTRENAMENT_DESQUADRE'), 'urgencia', '68', 'int');
