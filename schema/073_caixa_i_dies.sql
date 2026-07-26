-- Tonico — migració 073 · La caixa no té derivada, i l'avís de dades velles va en dies.
--
-- (Estos dos canvis anaven dins de la 072 mentre l'escrivia; s'han separat perquè la 072 ja
-- estava aplicada a prod i una migració que ja ha corregut NO es toca.)

-- ─── Fora `caixa_disponible` i `reserva_caixa` ─────────────────────────────────────────
-- La reserva d'ESTOC no s'ha usat mai (0 per defecte i ningú la posava), i una derivada que
-- val sempre igual que la seua entrada és un concepte de més. El PAS 8 compara contra la
-- `caixa` declarada. La reserva de FLUX (5%) es queda, que eixa sí que fa feina.
DELETE FROM plantilles_parametres WHERE clau = 'reserva_caixa';

-- ─── L'avís de dades velles va en DIES, no en setmanes ────────────────────────────────
-- Miquel ho ha demanat en dies: «si fa més de 7 dies que no ho faig». Anomenar-ho en setmanes
-- obligava a traduir mentalment cada vegada.
DELETE FROM plantilles_parametres WHERE clau = 'setmanes_avis_dades';
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'dies_avis_dades', '7', 'int');
