-- Tonico — migració 109 · V2 DEL MOTOR DE RECOMANACIÓ: del monocultiu al policultiu.
--
-- Fins ara cada lloc es jutjava per UNA habilitat (`taula_habilitat_lloc`: lateral → defensa),
-- i això produïa el cas que Miquel va assenyalar: un lateral amb defensa 6 i extrem 8 aporta
-- més al lloc que un amb defensa 7 i extrem 2, però com que només miràvem la defensa,
-- proposàvem substituir el bo pel roín.
--
-- La matriu de contribucions (`taula_aportacio`, la taula «Skill contribution» del wiki) ja
-- diu amb quines habilitats i quant aporta cada posició. Només faltava fer-la servir per als
-- JUGADORS i no només per a pesar els llocs.
--
-- I ES FA SERVIR ALS DOS COSTATS ALHORA, que és el que ho fa coherent: si la tria mira tres
-- habilitats i la vara en mira una, la pantalla tria un jugador i tot seguit demana canviar-lo.
--
-- ─── LA FÓRMULA DEL SOU (wiki «Wages») ────────────────────────────────────────────────
-- Sou = base + contribució de l'habilitat PRINCIPAL + factor × la resta.
-- «Principal» és la que MÉS SOU costa, no la de nivell més alt. El factor baixa quan la
-- principal passa d'un llindar. Recerca d'usuaris, no oficial: el wiki ho avisa ell mateix.
--
-- D'ací ix la propietat que fa que tot açò valga la pena: el sou és EXPONENCIAL per nivell i
-- les secundàries només en paguen una fracció, mentre la contribució és LINEAL. Concentrar-ho
-- tot en una habilitat és sempre la manera CARA de comprar contribució. Amb els mateixos
-- diners, el perfil repartit aporta entre un 14% i un 66% més segons el lloc.
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('sou_formula',
   '{"base":250,"secundari":0.5,"secundari_alt":0.4,"llindar_alt":20300}',
   'text',
   'Sou = base + cost de l''habilitat principal (la MÉS CARA) + factor × la resta. El factor és `secundari_alt` quan la principal arriba a `llindar_alt`. Wiki «Wages»: recerca d''usuaris, no confirmada per Hattrick.');

-- ─── LES VARIANTS D'ORDRE INDIVIDUAL ──────────────────────────────────────────────────
-- La matriu porta variants per fletxa (LatD, LatcM, LatO…) i seguim en la NORMAL als sis
-- llocs. No es tria, i per dos motius: la fletxa és una decisió de PARTIT —i Tonico no
-- gestiona el partit— i, sobretot, qui guanyaria la comparació la guanyaria pel `pes_mig`,
-- que és l'únic número que ens hem inventat nosaltres. `posicio_aportacio` es queda com està.

-- ─── ELS PREUS DE REFERÈNCIA ──────────────────────────────────────────────────────────
-- La clau era el TIPUS de fitxatge («mc:9»). Amb perfils, «un mig centre de nivell 9» ja no
-- és el que es busca, i els preus declarats no corresponen a res. Es buiden: són tres files i
-- es tornen a declarar en dos minuts amb la cerca nova, que a més és més precisa.
DELETE FROM preus_referencia;
