-- Tonico — migració 016: polit #2.
-- Punt 1: baixa el llindar d'intercanvi perquè el desafiament del 8é lloc
-- (p.ex. Cătuneanu 6.0 vs Balagueró 5.5, diferència 0.5) es propose com a
-- decisió pendent en compte de quedar silenciat. El fre anti-soroll de rebuig
-- segueix vigent (memòria de la diferència al rebutjar).
UPDATE plantilles_parametres SET valor='0.25'
 WHERE plantilla='fabrica' AND clau='llindar_intercanvi';
