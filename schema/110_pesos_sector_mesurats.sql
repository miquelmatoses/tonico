-- Tonico — migració 110 · els pesos de sector deixen de ser nostres.
--
-- `pes_mig = 1,0` era l'únic número que ens havíem inventat, i amb monocultiu només partia el
-- pressupost entre llocs. Amb el policultiu passa a decidir QUI JUGA, i tal com estava deia que
-- compraves creativitat per a tots els llocs: la creativitat valia el 48% d'un extrem i el 28%
-- d'un davanter, més que l'extrem per a l'extrem mateix.
--
-- ─── D'ON IXEN ELS NÚMEROS ────────────────────────────────────────────────────────────
-- El wiki publica les mateixes files dues vegades:
--   · «Skill contribution» en PERCENTATGES  — la creativitat d'un extrem aporta el 45% del
--     seu valor al mig del camp. És la que tenim a `taula_aportacio`.
--   · «Contribution» en COEFICIENTS ABSOLUTS — eixa mateixa cel·la val 0,065.
-- El quocient entre les dues ÉS el pes del sector, i es pot mesurar cel·la a cel·la. Amb 28
-- cel·les de sis posicions ix això, amb la dispersió de cada sector:
--
--   defensa central   0,197  (±13%)      mig del camp   0,148  (±8%)
--   defensa de banda  0,304  (±6%)       atac central   0,173  (±4%)
--   atac de banda     0,241  (±12%)
--
-- I SÓN CINC SECTORS, NO TRES. Teníem «central» i «banda» col·lapsant defensa i atac, i la
-- mesura diu que no pesen igual: la banda defensiva val 0,304 i l'atacant 0,241.
--
-- ─── PER QUÈ NO ES COPIA LA TAULA DE COEFICIENTS DIRECTAMENT ──────────────────────────
-- Perquè les seues columnes NO estan en l'ordre que diu la seua pròpia capçalera, i l'ordre
-- canvia segons el bloc. Al davanter, «atac central» llegit com diu la capçalera dona quocients
-- de 0,482 i 0,066 (impossible); canviant les dues columnes dona 0,178 i 0,179. Copiar-la a
-- cegues posaria l'anotació on va la passada, al lloc on l'anotació ho és tot.
--
-- ─── LA LLETRA MENUDA ─────────────────────────────────────────────────────────────────
-- Les dues taules són de moments distints del motor de partit (2017 i 2019) i els quocients no
-- ixen constants del tot. És una MESURA amb soroll, no una derivació exacta. Però la dispersió
-- va del 4% al 13%, i el que corregix és un factor de set.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('pesos_sector',
   '{"mig":0.148,"defensa_central":0.197,"defensa_banda":0.304,"atac_central":0.173,"atac_banda":0.241}',
   'text',
   'Pes de cada sector de qualificació, MESURAT com el quocient entre les taules de coeficients i de percentatges del wiki (28 cel·les, 6 posicions). Substituïx pes_mig/pes_central/pes_banda, que col·lapsaven defensa i atac i portaven el mig set vegades inflat.');

DELETE FROM plantilles_parametres WHERE clau IN ('pes_mig', 'pes_central', 'pes_banda');
