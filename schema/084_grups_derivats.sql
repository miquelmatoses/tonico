-- Tonico — migració 084 · les alertes parlen dels GRUPS DERIVATS, no de les categories.
--
-- Les seccions de plantilla ja no ixen d'una classificació feta abans (el PAS 6: core,
-- rotatiu, titular, porter, cos) sinó de l'ASSIGNACIÓ: qui ocupa cada lloc del pla, els
-- entrenables, el futur entrenador i el porter suplent. El que no entra en cap se'n va a
-- VENDA, i si ja va eixir a subhasta sense comprador, a DESPATXAR.
--
-- Les regles filtraven per `categoria` i la pantalla ja no la gasta: Paco parlaria d'uns grups
-- i la pantalla en pintaria uns altres. Ara els dos llegixen la mateixa font.

-- L'aniversari importa dels que et quedes: l'onze i els entrenables (abans core/rotatiu).
UPDATE regles_parametres SET valor = 'onze,entrenable'
 WHERE clau = 'categories' AND regla_id = (SELECT id FROM regles WHERE codi='ALR_ANIVERSARI');

-- ELS QUE JA NO ES PODEN VENDRE. Van eixir a subhasta, ningú els va voler i ja no són
-- transferibles: no es tornen a llistar mai. Mentre estiguen cobren cada setmana sense ocupar
-- cap lloc del pla. Urgència per damunt de llistar (70): allò encara pot donar diners, açò
-- només para una fuita — i cada setmana que passa és sou perdut que no torna.
INSERT INTO regles (codi, modul, activa, ambit) VALUES ('ALR_DESPATXAR', 'plantilla', 1, 'global');
INSERT INTO regles_parametres (regla_id, clau, valor, tipus) VALUES
  ((SELECT id FROM regles WHERE codi='ALR_DESPATXAR'), 'urgencia', '72', 'int');
