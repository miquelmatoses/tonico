-- Tonico — migració 090 · fora la classificació desada.
--
-- `categories_jugador` era ESTAT DERIVAT EN TAULA: el grup d'un jugador (core, rotatiu,
-- titular, porter, cos, venda) es calculava una vegada i es desava. I com que només s'hi
-- inseria fila quan CANVIAVA el rol, qui es quedava al mateix rol arrossegava per sempre el
-- que s'hi haguera escrit —o el buit, si es va escriure abans que existira la puntuació.
-- A més sobrevivia al jugador: files de gent que ja no era a la plantilla filtraven cap a
-- les pantalles.
--
-- Ara el grup ix de l'assignació d'estructura cada volta que es mira, i no es desa enlloc.
--
-- `intercanvis` era el mecanisme «actua, informa, desfés» d'eixa classificació: quan el
-- reparador desplaçava algú d'una plaça, ho apuntava perquè es poguera desfer. Sense
-- classificació no hi ha desplaçaments que desfer.
--
-- El PAS 6 del contracte ja no diu «qui es queda» sinó «qui ocupa cada lloc»; `plantilles_-
-- categories` ES QUEDA, que és on viu la fórmula de puntuació de venda i l'aforament del
-- futur entrenador — configuració, no estat derivat.
DROP INDEX IF EXISTS ix_categories_jugador;
DROP TABLE IF EXISTS categories_jugador;
DROP INDEX IF EXISTS ix_intercanvis_usuari;
DROP TABLE IF EXISTS intercanvis;
