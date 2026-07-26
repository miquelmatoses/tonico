-- L11 · PERSONAL (contracte v3, PAS 11): bucle de FLUX.
-- Tot el personal cobra igual siga quin siga el tipus: només compta el nivell.
--   cost_flux(nivell) = staff_cost_base × 2^(nivell−1)  →  1.020 · 2.040 · 4.080 · 8.160 · 16.320
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'staff_cost_base', '1020', 'int'),
  ('competitiva', 'prioritat_personal',
   '[{"tipus":"assistent","quants":2},{"tipus":"entrenador"},{"tipus":"metge"},{"tipus":"psicoleg"}]', 'text'),
  ('competitiva', 'divisio_psicoleg', 'III', 'text'),   -- el psicòleg només de III cap amunt
  ('competitiva', 'setmanes_contracte', '16', 'int');   -- contractar compromet el flux

-- L'eficiència del personal ja no es compara entre tipus (tots cobren igual): la config
-- de personal esperat per fase era del model retirat.
DELETE FROM alertes WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_PERSONAL_FASE');
DELETE FROM regles_parametres WHERE regla_id = (SELECT id FROM regles WHERE codi='ALR_PERSONAL_FASE');
DELETE FROM regles WHERE codi = 'ALR_PERSONAL_FASE';
