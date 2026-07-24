-- Polit #10.0b — VIST vs DIA D. Les alertes amb data d'acció (subhasta que tanca,
-- llistat òptim d'aniversari) porten eixa data. Entra a la clau d'idempotència:
-- el dia D es crea una alerta NOVA encara que l'anticipada del mateix jugador/regla
-- estiguera vista. Sense això, un «vist» anticipat silenciava el dia d'acció.
ALTER TABLE alertes ADD COLUMN data_accio TEXT;
