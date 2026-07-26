-- V7 · CONCORDANÇA DE NOMBRE. L'alerta declara quina clau de `parametres` porta el COMPTADOR
-- que decidix singular o plural, pel mateix motiu que ja declarava quines són imports: la
-- vista no pot endevinar quin dels números compta coses. Amb el comptador declarat, el
-- missatge_clau és una BASE i el text viu és `clau_1` o `clau_n`.
ALTER TABLE alertes ADD COLUMN compte TEXT;   -- nom de la clau de `parametres` que compta
