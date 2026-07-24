-- Tonico — migració 021 (Àrea A): finances declarades reals.
-- La caixa deixa de ser només SUM(transaccions): l'usuari declara la caixa real
-- de l'informe setmanal de HT (fet del món). Despeses fixes setmanals (planter,
-- estadi) i ingressos recurrents declarables → balanç operatiu setmanal i
-- projecció fins a la data d'inflexió del pla mestre.
CREATE TABLE finances (
  usuari_id        INTEGER PRIMARY KEY REFERENCES usuaris(id),
  caixa            INTEGER,   -- caixa real (informe setmanal de HT)
  caixa_data       TEXT,      -- data de la lectura
  despesa_planter  INTEGER,   -- €/setmana: planter (juvenil)
  despesa_estadi   INTEGER,   -- €/setmana: manteniment d'estadi
  ingres_setmanal  INTEGER    -- €/setmana: ingressos recurrents (patrocini + taquilla)
);

-- Regla: la trajectòria no arriba a l'objectiu d'inflexió a la seua data.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_TRAJECTORIA_INFLEXIO', 'economia', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_TRAJECTORIA_INFLEXIO'), 'urgencia', '70', 'int');
