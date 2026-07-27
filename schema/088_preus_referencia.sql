-- Tonico — migració 088 · el preu de referència d'un fitxatge, declarat.
--
-- PER QUÈ ES DECLARA I NO ES DERIVA. A Hattrick el preu d'un jugador no el calcula el joc: el
-- paga un altre mànager en una subhasta. La velocitat d'entrenament sí que és una fórmula i es
-- va poder desxifrar (Schum); el preu no ho és, i per això cap eina en publica cap: Transfer
-- Compare, HTPE i HAM són estimadors estadístics sobre vendes recents, no fórmules.
--
-- Per tant Tonico no se l'inventa. El filtre de cerca ja diu QUÈ buscar; el que falta és que
-- Miquel mire les últimes transferències i torne el preu mitjà que veu. Un número per tipus de
-- fitxatge, no un model.
--
-- LA CLAU és el tipus de fitxatge, no el jugador: «un mig centre de nivell 9» val el mateix per
-- als tres llocs de mig centre. La construïx l'avaluador (`lib/fitxatges.js`), mai la pantalla.
CREATE TABLE preus_referencia (
  usuari_id  INTEGER NOT NULL REFERENCES usuaris(id),
  clau       TEXT    NOT NULL,           -- p. ex. «mc:9», «entrenable:6», «porter_suplent»
  preu       INTEGER,                    -- el que costa de veres, mirat al mercat
  data       TEXT NOT NULL,              -- quan es va mirar: un preu vell no val igual
  PRIMARY KEY (usuari_id, clau)
);

-- Quant dura un preu abans de tornar-lo a mirar. El mercat es mou, i un preu de fa dos mesos
-- no és el mateix que un de fa dos dies: passat este termini, es demana un altre volta.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'setmanes_caducitat_preu', '4', 'int');
