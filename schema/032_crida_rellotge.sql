-- Tonico — migració 032: rellotge de crida amb REINICI SETMANAL GLOBAL. La crida es
-- reinicia per a TOTS els usuaris al mateix moment (poc abans del cap de setmana). La
-- disponibilitat es DERIVA del calendari (cap config per usuari): disponible si no s'ha
-- declarat cap crida dins de la finestra setmanal vigent.
-- Font del defecte (divendres): observació de Miquel sobre el reinici setmanal de HT;
-- ajustable ací si observem el moment exacte (vegeu DECISIONS.md).
INSERT INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('crida_reinici_dia',  '5',     'int',  'Dia de reinici setmanal de la crida (0=diumenge … 6=dissabte; 5=divendres)'),
  ('crida_reinici_hora', '18:00', 'text', 'Hora aproximada del reinici (poc abans del cap de setmana)');

-- Crides DECLARADES per l'usuari («he fet la crida»): data + resultat. Si s'accepta,
-- el nou juvenil enllaça amb la instantània següent (la reavaluació ja és automàtica).
CREATE TABLE crides (
  id             INTEGER PRIMARY KEY,
  usuari_id      INTEGER NOT NULL REFERENCES usuaris(id),
  data           TEXT NOT NULL,
  resultat       TEXT NOT NULL CHECK (resultat IN ('acceptat','rebutjat')),
  jugador_nou_id INTEGER REFERENCES jugadors(id)
);
CREATE INDEX ix_crides_usuari ON crides(usuari_id, data);

-- La crida setmanal per compte (count ≤ objectiu) es reemplaça pel rellotge de finestra.
UPDATE regles SET activa=0 WHERE codi='ALR_CRIDA_SETMANAL';
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_CRIDA_DISPONIBLE', 'juvenil', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_CRIDA_DISPONIBLE'), 'urgencia', '60', 'int');
