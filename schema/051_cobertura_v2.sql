-- Tonico — COBERTURA MÍNIMA v2 + FORA L'APARADOR.
-- El nombre d'entrenables objectiu i la plantilla mínima ja NO són números escrits a
-- mà: es deriven de la formació i els rols (lib/cobertura.js). Ací només la POLÍTICA
-- que no es pot derivar: quants porters i quant marge d'absències volem.

-- Porters mínims i marge d'absències simultànies (poms de plantilla, defecte 2 i 2).
INSERT INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('fabrica', 'porters_minims', '2', 'int'),
  ('fabrica', 'marge_absencies', '2', 'int');

-- El pom `objectiu` d'ALR_NUCLI_INCOMPLET queda de RESERVA: la regla usa l'objectiu
-- DERIVAT de la cobertura (capacitat de places × règim) i només cau al pom si no hi ha
-- config d'alineació. No s'esborra per a no deixar la regla sense xarxa.
