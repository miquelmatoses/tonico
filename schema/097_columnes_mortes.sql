-- Tonico — migració 097 · set columnes que cap consulta toca.
--
--   finances.taquilla_s1 · patrocini_s1 · taquilla_s2 · patrocini_s2
--     L'històric va per SETMANA des de la 075 (`setmanes_economiques`). Estos quatre camps
--     eren el model d'abans —«la passada» i «esta», en una sola fila— i cap consulta els
--     nomena des de llavors: `functions/api/finances.js` i `lib/economia.js` llegixen la
--     taula per setmanes. Els valors que hi queden són d'aquella època.
--
--   personal_membres.setmanes_contracte
--     Era un COMPTE declarat que ningú decrementava: es congelava i el venciment no
--     arribava mai. El substituïx `data_fi_contracte` (migració 076), d'on els dies es
--     DERIVEN contra hui.
--
--   vendes.preu_eixida · preu_venut
--     L'import d'una venda no s'apunta (v3.1): no entra a cap fórmula i el diner apareix a
--     la caixa del període següent. `preu_eixida` no el llegia ningú i `preu_venut` es
--     llegia sense que ningú l'escriguera mai, o siga que la seua condició sempre era certa.
ALTER TABLE finances DROP COLUMN taquilla_s1;
ALTER TABLE finances DROP COLUMN patrocini_s1;
ALTER TABLE finances DROP COLUMN taquilla_s2;
ALTER TABLE finances DROP COLUMN patrocini_s2;
ALTER TABLE personal_membres DROP COLUMN setmanes_contracte;
ALTER TABLE vendes DROP COLUMN preu_eixida;
ALTER TABLE vendes DROP COLUMN preu_venut;
