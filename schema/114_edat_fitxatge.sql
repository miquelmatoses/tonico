-- Tonico — migració 114 · el fitxatge porta EDAT, i l'edat mou el sou.
--
-- Fins ara el perfil objectiu deia QUÈ buscar i callava QUI. I l'edat no és un detall: a
-- Hattrick el sou baixa un 10% cada any des dels 29, o siga que el MATEIX diner compra un
-- jugador molt millor si el busques major.
--
-- ─── EL DESCOMPTE ─────────────────────────────────────────────────────────────────────
-- Wiki «Wages»: als 28 es paga la tarifa sencera i des dels 29 es perd un 10% per any fins al
-- 37; dels 38 en avant ja no baixa més. S'aplica el dia de l'aniversari.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('descompte_sou_edat',
   '{"28":1.0,"29":0.9,"30":0.8,"31":0.7,"32":0.6,"33":0.5,"34":0.4,"35":0.3,"36":0.2,"37":0.1}',
   'text',
   'Factor sobre el sou de catàleg segons l''edat. Wiki de Hattrick «Wages»: −10% per any des dels 29 fins al 37. Per davall de 28 val 1,0; a partir de 38 es queda en el valor del 37.');

-- ─── QUINA EDAT ES BUSCA ──────────────────────────────────────────────────────────────
-- POLÍTICA, no càlcul: el motor sempre diria «el més vell possible», perquè la caiguda
-- d'habilitat és molt més lenta que el descompte de sou. Amb la recerca de Schum a la mà, un
-- defensa de 37 perd 0,84 nivells per temporada i costa deu vegades menys — cap horitzó
-- raonable ho compensa. Els tres costos que ho farien són justament els que el sistema no
-- modela: el que costa reposar-lo (no estimem preus a posta), les lesions (als 33 es recupera
-- a la meitat de velocitat que als 24) i la revenda.
--
-- Per això el número el posa Miquel, com `reserva_flux_pct` o `quota_personal`. 32 deixa la
-- pèrdua per davall de 0,32 nivells per temporada a l'habilitat que més cau (anotació) i
-- encara no entra al tram on les lesions s'eternitzen.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'edat_fitxatge_max', '32', 'int');

-- ─── EXCEPTE ELS LLOCS QUE ENTRENEN ───────────────────────────────────────────────────
-- Als mig centres i extrems no es compra un vell: es fabrica. Un jugador que entra als 17 amb
-- el llistó d'entrenable i entrena sense parar arriba a creativitat ~19,6 cap als 30 i s'hi
-- queda —el que entrena i el que perd s'igualen—, mentre que el pressupost, per molt descompte
-- que li pose, no passa de 9. No és «un poc millor»: és una altra categoria.
--
-- Per tant en eixos llocs l'edat NO és una política: és la que trau la corba d'entrenament.
-- Si el perfil demana creativitat 8, es busca de 18 anys; si en demana 11, de 19. El més jove
-- que ja hi arriba, que és el que encara té recorregut per a entrenar.
-- Això no és cap número nou: ix de `velocitat()` amb l'entrenador i els assistents que tens.

-- ─── I ELS ENTRENABLES, SEMPRE 17 ─────────────────────────────────────────────────────
-- La finestra era 17-18. Amb la corba al davant no té sentit pagar per un any de recorregut
-- menys: als 17 amb el llistó arriba a ~19,6 i als 18 ja ha gastat una temporada de les bones
-- (el tram 17-22 és la meitat del camí).
UPDATE plantilles_parametres SET valor='17' WHERE plantilla='competitiva' AND clau='compra_edat_max';
