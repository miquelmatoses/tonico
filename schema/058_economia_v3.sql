-- L3 · ECONOMIA DEL v3: FLUX i ESTOC (contracte v3, PAS 3)
--
--   ingressos_recurrents = taquilla + patrocini + premis
--   despeses_fixes       = nòmina + manteniment_estadi + personal + planter
--   flux                 = ingressos_recurrents − despeses_fixes
--   sou_sostenible       = MAX(0; flux + nòmina − reserva_flux)
--   caixa                = saldo real DECLARAT (mai projectat)
--   caixa_disponible     = MAX(0; caixa − reserva_caixa)
--
-- El flux decidix quin SOU pots sostindre; l'estoc, què pots comprar HUI. Cap projecció
-- dins d'una decisió: per això cau tot el subsistema d'«objectiu de capital d'inflexió»
-- (era del model fàbrica) i la seua alerta de trajectòria.

-- 1. Ingressos recurrents desglossats (guia §9: el patrocini té fórmula pròpia).
--    `ingres_setmanal` es conserva com a total declarat heretat: no s'inventa cap
--    repartiment: mentre no hi haja desglossament, Paco el demana a l'informe.
ALTER TABLE finances ADD COLUMN taquilla  INTEGER;
ALTER TABLE finances ADD COLUMN patrocini INTEGER;
ALTER TABLE finances ADD COLUMN premis    INTEGER;

-- 2. Poms del PAS 3. Declarats i etiquetats: NO són mecànica de joc, són política de risc.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'reserva_flux',  '0', 'int'),    -- marge de flux que no es compromet
  ('competitiva', 'reserva_caixa', '0', 'int');    -- caixa intocable

-- 3. Fora la projecció d'inflexió: el v3 no projecta dins d'una decisió.
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_TRAJECTORIA_INFLEXIO');
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_TRAJECTORIA_INFLEXIO');
DELETE FROM regles WHERE codi = 'ALR_TRAJECTORIA_INFLEXIO';
DELETE FROM plantilles_parametres WHERE clau IN
  ('inflexio_cost_reconversio', 'inflexio_fitxatges_n', 'inflexio_sostre_fitxatge',
   'inflexio_setmanes_coixi', 'valor_estimat_defecte');

-- 4. El pla per fases era del model fàbrica: l'estratègia activa és una i viu a
--    config_usuari. La secció «Pla mestre» es retira (queda òrfena, i el v3 no la té).
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_CANVI_FASE');
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_CANVI_FASE');
DELETE FROM regles WHERE codi = 'ALR_CANVI_FASE';
UPDATE plans SET parametres = json_remove(COALESCE(parametres, '{}'), '$.capital_objectiu', '$.temporada_inflexio')
 WHERE parametres IS NOT NULL;

-- 5. DIVISIÓ: un únic format intern (romà). Qui la va declarar en àrab es normalitza ací,
--    perquè cap taula (estimació de preu, coeficients de patrocini) falle en silenci.
UPDATE config_usuari SET divisio = CASE divisio
  WHEN '1' THEN 'I'  WHEN '2' THEN 'II'  WHEN '3' THEN 'III' WHEN '4' THEN 'IV'
  WHEN '5' THEN 'V'  WHEN '6' THEN 'VI'  WHEN '7' THEN 'VII' WHEN '8' THEN 'VIII'
  ELSE UPPER(divisio) END
 WHERE divisio IS NOT NULL;
