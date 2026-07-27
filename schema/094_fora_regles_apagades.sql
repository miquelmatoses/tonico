-- Tonico — migració 094 · fora les regles apagades per sempre.
--
-- Quatre regles amb `activa=0` des de fa migracions, i cap migració les torna a encendre:
--
--   ALR_NUCLI_SENSE_MINUTS · ALR_JUVENIL_SUPLENTS   (029: el parte no parla d'alineació)
--   ALR_CRIDA_SETMANAL                              (032: la substituïx el rellotge de finestra)
--   ALR_SUBHASTA_TANCA                              (054: una vegada llistat, HT no deixa fer res)
--
-- La implementació seguia al motor: codi que sembla viu, es manté i es llig, i no pot
-- disparar mai. Se'n va amb la fila.
DELETE FROM regles_parametres WHERE regla_id IN (SELECT id FROM regles WHERE codi IN
  ('ALR_NUCLI_SENSE_MINUTS', 'ALR_JUVENIL_SUPLENTS', 'ALR_CRIDA_SETMANAL', 'ALR_SUBHASTA_TANCA'));
DELETE FROM alertes WHERE regla_id IN (SELECT id FROM regles WHERE codi IN
  ('ALR_NUCLI_SENSE_MINUTS', 'ALR_JUVENIL_SUPLENTS', 'ALR_CRIDA_SETMANAL', 'ALR_SUBHASTA_TANCA'));
DELETE FROM regles WHERE codi IN
  ('ALR_NUCLI_SENSE_MINUTS', 'ALR_JUVENIL_SUPLENTS', 'ALR_CRIDA_SETMANAL', 'ALR_SUBHASTA_TANCA');
