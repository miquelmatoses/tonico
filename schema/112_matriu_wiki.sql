-- Tonico — migració 112 · la matriu d'aportació, fidel al wiki.
--
-- La 109 va posar la matriu al centre del motor: ara decidix qui juga, quin perfil compra cada
-- lloc i contra què es mesura l'ocupant. Amb el monocultiu era només un repartidor de
-- pressupost i un error de transcripció no es notava; ara mou totes les decisions, així que
-- s'ha comprovat cel·la a cel·la contra les DUES taules del wiki, llegides del DOM i no del
-- text aplanat (les columnes no van en l'ordre que diu la capçalera, i l'ordre canvia segons
-- el bloc — vore la 110).
--
-- Divuit files de vint quadraven exactes, incloses les quatre variants de lateral: `Lat` és el
-- wing back NORMAL (92/38/15/59), que era el que més por feia.
--
-- ─── EL MIG CENTRE ATACA PER LA BANDA AMB LES PASSADES, NO AMB L'ANOTACIÓ ──────────────
-- «Skill contribution»:  IM → + Side attk 26% his PA (if left/right)
-- «Contribution»:        el 0,028 de l'Inner midfielder cau a la columna Side Attacks–Passing.
-- Nosaltres teníem `AL#Anot`. `MigcB` (l'IM cap a la banda) ja ho tenia bé amb `AL#Pas 0.31`,
-- que és el que fa evident que era una relliscada de columna i no una lectura distinta.
--
-- Afecta `Mig`, `MigD` i `MigO`; només `Mig` es gasta (les variants es queden en NORMAL), i és
-- el lloc que més pesa i el que entrenem. Amb la correcció, l'anotació d'un mig centre passa
-- del 12,3 al 5,7 per cent del seu valor al lloc i les passades del 8,5 al 15,1: amb el mateix
-- total d'habilitats, ara guanya el passador i abans guanyava el rematador.
--
-- ─── I EL DAVANTER NORMAL ─────────────────────────────────────────────────────────────
-- Wiki: Cen attk 100 per cent SC i 36,9 PA · Side attk 22,1 SC, 18 WG, 12,1 PA.
-- Teníem 0,33 · 0,27 · 0,24 · 0,14. Les altres tres files de davanter (Fd, TdF, Ftw) quadraven
-- exactes, o siga que era esta i prou.
--
-- I ES CONTRADEIA AMB NOSALTRES MATEIXOS: la 110 diu haver mesurat l'atac central del davanter
-- en 0,179, que és 0,066/0,369 — el número del wiki. Amb el 0,33 que teníem desat done 0,200.
-- Les dues fonts nostres no deien el mateix de la mateixa cel·la.
--
-- ─── `pesos_sector` NO ES TOCA ────────────────────────────────────────────────────────
-- Refeta la mesura sencera amb la matriu ja corregida i amb les columnes alineades: 90 cel·les
-- de 18 posicions, contra les 28 de sis posicions de la 110. Ix
--   defensa_central 0,190 (13 cel·les de dispersió 12 per cent) · defensa_banda 0,285 (9)
--   mig 0,146 (16) · atac_central 0,181 (10) · atac_banda 0,226 (14)
-- Els cinc cauen dins de la dispersió que la 110 ja declarava: la mesura aguanta amb tres
-- vegades més mostra. Canviar-la seria moure tots els números del sistema per soroll.
-- [l'IM ofensiu queda fora de la mesura: la seua fila de coeficients és idèntica a la del
--  defensiu excepte l'última cel·la, i els seus percentatges no s'hi assemblen gens. És un
--  copiar-i-apegar del wiki, no una dada]
INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('taula_aportacio',
   '{"Por":{"DC#Por":0.87,"DC#Def":0.35,"Lat#Por":0.61,"Lat#Def":0.25},"DC":{"Mig#Cre":0.25,"DC#Def":1,"Lat#Def":0.52},"DCcB":{"Mig#Cre":0.15,"DC#Def":0.67,"Lat#Def":0.81,"AL#Ext":0.26},"DCO":{"Mig#Cre":0.4,"DC#Def":0.73,"Lat#Def":0.4},"Lat":{"Mig#Cre":0.15,"DC#Def":0.38,"Lat#Def":0.92,"AL#Ext":0.59},"LatD":{"Mig#Cre":0.1,"DC#Def":0.43,"Lat#Def":1,"AL#Ext":0.45},"LatcM":{"Mig#Cre":0.2,"DC#Def":0.7,"Lat#Def":0.75,"AL#Ext":0.35},"LatO":{"Mig#Cre":0.2,"DC#Def":0.35,"Lat#Def":0.74,"AL#Ext":0.69},"Mig":{"Mig#Cre":1,"DC#Def":0.4,"Lat#Def":0.19,"AC#Anot":0.22,"AC#Pas":0.33,"AL#Pas":0.26},"MigO":{"Mig#Cre":0.95,"DC#Def":0.16,"Lat#Def":0.09,"AC#Anot":0.31,"AC#Pas":0.49,"AL#Pas":0.36},"MigD":{"Mig#Cre":0.95,"DC#Def":0.58,"Lat#Def":0.27,"AC#Anot":0.13,"AC#Pas":0.18,"AL#Pas":0.14},"MigcB":{"Mig#Cre":0.9,"DC#Def":0.33,"Lat#Def":0.24,"AC#Pas":0.23,"AL#Ext":0.59,"AL#Pas":0.31},"Ext":{"Mig#Cre":0.45,"DC#Def":0.2,"Lat#Def":0.35,"AC#Pas":0.11,"AL#Ext":0.86,"AL#Pas":0.26},"ExtO":{"Mig#Cre":0.3,"DC#Def":0.13,"Lat#Def":0.22,"AC#Pas":0.13,"AL#Ext":1,"AL#Pas":0.29},"ExtcM":{"Mig#Cre":0.55,"DC#Def":0.25,"Lat#Def":0.29,"AC#Pas":0.16,"AL#Ext":0.74,"AL#Pas":0.15},"ExtD":{"Mig#Cre":0.3,"DC#Def":0.25,"Lat#Def":0.61,"AC#Pas":0.05,"AL#Ext":0.69,"AL#Pas":0.21},"DavN":{"Mig#Cre":0.25,"AC#Anot":1,"AC#Pas":0.369,"AL#Ext":0.18,"AL#Pas":0.121,"AL#Anot":0.221},"DD":{"Mig#Cre":0.35,"AC#Anot":0.56,"AC#Pas":0.53,"AL#Ext":0.13,"AL#Pas":0.31,"AL#Anot":0.13},"DDT":{"Mig#Cre":0.35,"AC#Anot":0.56,"AC#Pas":0.53,"AL#Ext":0.13,"AL#Pas":0.41,"AL#Anot":0.13},"DcB":{"Mig#Cre":0.15,"AC#Anot":0.66,"AC#Pas":0.23,"AL#Ext":0.64,"AL#Pas":0.21,"AL#Anot":0.51}}',
   'text',
   'Aportació de cada habilitat als sectors de qualificació, per posició i orde individual. Font: wiki de Hattrick, «Skill contribution» (percentatges), verificada cel·la a cel·la contra «Contribution» (coeficients) el 2026-07-29.');
