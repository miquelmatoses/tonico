-- Tonico — migració 077 · EL PERSONAL SEGONS LA GUIA, i fora la fàbrica que quedava.
--
-- Fins ara el personal tenia tipus inventats per nosaltres, una regla de divisió sense font,
-- una base de cost per a l'entrenador ajustada a un sol punt, i un repartiment voraç que
-- buidava els últims de la llista. La guia «Staff» que Miquel ha compartit ho ordena tot.

-- ─── 1. ELS SIS TIPUS REALS ───────────────────────────────────────────────────────────
-- Els que el joc deixa triar, amb la seua quota. L'entrenador principal SE'N VA: no és
-- especialista, no gasta plaça i no cobra per esta escala (va al PAS 8, com una compra).
-- L'ORDRE és el que decidix qui entra primer quan no caben tots:
--   1. assistent  — +3,5% de velocitat d'entrenament per nivell. L'única palanca que
--                   multiplica el motor de l'estratègia (entrenar creativitat i passades).
--   2. metge      — els assistents PUGEN el risc de lesió (+2,5%/niv) i ell el baixa
--                   (−7,5%/niv) i accelera la recuperació. Van acoblats: ix de la guia,
--                   no d'un criteri nostre.
--   3. assistent  — el segon, fins a la quota de 2.
--   4. psicòleg   — confiança i ànim d'equip; el perfil «competitiu + entrenament» de la
--                   guia el posa a la quarta plaça.
--   5. forma      — «assistent personal dels jugadors»: +0,2 de forma per nivell.
--   6. tàctic     — ordres de partit i estil de joc: Tonico no gestiona el partit.
--   7. financer   — només fa servei amb milions al banc.
UPDATE plantilles_parametres
   SET valor = '[{"tipus":"assistent","quants":2},{"tipus":"metge"},{"tipus":"psicoleg"},'
            || '{"tipus":"forma"},{"tipus":"tactic"},{"tipus":"financer"}]'
 WHERE plantilla = 'competitiva' AND clau = 'prioritat_personal';

-- ─── 2. Fora la regla sense font i la base inventada ──────────────────────────────────
-- `divisio_psicoleg` deia «el psicòleg només de III cap amunt». La guia NO diu res de
-- divisions per al psicòleg: ve del model fàbrica i excloïa la quarta plaça de Miquel.
DELETE FROM plantilles_parametres WHERE clau = 'divisio_psicoleg';
-- `entrenador_cost_base` era un ajust a UN sol punt de dades (5.000 € al nivell 3 de Miquel).
-- L'entrenador no cobra per l'escala d'especialistes: se'n va amb ell.
DELETE FROM plantilles_parametres WHERE clau = 'entrenador_cost_base';

-- ─── 3. EL DIVISOR, que no es pot derivar ─────────────────────────────────────────────
-- Quina part del flux repartible va a personal. És POLÍTICA declarada, com `reserva_flux_pct`:
-- no ix de cap taula. El nivell de les places és CONSEQÜÈNCIA d'este número, no a l'inrevés —
-- si fora el nivell el que es fixa, seria un import fix i no escalaria amb els ingressos.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'quota_personal', '0.40', 'float');

-- ─── 4. L'ENTRENADOR PRINCIPAL (guia «Coach») ─────────────────────────────────────────
-- És una COMPRA (estoc), no una línia de flux: els preus són d'un sol pagament. El seu sou
-- setmanal és un fet fix, com el manteniment d'estadi.
INSERT OR REPLACE INTO constants_joc (clau, valor, nota) VALUES
  ('coach_eficiencia',
   '{"pobre":71.4,"fluix":76.9,"insuficient":83.3,"passable":90.9,"solid":100,"excellent":105.3}',
   'Guia «Coach»: eficiència d''entrenament, base sòlid = 100%. Mai millor que excel·lent.'),
  ('coach_preu_extern',
   '{"pobre":{"fluix":10000,"insuficient":10000,"passable":79600,"solid":268700,"excellent":4000000},'
   || '"fluix":{"fluix":10000,"insuficient":22800,"passable":182800,"solid":617100,"excellent":4388400},'
   || '"insuficient":{"fluix":10000,"insuficient":41200,"passable":329700,"solid":1112900,"excellent":7914600},'
   || '"passable":{"fluix":10000,"insuficient":65100,"passable":521000,"solid":1758500,"excellent":12505200},'
   || '"solid":{"fluix":10000,"insuficient":94600,"passable":757100,"solid":2555500,"excellent":18172500}}',
   'Guia «Coach»: preu fix per lideratge (fila) × nivell d''entrenament (columna). Un sol pagament.'),
  ('coach_preu_reconversio',
   '{"4":{"fluix":10000},"5":{"fluix":10000,"insuficient":43800},'
   || '"6":{"fluix":10000,"insuficient":35200,"passable":281600},'
   || '"7":{"fluix":10000,"insuficient":29400,"passable":235200,"solid":794100},'
   || '"8":{"fluix":10000,"insuficient":25200,"passable":200000,"solid":675000,"excellent":4800000},'
   || '"9":{"fluix":10000,"insuficient":21900,"passable":175400,"solid":592100,"excellent":4210500},'
   || '"10":{"fluix":10000,"insuficient":19500,"passable":156200,"solid":527300,"excellent":3750000},'
   || '"11":{"fluix":10000,"insuficient":17400,"passable":137900,"solid":465500,"excellent":3310200},'
   || '"12":{"fluix":10000,"insuficient":15900,"passable":125700,"solid":430000,"excellent":3100000},'
   || '"13":{"fluix":10000,"insuficient":14500,"passable":116900,"solid":394700,"excellent":2806800},'
   || '"14":{"fluix":10000,"insuficient":13100,"passable":105000,"solid":364400,"excellent":2593000},'
   || '"15":{"fluix":10000,"insuficient":12500,"passable":100000,"solid":337500,"excellent":2400000},'
   || '"16":{"fluix":10000,"insuficient":11400,"passable":91300,"solid":308200,"excellent":2191500},'
   || '"17":{"fluix":10000,"insuficient":10900,"passable":87700,"solid":296000,"excellent":2105100},'
   || '"18":{"fluix":10000,"insuficient":10000,"passable":81900,"solid":276600,"excellent":1967100},'
   || '"19":{"fluix":10000,"insuficient":10000,"passable":77500,"solid":261600,"excellent":1860300},'
   || '"20":{"fluix":10000,"insuficient":10000,"passable":69900,"solid":236000,"excellent":1678200}}',
   'Guia «Coach»: reconvertir un jugador. Clau = EXPERIÈNCIA (que fa de lideratge). Extrem alt del rang.'),
  ('coach_setmanes_minimes', '16',
   'Guia «Coach»: un jugador ha d''estar 16 setmanes al club per a poder ser reconvertit.');

-- El nivell de l'entrenador va en la SEUA escala (pobre..excel·lent), no en la d'especialistes.
-- `nivell` deia «3» sense dir de què: no volia dir res.
ALTER TABLE personal_membres ADD COLUMN coach_entrenament TEXT;   -- pobre|fluix|…|excellent
ALTER TABLE personal_membres ADD COLUMN coach_lideratge  INTEGER; -- escala 0-20, com l'experiència
UPDATE personal_membres SET coach_entrenament='passable', coach_lideratge=4, nivell=NULL
 WHERE rol='entrenador';

-- ─── 5. Fora la FÀBRICA que quedava ───────────────────────────────────────────────────
-- `fases_config` té les fases `fabrica`/`inflexio`/`competitiu` d'un model retirat a L3. La
-- fase de Miquel és `competitiva` i NO lliga amb cap: els «desquadres» de personal es
-- calculaven contra el no-res, i els checklists encara servien «Salvatella → entrenador,
-- 430.000 €», que era el paquet d'inflexió. El pla mestre va morir; això va sobreviure.
DROP TABLE IF EXISTS fases_config;
