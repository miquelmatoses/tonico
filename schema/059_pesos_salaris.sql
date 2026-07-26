-- L4 · PESOS I NIVELL OBJECTIU (contracte v3, PAS 2 i PAS 4)
--
-- Tots els números d'este fitxer ixen de la guia del joc. Cap és inventat:
--   `taula_aportacio`  ← guia §4 «Taula d'aportació relativa» (20 posicions × 10 sectors)
--   `pes_central` / `pes_banda` ← guia §5 «Distribució de les ocasions normals»
--                                  (pel mig 36,0% · per cada costat 25,5%)
--   `taula_salaris`    ← guia §8 «Salaris dels jugadors (mínims per nivell, €)»
--                        Nivells 1..16 = Insuficient..Diví, com l'escala d'habilitats.
--                        Creativitat i Anotació no publiquen el nivell 16 (Diví).
--
-- L'ÚNIC pom no calibrat és `pes_mig`: la guia no publica quant pesa el mig camp contra
-- els sectors, només que decidix QUI té l'ocasió. Va declarat i etiquetat com a tal.

INSERT OR REPLACE INTO constants_joc (clau, valor, tipus, nota) VALUES
  ('taula_aportacio', '{"Por":{"DC#Por":0.87,"DC#Def":0.35,"Lat#Por":0.61,"Lat#Def":0.25},"DC":{"Mig#Cre":0.25,"DC#Def":1.0,"Lat#Def":0.52},"DCcB":{"Mig#Cre":0.15,"DC#Def":0.67,"Lat#Def":0.81,"AL#Ext":0.26},"DCO":{"Mig#Cre":0.4,"DC#Def":0.73,"Lat#Def":0.4},"Lat":{"Mig#Cre":0.15,"DC#Def":0.38,"Lat#Def":0.92,"AL#Ext":0.59},"LatD":{"Mig#Cre":0.1,"DC#Def":0.43,"Lat#Def":1.0,"AL#Ext":0.45},"LatcM":{"Mig#Cre":0.2,"DC#Def":0.7,"Lat#Def":0.75,"AL#Ext":0.35},"LatO":{"Mig#Cre":0.2,"DC#Def":0.35,"Lat#Def":0.74,"AL#Ext":0.69},"Mig":{"Mig#Cre":1.0,"DC#Def":0.4,"Lat#Def":0.19,"AC#Anot":0.22,"AC#Pas":0.33,"AL#Anot":0.26},"MigO":{"Mig#Cre":0.95,"DC#Def":0.16,"Lat#Def":0.09,"AC#Anot":0.31,"AC#Pas":0.49,"AL#Anot":0.36},"MigD":{"Mig#Cre":0.95,"DC#Def":0.58,"Lat#Def":0.27,"AC#Anot":0.13,"AC#Pas":0.18,"AL#Anot":0.14},"MigcB":{"Mig#Cre":0.9,"DC#Def":0.33,"Lat#Def":0.24,"AC#Pas":0.23,"AL#Ext":0.59,"AL#Pas":0.31},"Ext":{"Mig#Cre":0.45,"DC#Def":0.2,"Lat#Def":0.35,"AC#Pas":0.11,"AL#Ext":0.86,"AL#Pas":0.26},"ExtO":{"Mig#Cre":0.3,"DC#Def":0.13,"Lat#Def":0.22,"AC#Pas":0.13,"AL#Ext":1.0,"AL#Pas":0.29},"ExtcM":{"Mig#Cre":0.55,"DC#Def":0.25,"Lat#Def":0.29,"AC#Pas":0.16,"AL#Ext":0.74,"AL#Pas":0.15},"ExtD":{"Mig#Cre":0.3,"DC#Def":0.25,"Lat#Def":0.61,"AC#Pas":0.05,"AL#Ext":0.69,"AL#Pas":0.21},"DavN":{"Mig#Cre":0.25,"AC#Anot":1.0,"AC#Pas":0.33,"AL#Ext":0.24,"AL#Pas":0.14,"AL#Anot":0.27},"DD":{"Mig#Cre":0.35,"AC#Anot":0.56,"AC#Pas":0.53,"AL#Ext":0.13,"AL#Pas":0.31,"AL#Anot":0.13},"DDT":{"Mig#Cre":0.35,"AC#Anot":0.56,"AC#Pas":0.53,"AL#Ext":0.13,"AL#Pas":0.41,"AL#Anot":0.13},"DcB":{"Mig#Cre":0.15,"AC#Anot":0.66,"AC#Pas":0.23,"AL#Ext":0.64,"AL#Pas":0.21,"AL#Anot":0.51}}', 'text',
   'Guia §4: aportació relativa de cada posició a cada sector de qualificació.'),
  ('taula_salaris', '{"porteria":{"1":610,"2":830,"3":1150,"4":1590,"5":2250,"6":3170,"7":4530,"8":6450,"9":9150,"10":12910,"11":18050,"12":24150,"13":31480,"14":40930,"15":52990,"16":68210},"defensa":{"1":250,"2":270,"3":310,"4":450,"5":730,"6":1290,"7":2310,"8":4070,"9":6930,"10":11450,"11":18270,"12":26840,"13":38310,"14":54160,"15":75730,"16":129150},"creativitat":{"1":250,"2":270,"3":330,"4":510,"5":850,"6":1550,"7":2830,"8":5030,"9":8610,"10":14250,"11":22370,"12":32450,"13":46640,"14":66330,"15":93180},"passades":{"1":250,"2":250,"3":290,"4":390,"5":590,"6":970,"7":1690,"8":2930,"9":4930,"10":8090,"11":12870,"12":19910,"13":28200,"14":39440,"15":54680,"16":75100},"extrem":{"1":250,"2":250,"3":290,"4":370,"5":550,"6":890,"7":1530,"8":2630,"9":4430,"10":7250,"11":11510,"12":17810,"13":25650,"14":35720,"15":49380,"16":67660},"anotacio":{"1":250,"2":270,"3":330,"4":470,"5":790,"6":1430,"7":2570,"8":4550,"9":7770,"10":12830,"11":20490,"12":29650,"13":42480,"14":60240,"15":84470}}', 'text',
   'Guia §8: salari mínim per habilitat i nivell (1=Insuficient .. 16=Diví).');

INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'pes_central', '0.36',  'float'),   -- guia §5: 36,0% de les ocasions pel mig
  ('competitiva', 'pes_banda',   '0.255', 'float'),   -- guia §5: 25,5% per cada costat
  ('competitiva', 'pes_mig',     '1.0',   'float');   -- NO CALIBRAT: la guia no el publica

-- Quina habilitat mira cada lloc (PAS 4). Es deriva del mateix §4 + buckets_alineacio:
-- cada lloc es jutja per l'habilitat amb què més aporta.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'taula_habilitat_lloc',
   '{"porter":"porteria","defensa":"defensa","lateral":"defensa","mc":"creativitat","extrem":"extrem","davanter":"anotacio"}',
   'text');

-- Quina posició de la guia §4 representa cada lloc de la formació. Sense este pont, el
-- pes d'un lloc no es pot llegir de la matriu.
INSERT OR REPLACE INTO plantilles_parametres (plantilla, clau, valor, tipus) VALUES
  ('competitiva', 'posicio_aportacio',
   '{"porter":"Por","defensa":"DC","lateral":"Lat","mc":"Mig","extrem":"Ext","davanter":"DavN"}',
   'text');
