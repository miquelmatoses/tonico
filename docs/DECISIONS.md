# Tonico — registre de decisions (mode autònom)

## 2026-07-22 · MOTOR D'ENTRENAMENT SÈNIOR GENERAL (triable per l'usuari)
**Autoritzat per Miquel.** Migració 053.
- **El problema:** l'entrenament sènior estava **cablejat** a la fàbrica (creativitat → MC 100%,
  extrems 50% escrit a mà a la formació). Canviar l'entrenament no canviava res.
- **La solució:** l'usuari **tria** l'entrenament sènior (selector a Personal → pla
  `entrenament_senior`, per defecte el que prescriu la fase) i **tot es deriva**: quines
  posicions entrenen, a quin %, la cobertura, les alineacions i els anells del camp.
- **Font de mecànica (guia):** `taula_entrenament` és el mapa **100%** (habilitat → buckets);
  nova constant `taula_entrenament_baix` és el mapa **50%** (efecte baix, **guia §6**: «extrems
  entrenant creativitat i defensors laterals entrenant extrem»). `lib/entrenament_places.js`:
  `placesEntrenament(skill)` → `{bucket: pct}`, `aplicaEntrenament(slots, places)`.
- **Cascada:** l'alineador (`lib/alineacio.js`) ja **no** cabla `extrem`/`mc`: els buckets al
  **50% doblen** (els dos partits), els del **100%** juguen un partit — derivat del `pct` del slot.
  `orquestra_alineacio`, `orquestra_alertes` (cobertura) i `functions/api/vendes` apliquen la
  derivació. L'anell del camp ja llegix el `pct`, així que s'adapta sol.
- **Verificat:** `test/entrenament_places.mjs` — creativitat→objectiu 8, defensa→6; amb defensa
  entrenen els DEFENSES i cap MC; l'override del pla mana sobre la fase.
- **Ceiling (ponytail):** la guia §6 només nomena eixos dos casos de 50%; rates fines per posició
  (p.ex. passades a diferents ritmes) no s'hi detallen i no es modelen. La **puntuació de
  l'entrenable per habilitat** (què val un jugador segons l'entrenament triat) segueix sent la
  del `classificador` i **no** es re-pondera amb l'entrenament — seria una doctrina a banda.

## 2026-07-22 · CORRECCIÓ: RETENCIÓ PER VALOR + CAS (c) DELS MARGES
**Autoritzat per Miquel.** Migració 052.
- **1 LA RETENCIÓ MINIMITZA VALOR RENUNCIAT, NO SOU** — els retinguts pel mínim de camp
  són els de **menor valor de venda** (estimació, i puntuació de reserva); el **sou només
  desempata**. Un cos d'**alliberament/despatx** és **coixí preferent** abans de retindre cap
  actiu amb valor. Tests: amb un cos sense valor, cap actiu alt queda retingut.
- **2 CAS (c) DELS MARGES — BUG D'ARREL A `valorHabilitat`** — l'error NO era a la fórmula del
  guany de plaça (`alineacio_juvenil.marge`, que ja era correcta) sinó al **NIVELL**
  (`ranquing_juvenil.valorHabilitat`): amb actual desconegut retornava `valor_esperat_desconegut`
  **ignorant un potencial conegut** → un potencial ALT valia igual que un total desconegut
  (marge 0, com si estiguera capat). Ara: `esperat = min(valor_esperat_desconegut, potencial)` i
  valor = `esperat + (potencial − esperat)·f_marge` (8 → 6,5 vs 5). Propietat nova: el potencial
  conegut alt val més que el desconegut, **guanya la plaça del seu component** i no va a estructura;
  i un potencial conegut BAIX val **menys** que el desconegut.
- **3 UNA SOLA FONT DE «LLISTABLE ARA»** (`lib/liquidacio.js`) — `llistable = venda − llistats −
  lesionats − retinguts per cobertura`. L'alerta agregada i les marques de les fitxes ixen del
  **mateix conjunt**; l'agregada cobrix **tot** el conjunt (els urgents del dia D es destaquen a
  banda però hi són dins). Test: recompte i sou total de l'alerta = files marcades llistables.
- **4 FORA LES MARQUES DE BUFFER** («cobrix X — ven-lo l'últim»): doctrina morta. Els únics
  estats d'una fitxa són **llistat / llistable ara / retingut per cobertura (amb el càlcul) /
  lesionat (llistable en recuperar)**. Netejats i18n (`vendes.cobreix`, `vendes.lliure`) i codi.
- **5 EL DESPLAÇAT SEMPRE AMB PUNTUACIÓ I CÀLCUL** — **arrel** de la 3a reaparició del bug de
  punts buits: `alliberament` era l'**única categoria sense spec de `puntuacio`**, així que el
  derivador tornava null i la fila queia al valor desat (null). No era la vista: era una categoria
  **sense vara de mesurar**. Migració 052 li dona la mateixa vara que la venda. Test de regressió
  `punts_totes_categories.mjs`: **cap categoria sense spec** i cap recategorització sense punts.
  Si la porta de calibratge bloqueja el valor net, la fila ho diu («pendent de calibratge»).
- **6 ETIQUETA MIXTA A L'ONZE JUVENIL** — una plaça pot **entrenar** una habilitat coneguda **i
  descobrir-ne** una altra: motiu `mixt` («entrena X · descobriment de Y») i compta a les **dues**
  columnes de la capçalera. Corregix el «0 entrenant» amb el millor conegut jugant d'MC.

## 2026-07-22 · FORA L'APARADOR + PLANTILLA DERIVADA DE L'ENTRENAMENT
**Autoritzat per Miquel.** Doctrina de liquidació, fase 2. Migració 051.
- **1 FORA L'APARADOR** — s'elimina el concepte sencer (prioritat de venda a l'alineador,
  motius «aparador», i18n, glossari). Tres regles i prou:
  **(a)** el **LLISTAT no juga MAI** (protecció de l'actiu): ni apareix a l'alineació — la
  fitxa de venda ja diu que està llistat. Estat únic: fitxa `llistat` **o** `Transferible=1`.
  **(b)** L'alineació = **entrenables** (pels seus blocs) + **futur entrenador**
  (experiència) + **farciment** per als llocs restants. Cap altra prioritat — cau també la
  col·locació per obligació de minuts de la Junta (l'alerta ja avisa; la decisió és de l'usuari).
  **(c)** El **doblatge de farciment es repartix**: cada buit se l'emporta el cos que menys
  partits porta, així ningú dobla si hi ha prou per a alternar. Derivat de comptar, no d'una llista.
- **2 COBERTURA MÍNIMA v2 — DERIVADA DE L'ENTRENAMENT** (`lib/cobertura.js`, pur):
  · **entrenables_objectiu** = Σ(pct/100 de les places `entrena`) × nombre de rols. El «8»
  **emergix** de la config actual — (3 MC×100% + 2 EXT×50%) = 4 per partit × 2 rols — i ja
  no està escrit enlloc; `ALR_NUCLI_INCOMPLET` el pren d'ací (el pom queda de reserva).
  · **plantilla mínima** = entrenables + futur entrenador + `porters_minims` (pom, 2) +
  `camp_minim` (llocs que no entrenen ni són de porteria − futur entrenador + `marge_absencies`,
  pom 2). Cas actual: 8 + 1 + 2 + 6 = **17**.
  · **(2c) La liquidació respecta la cobertura:** cap alerta de llistar per a un cos que el
  mínim necessita; es retenen els **més barats** (el cos barat es queda, el valuós es ven) i el
  càlcul és **visible** a Vendes: «es queda — cobertura mínima: N de camp».
  · **(2d)** Tests amb **dos entrenaments distints** (creativitat→8/camp 6/total 17;
  defensa→10/camp 7/total 19): places i mínims emergixen de la config, res cablejat.
- **3 MILLORA FUTURA (NO implementada)** — **recomanador d'entrenament**: quin entrenament
  maximitza €/setmana del pla (capacitat de places × valor de mercat de les habilitats que
  entrena − sous). **Bloquejat esperant el calibratge de mercat amb vendes reals**
  (`mercat_modificadors_calibrats='no'`); sense preus propis, la funció objectiu no té unitats
  fiables. Quan hi haja mostra, es reobri.

## 2026-07-22 · AGREGACIÓ DE LA LIQUIDACIÓ + estat llistat derivat (reforç)
**Autoritzat per Miquel.** Continua l'ordre del 2026-07-21 (derivació de Transferible).
- **3a robustesa** — `ALR_LLISTAR_VENDA` filtra ara **directament** `transferible !== 1` (a més
  de `vendes_llistades`): un Transferible=1 ja està fet, mai dispara l'acció de llistar, encara
  que la sincronització de la fitxa vaja un pas per darrere.
- **4 AGREGACIÓ** — els «per llistar hui» **sense rellotge d'urgència** es presenten com **UNA
  alerta agregada** (`alerta.llistar_agregat_1`/`_n`: «N jugadors de venda sense llistar — sou
  total X €/setm»), amb el detall a Vendes — **mateixa medicina** que les revelacions i el
  fora-de-pipeline. Els **urgents del dia D** (aniversari / porter notable) segueixen **destacats
  a banda** com a alertes individuals; el lesionat manté el seu avís d'ajornament. `sou_total`
  es formata a diners al render (DINERS_ALERTA). Guardià: base plural `alerta.llistar_agregat`.
- **Verificació a prod (propietat)** — cap alerta de llistar per a cap jugador amb Transferible=1
  a la instantània vigent, i totes les seues fitxes mostren *llistada + tancament previst*
  (`transf1_no_llistat=0`, `alertes_llistar_sobre_transf1=0`). *La instantània vigent (2026-07-22)
  era anterior al desplegament de `derivaLlistat`, així que 4 venda-llistats (Transferible=1) no
  tenien fitxa i arrossegaven alertes velles de llistar. S'ha aplicat a mà la MATEIXA derivació
  que fa `desar` en pujar (INSERT fitxa 'llistat' + resolució de les alertes velles); a la pròxima
  pujada el pipeline ho fa sol.*

## 2026-07-22 · CORRECCIÓ POST-AUDITORIA #1 (piles A + neteja C)
**Autoritzat per Miquel.** Deriva de [`AUDITORIA_2026-07-22.md`](AUDITORIA_2026-07-22.md). Migració 050.
- **1 UN CONCEPTE, UN LLINDAR** — «porter notable» = **7** pertot, amb **font única**
  `porter_notable_min` (constant, guia §2/§17). Fora el `porteria_deprecia=6` d'ALR_LLISTAR_VENDA
  i el `porteria_min` d'ALR_JUNTA_PORTER / ALR_DEPRECIACIO_MECANICA: ara totes dues regles
  referencien `ctx.porter_notable_min`. PRINCIPIS §4 corregit (6→7). Test: el mateix llindar
  governa Junta i depreciació (canviar-lo mou les dues); cap regla el redefinix.
- **2 EXEMPCIONS DE LA JUNTA** (guia §17) — `ALR_JUNTA_PORTER` exempta de retenció: **nouvingut**
  (`setmanes_club<2`, cobrix «acabat de promocionar»), **ex-juvenil de la casa**
  (`bonificacio_origen=1`) i **lesionat** (les lesions no compten). Test per exempció. *Ceiling
  (ponytail): `bonificacio_origen` marca «de la casa» com a proxy de promocionat de l'acadèmia.*
- **3 NETEJA DE LLEGAT** — **9 claus i18n mortes** fora (ca+en), inclosa la d'«esperar per forma»
  (contradeia la liquidació). PRINCIPIS §5 → NIVELL continu (no G1-G5). `veu-paco` amb exemples de
  regles VIVES (`ALR_LLISTAR_VENDA` en lloc del retirat `ALR_ENTRENABLE_SENSE_MINUTS`; aniversari com
  a FET d'entrenable). Pom `ALR_ANIVERSARI.categories` **cablejat** a `entrenable` (el codi ja excloïa
  venda). `juvenil_bo_min` **eliminat** (constant morta, cap ús; el rànquing és NIVELL continu).
- **4 GUARDIÀ DE CLAUS ÒRFENES** — el guardià i18n ara falla si una clau `alerta.*`/`agenda.*` del
  catàleg no s'emet enlloc (`test/i18n_guardia.mjs`, secció 5; llista `EXCEPCIONS_ORFENES` buida).
- **5 GENERALITAT (matís sobre §4)** — el principi governa **codi i tests**, no dades: els noms a
  CONFIG/BD (`fases_config`, `plans`, CSV) són **dades d'usuari legítimes i ES QUEDEN**. Retirats els
  noms reals de `lib/fornades.js` (comentari) i de tests (fixtures sintètics). PRINCIPIS §4 reescrit.
- **6 CALENDARI DE MERCAT** — direcció confirmada (devblog oficial: preus baixos a final de temporada),
  però **magnituds no calibrades**: constant `mercat_modificadors_calibrats='no'` com a etiqueta
  llegible. **Pla de calibratge:** a partir d'esta setmana (2026-07-22) es recullen preus de venda
  propis per setmana de temporada; quan hi haja mostra suficient, ajustar `calendari_mercat` als
  marges reals observats i posar la constant a `sí`.

## 2026-07-21 · DOCTRINA DE LIQUIDACIÓ — EL VALOR NO ESPERA
**Autoritzat per Miquel.**
- **1 Fora la «finestra òptima de llistat» com a fre** (i CAP rotació/pressió de minuts): un
  jugador de venda (no entrena, no és estructura) només es deprecia (sou + edat). Política per
  defecte = **LLISTAR IMMEDIATAMENT**. Nova regla `ALR_LLISTAR_VENDA` (migració 049); la
  recomanació d'aniversari-venda i l'agenda de depreciació queden **retirades/plegades**
  (`ALR_ANIVERSARI` ara només l'entrenable = fet; `ALR_DEPRECIACIO_MECANICA` desactivada).
- **2 Únics ajornaments (derivats, mecànics):** (a) **lesionat** → llistar quan es recupere;
  (b) el tancament cauria en **depressió PROFUNDA** (modificador ≤ pom) **I** cap rellotge
  d'urgència apreta (aniversari a la vora / depreciació mecànica: porter notable) → esperar COM
  A MOLT fins al primer tancament FORA de depressió. En recuperació o mercat ple: MAI s'espera.
- **3 Alerta d'HUI:** tota venda no llistada sense ajornament legítim → «llista'l — cada setmana
  són {sou} de sou i un dia més d'edat que perd. El valor no espera.» (`test/regles.mjs`.)
- **4 L'aparador** seguix la regla simple existent (llistats amb subhasta activa juguen si hi ha
  plaça; la resta per valor) — cap sistema de rotació. **5 Els no venuts** seguixen el flux ja
  definit (rebaixar/rellistar/despatxar/1€ override); mai tornen a la cua d'espera.


## 2026-07-21 · DERIVACIÓ DE L'ESTAT LLISTAT (columna Transferible del CSV)
**Autoritzat per Miquel.**
- La ingesta (`desar`, només sènior) crida `derivaLlistat` (`lib/llistat.js`) i deriva l'estat
  de la fitxa de venda de la columna **Transferible** (1/buit): **apareix 1** → marca LLISTADA
  amb **data estimada = data de la instantània on apareix per primera vegada** (el tancament
  previst = data + `dies_subhasta` el calcula el GET); **persistix** → es queda llistada (la data
  NO es reescriu cada setmana; respecta els estats terminals venut/desert/despatxat); la data és
  **EDITABLE** per l'usuari (fitxa de venda) si la llistada real va ser un altre dia.
- **Desapareix** (transferible buit) mentres estava LLISTADA i **sense venda apuntada** →
  `resultat_pendent` (columna nova, migració 048): la fitxa mostra la pregunta bona «**la subhasta
  ha acabat: deserta o venut? apunta el resultat a Estat**». En desar l'estat, es neteja la marca.
- Test sintètic de les TRES transicions (apareix / persistix / desapareix) + editabilitat de la
  data (`test/llistat.mjs`).


## 2026-07-21 · MARGES ESPERATS CONDICIONALS (correcció de la fórmula del guany)
**Autoritzat per Miquel.**
- **1 El guany esperat CONDICIONA sobre el coneixement** (substituïx el marge esperat únic),
  a `lib/alineacio_juvenil.js` `marge()`: (a) actual conegut + potencial desconegut → marge
  esperat PLE (potencial ≥ actual); (b) tot desconegut → potencial esperat (pom
  `nivell_potencial_esperat`, migració 047) − actual esperat (acadèmia autocalibra) → MENOR
  que (a); (c) **actual desconegut + potencial conegut** (cas nou) → potencial − min(esperat,
  potencial) → amb potencial baix, guany ~0; (d) tots dos coneguts → marge real (capat = 0).
- **2 Propietats d'assignació** (`test/juvenil_v2.mjs`): (a) un actual BO conegut no capat rep
  la plaça del seu component ABANS que qualsevol totalment desconegut — la doctrina «conegut bo
  mana» EMERGIX del càlcul, sense regla especial; (b) cap potencial conegut baix ocupa la plaça
  d'eixe component mentres un de potencial esperat major queda fora; (c) la banqueta és el de
  menys a perdre (mínim guany esperat + nivell).
- **3 Concordança gramatical:** «desconeguda» (una habilitat) vs «desconegudes» (dues) al motiu
  de descobriment, a les dues llengües (via `tp()` pel nombre d'habilitats).


## 2026-07-21 · EL GUANY DE PLAÇA USA ELS COMPONENTS DE LA PLAÇA
**Autoritzat per Miquel.**
- **1 Causa arrel:** el CÀLCUL del guany (`valorEntrenable`) ja usava els COMPONENTS reals de
  cada plaça (`valPlaça[bucket]` → una plaça només-B es calcula EXCLUSIVAMENT amb B). El bug era
  el TEXT: el motiu portava sempre `principal` (=entrenament A). Corregit: el motiu anomena
  la/les habilitats que la plaça entrena de veritat (derivades de valPlaça). (`lib/alineacio_juvenil.js`.)
- **2 Desempat de descobriment:** entre candidats amb guany esperat IGUAL per a una plaça amb
  component desconegut, mana la DATA DE PROMOCIÓ més pròxima (urgència), mai l'orde d'iteració.
- **3 Tests d'ASSIGNACIÓ** (no sols de fórmula, `test/juvenil_v2.mjs`): (a) plaça només-B — un
  desconegut de B guanya la plaça a un B conegut mínim (loteria > bitllet ratllat, a nivell
  d'assignació) i el motiu diu «passades» (l'habilitat real); (b) plaça amb component A — entre
  desconeguts iguals, la promoció més pròxima; (c) cap guany menor ocupa plaça entrenable mentres
  un de guany major és a estructura.
- **4 Pluralització:** helper `tp(base, n)` → `base_1`/`base_n`; comptadors amb formes
  singular/plural (`resum_juvenil`, `onze_tot_entrena`). Guardià ampliat: cada base plural té les
  dues formes a les dues llengües i la forma _1 no renderitza «1 {plural}».


## 2026-07-21 · ASSIGNACIÓ PER VALOR MARGINAL + PUNT 4
**Autoritzat per Miquel.**
- **1 L'assignació MAXIMITZA el valor entrenable rebut, no aparella rànquings** (correcció de
  doctrina sobre la implementació). `lib/alineacio_juvenil.js` passa a **slot-centric**: les
  places de més valor primer; cada plaça entrenable agafa el juvenil lliure amb MÉS guany
  marginal per a ella (`guany_marginal = Σ pes_component × marge`, capat→0, desconegut→marge
  esperat). Un guany ~0 a totes les entrenables → **estructura**, per alt que siga el NIVELL.
  Propietats provades (`test/juvenil_v2.mjs`): un capat-en-tot de nivell alt va a estructura;
  cap guany menor desplaça un desconegut d'A d'una plaça amb component A.
- **2 Motius i textos derivats de veritat:** (a) «entrena {principal}» ara interpola el nom de
  l'habilitat; **guardià ampliat** (`t()`): flag també de valors buits i el·lipsis, no sols
  `{param}`. (b) L'estructura ja NO diu «descartat» → motiu genèric `estructura` (+ `recanvi`
  a la banqueta), derivat de l'estat real (guany ~0). (c) Capçalera de la secció derivada del
  repartiment REAL: si no hi ha descobriment, ho diu en positiu («esta setmana tot entrena»).
- **4a PROMOCIÓ** (`lecturaPromocio`): cada setmana el millor NIVELL ELEGIBLE (edat ≥ 17a **I**
  ≥ 112d a l'acadèmia, dues condicions INDEPENDENTS) es proposa per a la promoció única; si el
  millor elegible és **cua del rànquing** → despatx o promocionar-per-vendre. **4b EIXIDA:** el
  rànquing (nivell) s'exposa (`ranquing`); la cua alimenta els candidats a eixida/despatx.
  (`test/ranquing_juvenil.mjs`.)


## 2026-07-21 · DOCTRINA JUVENIL v3 — BLOC 2 (NIVELL numèric + integració)
**Autoritzat per Miquel.**
- **0+1 Fora els grups G1-G5 → NIVELL numèric continu** (la discretització creava empats
  artificials). Fórmula (tot poms, `lib/ranquing_juvenil.js`):
  `NIVELL = pes_A·valor(A) + pes_B·valor(B)` amb `valor(hab)` = actual+(pot−act)·f_marge
  (capat → actual pelat) · actual+marge_esperat·f_marge (pot desconegut) · valor_esperat_desconegut
  (tot desconegut). El **valor_esperat_desconegut AUTOCALIBRA**: mitjana de les revelacions de
  l'habilitat A de la pròpia acadèmia (cada descobriment ajusta què val un bitllet). Poms a
  migració 045. Propietats provades (`test/ranquing_juvenil.mjs`): bo-no-capat>desconegut>baix;
  capat=actual pelat; B roín conegut<B desconegut (la loteria>el bitllet ratllat); autocalibra a la baixa.
- **2 Taula de valor de plaça — correcció de font:** l'entrenament de **passades PLA entrena
  migs centrals, extrems I davanters** (text del joc). La `taula_entrenament` ho reflectix
  (`passades`→`["mc","extrem","davanter"]`). La classificació A+B/A/B/cap es deriva d'esta taula.
- **3 Assignació = maximitzar valor entrenable** (`lib/alineacio_juvenil.js`, substituïx
  l'anterior): orde per NIVELL desc; cadascú rep la millor plaça per valor ENTRENABLE (el capat
  en A va sol a plaça B, cap regla especial); places sense valor = estructura; banqueta = el
  mínim (sempre ≥1 recanvi; es lleva una plaça SENSE valor, mai entrenable). Motius curts derivats
  (descobriment/entrena/estructura/recanvi). Capçalera del repartiment REAL. (`test/juvenil_v2.mjs`.)
- **5a Retirada de «dolorit» sencer** (migració 046): la font no ho sap → Tonico no ho gestiona
  (v. ENTRADES_MANUALS). Taula, endpoint, toggle, poms i i18n fora.
- **5b Taules netes:** Fotrem mostra NIVELL numèric (una dada/columna); aterratge = només la data.
- **PENDENT (punt 4):** les altres dos lectures del rànquing — 4a promoció setmanal única (millor
  NIVELL elegible = 17a+112d; cua → despatx o promocionar-per-vendre amb el bonus +1,5) i 4b la
  cua del NIVELL cap al rànquing de despatx. El NIVELL i l'assignació ja hi són com a fonament.


## 2026-07-21 · DOCTRINA JUVENIL v3 + TAULES NETES (bloc 1: punts 1, 2, 3, 5 + rànquing exposat)
**Autoritzat per Miquel.**
- **1 Constants verificades** (migració 044, fonts ací). (a) Promoció: **màxim 1/setmana**
  (wiki HT). Elegibilitat = **DUES condicions INDEPENDENTS**, no una edat combinada:
  edat **≥ 17 anys** (l'edat en anys; NO 17a+112d, que serien ~18) **I** antiguitat a
  l'acadèmia **≥ 112 dies** (temps a l'acadèmia, mesurat a banda de l'edat). Poms separats:
  `promocio_edat_min_anys=17`, `promocio_dies_min_academia=112`. (b) **Bonus
  de club mare +1,5** nivells a totes les habilitats en promocionar (entra a l'estimador del
  promocionar-per-vendre). (c) **Reinici de la crida = economia del país + 1h**: economia
  dissabte 01:00 → crida disponible dissabte 02:00. **Correcció de la finestra vigent:**
  - Font vella 1: `crida_reinici_dia=5` (divendres) — hipòtesi «poc abans del cap de setmana».
  - Font vella 2: hora 18:00 — mateixa hipòtesi.
  - **Font vigent (confirmada per Miquel, HT):** dissabte 02:00 (`crida_reinici_dia=6`,
    `crida_reinici_hora='02:00'`). La pròxima crida és **dissabte, no divendres**. És pom PER
    USUARI (l'actualització econòmica varia per país; camp a Estructura, al costat de la divisió).
- **2 Motor de valor de plaça** (`lib/valor_placa.js`): classifica cada bucket A+B / només-A /
  només-B / cap creuant (entrenament_a, entrenament_b) amb la taula config `taula_entrenament`
  (constants_joc, de la guia). **Zero entrenaments/posicions al codi** → generalitat. Test amb
  DOS pipelines (`test/valor_placa.mjs`).
- **3 Rànquing únic de juvenils G1-G5** (`lib/ranquing_juvenil.js`): estat per habilitat
  (bo/baix/desconegut × capat/no-capat) → G1 bo+no-capat, G2 bo+capat amb valor viu en B, G3
  desconegut, G4 baix+no-capat, G5 capat sense valor. Desempats: nivell actual, després data de
  promoció. Exposat a Fotrem (ordena l'acadèmia + etiqueta Grup). Test (`test/ranquing_juvenil.mjs`).
- **5 Principi «taules netes»** (principi 5 a PRINCIPIS.md): una dada per columna, sense frases.
  La taula de Fotrem perd Pipeline i Juga? (frases) i guanya **Grup** (G1-G5); el perquè va al
  detall de la fila (títol), no a la graella.
- **PENDENT (bloc 2):** punt 4 complet (les TRES lectures del rànquing: 4a promoció setmanal, 4b
  alineació per places de valor amb la restricció G2/només-B, 4c cua→despatx) integrat a
  l'alineador juvenil i la promoció/eixida; punt 5b/5c (escaneig de la resta de taules + insígnies
  de venda). El rànquing i el motor de valor ja hi són com a fonament.


## 2026-07-21 · POLIT #12 · Generalitat, estats de lesió, despatxar calibrat, MC d'entrenament
**Autoritzat per Miquel.**
- **0 Disciplina de GENERALITAT** (principi 4 a PRINCIPIS.md): cap regla, test o
  verificació referencia un jugador pel nom. Regles per PROPIETATS; verificacions a prod
  per propietat; fixtures sintètics. Escaneig i neteja de tots els noms propis a
  `lib/`, `functions/`, `test/` (comentaris i etiquetes → propietats).
- **1 Estats de lesió — el que la font diu i el que no.** (a) Ingest estricte: la columna
  del CSV porta buit o N; qualsevol altre valor es registra i degrada (no s'inventa
  significat) — `lib/adaptador.js` `lesioCsv`. (b) L'estat DOLORIT (creueta) NO és
  derivable de l'export (limitació documentada a ENTRADES_MANUALS, resoluble amb CHPP);
  marca MANUAL opcional (`marca_dolorit`, migració 042) — mai requerida; si es posa,
  l'alineador mostra l'avís de risc i un pom de fase (`dolorit_descansa_aparador`) decidix
  si els dolorits en venda descansen de l'aparador; s'esborra sola si el jugador passa a
  lesionat N o caduca (pom `dolorit_caducitat_dies`) — `lib/dolorit.js`. (c) Lesionat N:
  exclòs de tota alineació, amb la DURADA visible (plantilla, fitxa de venda, alerta). (d)
  Test sintètic (`test/lesio.mjs`).
- **2 El despatxar no decidix amb números no calibrats.** (a) Estat `calibrat` derivat (hi
  ha comparable/venda real): sense calibrar, cap `valor_net` ni «despatxar» — només
  l'estimació etiquetada. (b) Els rellotges manen també sobre el despatxar: cap forçat
  (llistat o agenda de llistat vigent) mostra «despatxar». (c) L'escalat per puntuació
  segueix operant damunt la base de divisió (cap llosa plana). — `functions/api/vendes.js`,
  `test/vendes.mjs`.
- **3 Plaça d'MC juvenil d'ENTRENAMENT** (migració 043, pom `mc_entrenament`=1): N places
  d'MC reservades per als millors ACTUALS CONEGUTS de l'habilitat principal (no descartats),
  motiu propi «entrenament — millor {habilitat} coneguda»; la resta, descobriment.
  — `lib/alineacio_juvenil.js`, `functions/api/fotrem.js`, `test/juvenil_v2.mjs`.


## 2026-07-21 · POLIT #11 · Mecànica i doctrina (formació juvenil, lesions, aparador, depreciació, estimacions)
**Autoritzat per Miquel.**
- **1 Formació juvenil LEGAL** (migració 039). L'antiga (5 MC) era il·legal (sobrepoblació;
  a la guia els màxims s'acaben en 3). Nova: POR + 2 DC + 3 MC + 2 EXT + 1 DAV = 9. **Màxims
  per posició** a `constants_joc` (`maxims_posicio`), que l'alineador juvenil respecta sempre
  (1a). Creativitat entrenable = NOMÉS els 3 MC (1b). Els 3 MC són mixtos: 1 plaça per al
  MILLOR ACTUAL CONEGUT (entrenament real) + descobriment (desconeguts per promoció) (1c).
  **RECANVI = sempre un descartat, mai un candidat** (1d): els candidats juguen tots (minuts =
  elegibilitat); els duds fan estructura i el que sobra és el recanvi. Llenguatge honest (1e):
  fora «busca 5 descobriments» → esperança real per partit (~1 revelació d'actual + ~1 de
  potencial de passades + 1 comentari). (`lib/alineacio_juvenil.js` reescrit; `test/juvenil_v2.mjs`.)
- **2 Lesions del CSV** (forat de dades). La columna «Lesions» ja es parsejava i persistia,
  però no es llegia aigües avall. Ara: predicat únic `esLesionat` (`public/format.js`, servidor
  i client); marca 🤕 a plantilla i vendes; l'alineador ja exclou els lesionats (avís amb
  motiu); regla `ALR_LESIO_VENDA` (migració 038) per a un llistat lesionat («espera que es
  recupere»). *Cas Reniu: la seua lesió apareix.*
- **3 L'aparador prioritza els que es venen** (polit #11.3). Les places d'aparador s'omplin per
  PRIORITAT: 1r llistats amb subhasta activa, 2n agenda de llistat vigent, 3r resta de venda
  per valor (3a). **No doblar sense motiu declarat** (3c): venda/farciment/cos juguen UN sol
  partit; només extrems (50+50) i experiència doblen. (`lib/orquestra_alineacio.js` +
  `lib/alineacio.js`; `test/alineacio.mjs`.)
- **4 Rellotge de depreciació MECÀNICA** (tercer rellotge d'agenda, migració 040). Un porter
  notable en venda sense entrenament de porteria (Castelló, PO6) perd valor cada setmana →
  `ALR_DEPRECIACIO_MECANICA` l'afig al primer lot d'agenda de llistat (helper `finestraLlistat`
  compartit amb l'aniversari). *Castelló apareix a l'agenda; quan es lliste, la porteria A
  passa al següent aparador via la prioritat de #11.3.* (`test/regles.mjs`.)
- **5 Estimacions amb peu a terra** (migració 041). Base d'estimació PER DIVISIÓ
  (`estimacio_per_divisio`; VII=2000, molt per davall dels valors inflats); es pren la divisió
  del pla (`plans_temporades.divisio_prevista`, Miquel la declara) o el defecte VII (5a).
  Etiqueta crua: «estimació NO calibrada — orientativa per a ordenar, no és proposta de preu»
  (5b). El recalibratge amb vendes reals (comparables) mana quan hi haja dades (5c).
  (`functions/api/vendes.js`; `test/vendes.mjs`.)

## 2026-07-21 · POLIT #10 · URGENT (Fotrem caigut) + punts 2, 3, 4
**Autoritzat per Miquel.**
- **1 Fotrem caigut a prod (regressió del bloc 2, punt 7).** Causa arrel: dins `fotrem()`
  un `const edat = el('input'…)` **ombrejava** el formatador `edat` importat → la crida
  `edat(j.edat_anys, j.edat_dies)` de la fila queia a la **zona morta temporal (TDZ)** →
  `ReferenceError` que el guarda de secció convertia en «Hi ha hagut un error» per a tot el
  bloc. Fix: renom `edatInp`. **Doctrina de degradació:** (a) `format.js` MAI llança —
  `edat` degrada amb dades parcials («15a» sense dies, «—» si res o invàlid); (b) guarda de
  **fila** reutilitzable `filaSegura()` (comu.js) acota l'error a la fila (colspan) amb el
  detall al registre, no al bloc; aplicat a Fotrem, Plantilla i Vendes; (c) el guarda de
  secció registra el detall (`console.error`). *Desplegat i verificat: seccions.js sense
  l'ombreig, `filaSegura` viu.*
- **2 Marca de cobertura sense posició:** un jugador sense posició (Pasiego) no pot ser
  buffer → `cobreix=false` (mai «cobrix ?»). (`functions/api/vendes.js`; `test/vendes.mjs`.)
- **3 Els rellotges manen sobre el buffer:** si el de menys valor d'una línia té venda
  FORÇADA, el rol de buffer passa al següent de menys valor (cas Ioanid→Ouhammad). El
  buffer és rol derivat, mai contradiu l'agenda. **Ajust:** venda forçada = fitxa
  llistada/venuda/despatxada O data de llistat activa **O entrada d'agenda de llistat
  vigent** (`estat='agenda'`, `agenda.llistar`) — la contradicció d'Ioanid la genera
  l'agenda del rellotge d'aniversari, no la fitxa. *Prod: 3 entrades `agenda.llistar`
  (Pasiego/Ioanid/Badia) → forçats → cap fa de buffer.* (`functions/api/vendes.js`;
  `test/vendes.mjs`.)
- **4 Altes i baixes al comparador:** «Què ha canviat» declara els jugadors nous i
  desapareguts en una línia («Alta: {nom} ({edat}, {categoria})»), a més dels pops. Les
  baixes tenen el flux de motiu a Moviments; les altes només es declaren.
  (`functions/api/comparador.js` enriquit amb edat+categoria; `public/seccions.js`; `test/comparador.mjs`.)

## 2026-07-21 · POLIT #10 · (bloc 2: punts 0a, 0b, 3, 7)
**Autoritzat per Miquel.**
- **0a Aparador al porter:** un porter EN VENDA té prioritat a la porteria del rol
  competitiu (A) sobre el farciment (forma i qualificacions visibles per a compradors);
  el segon va a la B. Motiu «aparador de venda» (no «porteria»). (`lib/alineacio.js` pas 3b;
  `public/seccions.js`; `test/alineacio.mjs`: Castelló→A, Soldevilla→B.)
- **0b Vist vs Dia D:** la clau d'idempotència de les alertes amb data d'acció inclou eixa
  data (`data_accio`, migració 035). Un «vist» anticipat NO silencia l'alerta del dia
  d'acció: el dia D es crea una instància NOVA. (`lib/regles.js` `agendaItem`/`data_accio`,
  `lib/orquestra_alertes.js`; `test/alertes_persist.mjs`.)
- **3 «L'informe és l'agenda d'hui»** (principi formal, `docs/PRINCIPIS.md` §3): una alerta
  només existix si l'acció òptima és executable HUI; acció futura → línia d'AGENDA; «de moment
  res» → informació de secció. **Subsecció AGENDA** al final de l'informe (una línia per data,
  files `estat='agenda'` reconstruïdes cada revisió; migració 036). Reclassificacions: (3b)
  `ALR_ANIVERSARI`/venda dispara EL DIA de llistat òptim, abans → agenda «dia D: llistar X»;
  (3c) `ALR_JOVE_FORA_PIPELINE` només amb crida disponible I sobrepassament de l'objectiu;
  (3d) `ALR_JOVE_ESPECIALITAT` només si és candidat real a eixida; (3e) `ALR_FINESTRA_MERCAT`
  informatives fora de l'informe (viuen a Mercat), la forta es queda. *Verificat a prod:
  claus d'agenda i `aniversari_llista_avui` vives, paritat 468.*
- **7 Formatadors DRY** (`public/format.js`, únic per a totes les seccions; les regles
  segueixen pures, el format dels diners de les alertes es fa al RENDER): moneda amb espai
  fi + € («131 978 €»), edat HT «17a 34d», decimal amb coma, percentatge, i **nota al peu**
  reutilitzable (l'«estimació — sense comparables» ×N → asterisc + llegenda única). Escaneig
  a `test/format.mjs`: cap secció formata a mà. També: «parte»→«informe» a `PRINCIPIS.md`.
- **5 Doctrina de venda en fàbrica + marca de cobertura** (`docs/classificacio.md`): en fase no
  competitiva es ven tot el que tinga valor; l'estructura la cobrixen els cossos de MENYS valor.
  A Vendes, dins cada línia de posició el de menys valor porta «cobrix {pos} — ven-lo l'últim de
  la seua línia» (buffer); la resta «lliure per vendre ja». En fase competitiva el criteri
  s'invertix → contingut de `fases_config`, no codi. (`functions/api/vendes.js`; `test/vendes.mjs`.)
- **6 Categoria «despatxar» amb criteri econòmic** (redefinix `alliberament`; poms a migració 037):
  `valor_net = preu_esperat − cost_llistat (1000 €) − sous fins a la venda estimada (setmanes_venda_estimada)`;
  si `valor_net < despatxar_llindar` → despatxar, amb el càlcul visible a la fila («valor net −X €
  → despatxar»). El llistat a 1 € és override manual. (`functions/api/vendes.js`; `test/vendes.mjs`.)

## 2026-07-21 · POLIT #10 · (bloc 1: punts 1, 2, 4, 8, 9)
**Autoritzat per Miquel.**
- **1 Bug del «vist»:** el GET `/api/alertes` mostrava `estat IN ('nova','vista')`, així que
  marcar «vist» no amagava res (l'alerta reapareixia idèntica), mentres que «ignorat» sí que
  s'amagava — d'ací la sensació que «es perdia el vist». Causa arrel: la **query de
  visualització**, no la persistència (la regeneració ja preservava l'estat, `UPDATE` sense
  tocar `estat`). Contracte: l'informe mostra NOMÉS `'nova'`; marcar vist O ignorat amaga
  l'alerta i la regeneració preserva ELS DOS estats. (`functions/api/alertes.js`;
  `test/alertes_persist.mjs` amb els dos casos.)
- **2 Llindar de la Junta = 7 (Notable+).** Font: guia de Hattrick, secció transferències —
  la Junta reté porters «Notable+» = nivell 7 (no 5). Amb el 5, Castelló (PO6) i Erarrizaga
  (PO5) generaven alertes FALSES. Pom `porteria_min` d'`ALR_JUNTA_PORTER` → 7 (migració 034).
  *Verificat a prod: pom=7; el fixture (porters PO6/PO6/PO5) ja no dispara cap alerta de Junta.*
- **4 Columna MOTIU a les alineacions sènior (A i B),** com la juvenil: «entrenable — MC 100%»,
  «aparador de venda», «experiència (futur entrenador)», «farciment estructural», «porteria»,
  «cos estructural». Derivada de la categoria (el slot ja porta `jugador.categoria`) i del rol
  del partit; cap text a mà. (`lib/alineacio.js`, `public/seccions.js`, i18n `alineacio.motiu_*`.)
- **8 «dud» fora de la interfície ca → «descartat»** (argot): «No (descartat)», «descartat per
  dades → banqueta/estructura». L'anglés manté «dud» (concís, encaixa amb la veu). Regla a
  `docs/GLOSSARI.md`.
- **9 Enllaços morts:** els jugadors de la plantilla sènior deixen de ser clicables (l'enllaç
  anava a `#fotrem`, que no és el seu lloc). **Millora futura:** FITXA DE JUGADOR (historial,
  TSI, transaccions); quan existisca, tornarà l'enllaç a la seua fitxa.
- **PENDENT (bloc 2): punts 3, 5, 6, 7.** 3 (principi «l'informe és l'agenda d'hui» + subsecció
  AGENDA + reclassificació d'alertes anticipades), 5 (doctrina de venda en fàbrica + marca de
  cobertura mínima), 6 (categoria «despatxar» amb valor_net econòmic), 7 (formatadors DRY
  `format.js` + nota al peu). Interconnectats amb el classificador (cobertura), l'economia i el
  motor de regles → bloc propi.

## 2026-07-21 · POLIT #9 · Mecànica del llistat, onze juvenil legal i glossari valencià
**Autoritzat per Miquel.**
- **1 El tercer dia — la subhasta tanca a llistat + `dies_subhasta` (=3):** tota recomanació de
  venda raona sobre la DATA DE TANCAMENT, no sobre un número de setmana. `ALR_ANIVERSARI` en
  depressió proposa ara «llista'l el {data_llistat} i la subhasta tanca el {data_tancament}»
  (llistat = tancament − 3 dies; tancament = finestra de recuperació). La fitxa de venda mostra
  el **tancament previst** (`tancament_previst` a `functions/api/vendes.js`). Paco recorda el dia
  abans amb `ALR_SUBHASTA_TANCA` (constants a migració 033; `test/subhasta.mjs`). *Verificat a
  prod: constants dies_subhasta=3, regla activa, i18n sense `setmana_recuperacio`.*
  - **BUG CORREGIT (mateix dia):** el tancament es datava des de HUI (`dataInstantania +
    finsRecuperacio*7`), que cau en un dia arbitrari de la setmana. La regla correcta és
    TANCAMENT = primer dia de la finestra = **vora de la setmana de mercat** + `finsRecuperacio`
    setmanes; LLISTAT = tancament − `dies_subhasta`. L'orquestra passa `setmana_inici_data`
    (àncora + temporada/setmana de la instantània). Cas real verificat a prod (àncora 25-07):
    hui dimarts 21-07 → llista **dimecres 22-07**, tanca **dissabte 25-07**, no «espera a la
    setmana 1». (`lib/orquestra_alertes.js`, `lib/regles.js`; `test/subhasta.mjs` amb dates exactes.)
- **2 Onze juvenil LEGAL i complet (abans proposava 7 sense porter):** l'onze és una alineació
  de veritat (formació de config, porter SEMPRE, mínim en camp = `minim_jugadors`=9; per davall →
  NO viable, es perd tot l'entrenament). **Doctrina corregida:** els duds NO ocupen posicions
  entrenables però SÓN L'ESTRUCTURA (porter + defenses); «banqueta» només per als que sobren.
  Fre de suplents integrat (10 → 9 en camp + 1 recanvi). Els desconeguts ocupen els migs
  entrenables per a descobrir-los; cap posició entrenable la pren un dud si hi ha desconegut.
  Taula amb posicions com la sènior + motiu per fila. (`lib/alineacio_juvenil.js` reescrit;
  `test/juvenil_v2.mjs` 2e: 3 duds → POR+2DC, desconeguts als migs, 9 en camp, 1 recanvi.)
- **3 Glossari valencià:** «PARTE» fora (castellanisme, culpa del director esportiu extern) →
  «INFORME» a tot el catàleg ca i a la veu de Paco. «CRIDA» mai a seques → «crida al
  cercapromeses» la primera aparició per secció/alerta; botó «He cridat el cercapromeses —
  acceptat/rebutjat». Els dos termes amb la seua regla a `docs/GLOSSARI.md`. Repassada del
  catàleg ca: net (usa llistat/subhasta/traure/però; «buscar» és vàlid, cap castellanisme colat).

## 2026-07-20 · POLIT #8 · Rellotge de crida (reinici setmanal global) i alertes agregades
**Autoritzat per Miquel.**
- **1 Rellotge de crida amb REINICI SETMANAL GLOBAL:** la crida es reinicia per a tots
  els usuaris al mateix moment (poc abans del cap de setmana). Constants a `constants_joc`:
  `crida_reinici_dia` (0=diumenge…6=dissabte; **defecte 5=divendres**) i `crida_reinici_hora`.
  **Font del defecte:** observació de Miquel sobre el reinici setmanal de HT; ajustable si
  observem el moment exacte. Disponibilitat DERIVADA del calendari (`lib/crida.js` +
  `finestraCrida`): disponible si no s'ha declarat cap crida dins de la finestra vigent —
  CAP config per usuari. Acció a Fotrem «he fet la crida» (data + resultat acceptat/rebutjat;
  taula `crides`; en acceptar, el nou juvenil enllaça amb la instantània següent i la
  reavaluació/rànquing és automàtica en pujar). `ALR_CRIDA_DISPONIBLE` dispara NOMÉS amb la
  crida disponible i no gastada, i diu quan caduca; gastada/tancada → res al parte, línia
  informativa a Fotrem («pròxima crida: …»). Mai una recomanació inexecutable. Substituïx
  `ALR_CRIDA_SETMANAL` (desactivada, migració 032). *Verificat a prod: reinici divendres,
  0 crides → disponible; regles intercanviades.*
- **2 Alertes «fora de pipeline» AGREGADES:** les individuals passen a UNA línia
  («{n} juvenils fora de pipeline esperen la cua d'eixida; es resol amb la pròxima crida»),
  amb el detall a la taula de Fotrem (mateixa medicina que l'allau de revelacions). *Verificat
  a prod: hi ha 3 (Valcarce, Justo Menéndez, Quijanopeinado) que en regenerar seran una línia.*
  Les claus `alerta.jove_cua_eixida`/`_promocionar_vendre` es mantenen (llegades) perquè les
  alertes ja DESADES renderitzen bé fins que Miquel passe revista.
**Revertir:** migració 032 additiva (`ALR_CRIDA_SETMANAL` reactivable amb `activa=1`).

## 2026-07-20 · POLIT #7 · Puntuació per categoria, finestra de compra amb pla, estimació escalada
**Autoritzat per Miquel.**
- **1 (NO era bug — diagnòstic aclarit):** Salvatella (futur_entrenador) mostra 16.0, que
  ÉS experiència(12)+lideratge(4), NO la fórmula de venda (que per a ell, edat 29 i
  habilitat_max ~4, donaria ~4). La derivació ja aplica LA FÓRMULA DE CADA CATEGORIA.
  S'afig `test/plantilla_categories.mjs` (entrenable, futur_entrenador, farciment, venda)
  que ho blinda. Cap canvi de codi; la resta no es mou.
- **2 ALR_FINESTRA_MERCAT amb context de pla:** creua (a) fase de mercat, (b) ocupació del
  nucli (`nucli_ple` = entrenables ≥ aforament) i (c) cadència de fornades del pla
  (`proxima_eixida` de plans_temporades). La compra de reposició toca a la depressió
  IMMEDIATAMENT ANTERIOR a l'eixida (`tBuy = eixida−1`, alineada amb la temporada CRUA per
  la setmana de mercat). Nucli ple + depressió a tBuy → alerta FORTA; nucli ple + finestra
  a aquest final o el següent → INFORMATIVA («la compra toca a la depressió de final de
  T{tBuy}»); nucli buit → immediatesa (comprar ja). *Verificat a prod: Miquel té nucli 8/8,
  A1 ix T84 → informativa «reposició a final de T83», no «compra ja».*
- **3 Estimació de venda ESCALADA:** fora el 150.000 pla per a tots. Sense comparables,
  l'estimació grossa del pom s'escala per la puntuació de venda relativa (proporció simple,
  mitjana ≈ pom), de manera que la llista ordena coherent amb els punts. Es recalibra amb
  comparables/vendes reals com ja estava previst. *Verificat a prod: 14 en venda, 0
  comparables → estimacions distintes ordenades pels punts.*
**Revertir:** només canvis de lògica/consulta (cap migració nova).

## 2026-07-20 · POLIT #6 · Fórmula completa, «em falten» viu, estimació de venda i caducitat de moviments
**Autoritzat per Miquel.** Cada punt verificat contra el cas concret a prod.
- **1 Fórmula de derivació completa:** la derivació de puntuació a `plantilla.js` no
  carregava `lleialtat` ni `qualificacio_ultim_partit` (P7e) → 16,0 en compte de 17,7.
  S'afigen a la consulta (i `lideratge`, per al futur_entrenador). Test que compara el
  número RENDERITZAT amb el càlcul manual (el juvenil A = 17,7).
  *Verificat a prod: skills reals de el juvenil A → 6·2+(25−21)+20·0,05+3,5·0,2 = 17,7.*
- **2 «Em falten» viu:** `/api/falten` mirava fonts VELLES (transaccions per a caixa,
  personal_declarat per a personal). Ara mira les VIVES: `finances.caixa` i
  `personal_membres`. Sense regeneració. *Verificat a prod: Miquel té caixa 268.763 i 4
  membres (però 0 a les taules velles) → l'ítem s'apaga.*
- **3 Fitxes de venda amb estimació:** sense comparables, el preu proposat cau a
  l'estimació GROSSA del pom (`valor_estimat_defecte`), etiquetada «estimació — sense
  comparables», en compte de «—». *Verificat a prod: Miquel té 0 comparables i 14 en
  venda → mostren 150.000 (estimació), no «—».*
- **4 Moviments amb caducitat:** els executats passen a un HISTORIAL plegable després de
  N dies (pom `moviment_caducitat_dies`) o de la pujada següent (llindar = el més tard de
  avui−N i la data de l'última instantània). La vista mostra els recents; el Desfés
  segueix disponible des de l'historial mentres siga reversible. Migració 031.
**Revertir:** migració 031 additiva; la resta són canvis de consulta/render.

## 2026-07-20 · POLIT #5 · Projecció amb vendes, guardià d'interpolació, el juvenil A i quota de farciment
**Autoritzat per Miquel.** Cada punt verificat contra el CAS CONCRET a prod.
- **1 Projecció d'inflexió amb el NEGOCI:** el balanç operatiu d'una fàbrica és
  negatiu per disseny; l'ingrés són els marges de venda. La trajectòria compta ara
  (a) vendes de les fitxes actives (preu proposat des de comparables; si no, pom
  `valor_estimat_defecte`) i (b) la cadència de fornades DEL PLA (plans_temporades,
  `valor_fornada_estimat`, recalibrat amb el marge real mitjà de les venudes). L'alerta
  declara la base («comptant X € de vendes estimades»); sense cap comparable ni venda
  real, to INFORMATIU (`alerta.trajectoria_informativa`), no alarmista. Migració 030.
  *Verificat a prod: cadència de Miquel (A1,A2,V en (T83,T88]) = 900.000 € comptats.*
- **2 Guardià d'interpolació:** `test/interpolacio_guardia.mjs` (paritat de {params}
  ca/en + la projecció real interpola sense fuga) + guard a `t()` (client) que
  registra i neteja qualsevol `{param}` sense resoldre. Cas concret: la frase de
  projecció de la secció Economia usava {data}/{setmanes}/{projectada} però rebia
  l'objecte projeccio (data_inflexio/…); ara les claus usen els noms de camp reals.
  *Verificat a prod: `economia.trajectoria_no` desplegada usa {data_inflexio}… sense fuga.*
- **3 el juvenil A sense punts (3a vegada) — arrel:** la puntuació es llegia de
  `categories_jugador` (snapshot ranci; un desplaçat ESTABLE mai es reescriu). Fix
  robust: `functions/api/plantilla.js` DERIVA la puntuació de la instantània actual i
  la config (principi de derivació). *Verificat a prod: «el juvenil A» (l'ÚNIC amb
  puntuació NULL) → venda derivada = 6·2 + 0 + (25−21) + 20·0,05 + 3,5·0,2 = 17,7.*
- **4 Llenguatge honest a la taula juvenil:** «Per determinar — cal descobrir la
  creativitat» i «Sí (descobriment)» en compte de «revela»/«revelar» (coherent amb
  l'onze i les alertes).
- **5 Quota de farciment davanter:** `filtresCompra` no aplicava la cobertura
  complementària (`resta_ocupacio`). Ara compta la cobertura ESTABLE (Salvatella,
  futur_entrenador de DV → quota 0) i, si un buit només el tapen jugadors EN VENDA, el
  filtre ho diu («previsió: per a quan es venga X» — regla visible). *Verificat a prod:
  Ernest Salvatella (futur_entrenador, DV) cobrix davanter → falten 0.*
**Revertir:** migració 030 additiva; la resta són canvis de lògica/render.

## 2026-07-20 · ORDE ACADÈMIA OPCIONAL + ALINEACIÓ JUVENIL + CORRECCIONS
**Autoritzat per Miquel.**
- **0 Principi «el parte no parla de l'alineació»** (formal, a `docs/PRINCIPIS.md`
  al costat del de derivació). Auditoria: es DESACTIVEN `ALR_ENTRENABLE_SENSE_MINUTS`,
  `ALR_JUVENIL_SUPLENTS` i `ALR_REVELA_JUVENIL` (migració 029) — allò que es resol
  alineant viu a les seccions amb el motiu visible.
- **1 Símptoma noms curts (arreglat):** el camí real era que `alinea()` no retornava
  `nom_clau_curt`, així que el client queia al nom llarg. Ara sí; protegit per test
  (`alineacio.mjs`) i verificat a prod.
- **2 Onze juvenil com a secció** (`lib/alineacio_juvenil.js`): desconeguts prioritaris
  en posició entrenable (prioritat per poms: decisió forçada més pròxima → destí fàbrica
  → resta), duds a la banqueta, **fre de suplents dur**. **Llenguatge honest:** la
  revelació és PROBABILÍSTICA («maximitza la probabilitat de descobrir», mai «revela»).
  El BUCLE es tanca sol: `revelacions()` compara instantànies juvenils i Paco celebra el
  FET (`ALR_REVELACIO_JUVENIL`); al parte, resum d'una línia amb enllaç.
- **3 Acadèmia OPCIONAL:** l'equip juvenil és opcional a l'onboarding («Tens acadèmia?»),
  activable després des del Pla. Sense acadèmia: pujada només sènior, cap secció/regla/
  menció juvenil (filtre per `modul='juvenil'` a l'orquestra). El sistema juvenil és
  CONTINGUT de la fase.
- **4 Default d'entrenament juvenil** = pipeline de la fase (ja implementat; es manté).
**MILLORA FUTURA (segueix apuntada):** seqüenciació del descobriment amb companys de
nivell conegut (tècnica del 50%). No s'implementa; l'onze només maximitza la probabilitat.
**Revertir:** migració 029 additiva (desactivacions reversibles amb `activa=1`).

## 2026-07-20 · ORDE JUVENILS + UI · Doctrina juvenil v2, llenguatge pla i noms de rol
**Autoritzat per Miquel.** Resum:
- **1 Noms de rol curts:** el nom complet només com a títol de taula d'alineació; a
  la comptabilitat i avisos, «A»/«B» (claus `rol.*_curt`, parametritzades per
  plantilla com les llargues).
- **2 Textos de pipeline en llenguatge pla:** «Topat en creativitat (3/3) → cua
  d'eixida», «Sostre massa baix (màx. 2)», «Creix bé (creativitat 4/7)». **DESCONEGUT
  ≠ dolent:** si l'habilitat principal no s'ha revelat, el destí és «per determinar —
  revela la creativitat», mai venda amb dades desconegudes (mateixa doctrina que les
  crides). Cas **Moyano** protegit per test.
- **3 Doctrina juvenil v2** (tot poms/constants):
  - **a** Plantilla juvenil = objectiu exacte (`juvenil_objectiu`=10): coixí de lesions.
  - **b** Crida setmanal recurrent (`ALR_CRIDA_SETMANAL`); si en són més de l'objectiu,
    **rànquing d'eixida** (`ALR_JUVENIL_SOBRANT`, `ranquingEixida`) que despatxa primer
    els menys revelats (un dud JA DESCOBERT és millor farciment — no malgasta comentaris
    de l'entrenador), mai per davall de l'objectiu. La reavaluació completa és la
    regeneració de cada pujada.
  - **c** Juga/no juga per juvenil (`recomanaJoc`): interessants no descoberts juguen
    (revelen), duds a la banqueta. **Fre de seguretat dur** (`ALR_JUVENIL_SUPLENTS`):
    mai sense ≥1 suplent (lesió sense recanvi → s'acaba el partit i es perd tot
    l'entrenament).
  - **d** Promocionar-per-vendre amb barra de valor (`preu_esperat_min`) i termini de
    venda (`venda_termini_setmanes`=2). *Simplificació: la barra de valor usa el
    potencial vendible com a proxy; el € exacte per juvenil vindrà del model de venda.*
  - **e** Constants de mecànica a `constants_joc` (revelació ≥44 min, actual via
    principal / potencial via secundari, comentari de l'entrenador aleatori sobre info
    no descoberta, crida 1/3 de 15 i 2/3 de 16). Migració 028.
- **4 Default d'entrenament juvenil** = pipeline de la fase (creativitat+passades), no
  alfabètic; l'alerta de desquadre existent avisa si difereix.
- **5 Prioritat de descobriment:** quan el destí depén d'una habilitat no revelada,
  Paco ho posa al parte com a acció (`ALR_REVELA_JUVENIL`: «fes jugar Moyano de
  creativitat per revelar-la»).

**MILLORA FUTURA (apuntada, NO implementada):** pla de descobriment dirigit complet
—companys d'equip amb nivell conegut, ~50% de probabilitat de revelació per partit,
seqüenciació òptima de qui jugar cada setmana per maximitzar informació. Ara només es
marca quina habilitat revelar; la planificació multi-setmana queda per a més avant.

**Revertir:** migració 028 additiva; els poms i constants són editables.

## 2026-07-19 · ORDE MACRO A–G · Camps manuals, economia real, juvenils lligats al pipeline i especialitats
**Autoritzat per Miquel** («avant amb tot»). Resum de les decisions de disseny:
- **A Economia:** la caixa passa a ser REAL declarada (informe setmanal de HT, taula
  `finances`), no només SUM de moviments; l'objectiu d'inflexió segueix estimat i
  editable. Despeses fixes setmanals (planter, estadi) + ingressos recurrents →
  **balanç operatiu setmanal** i **projecció fins a la DATA d'inflexió** (helper
  `dataDeTemporada`, invers del calendari) amb alerta `ALR_TRAJECTORIA_INFLEXIO`.
  Nou tipus de moviment `taxa_llistat` (cost fix de llistar). Migracions 021–022.
- **B Personal:** model RIC (`personal_membres`: rol entrenador/especialista, tipus,
  nivell, sou, setmanes de contracte) en compte del clau→int; el desquadre compara
  el COMPTE d'especialistes per tipus; alerta `ALR_CONTRACTE_PERSONAL` a ≤2 setmanes;
  el cost del personal alimenta el balanç d'A. Migració 023.
- **C Entrenament sènior:** el tipus d'entrenament és **paràmetre de fase**
  (`fases_config.entrenament`: tipus/intensitat/resistència + pipeline principal/
  secundari + vendibles + llindars), no una constant. Confirmació del que hi ha a HT
  (`entrenament_confirmat` al pla) + alerta `ALR_ENTRENAMENT_DESQUADRE`. L'esquema de
  places entrenables i la comptabilitat setmanal són el pipeline de creativitat de la
  fàbrica (derivat). *Simplificació: la re-derivació automàtica de l'esquema de places
  per a un tipus d'entrenament ARBITRARI queda per a més avant; ara el contingut de la
  fàbrica ja és el de creativitat.* Migració 025.
- **D Estructura:** divisió actual, tipus de setmana de partits (ab/un/copa) i
  caducitat del Supporter viuen a `plans.parametres`. `copa` = partit A de copa →
  **doble experiència** per al futur entrenador (nota a l'alineació). El tipus de
  setmana deriva `rols_actius` de l'alineador. Alerta `ALR_SUPPORTER` a ≤7 dies.
  Migració 024.
- **F Juvenils lligats al pipeline:** cada juvenil s'avalua contra el pipeline de la
  fase. **Fora de pipeline** = topat (actual≥potencial en la principal) o sostre baix
  (≤`sostre_min`) → proposta de **cua d'eixida**, EXCEPTE potencial vendible ≥5 →
  **promocionar-i-vendre als 17**. Promoció amb destí: principal ≥`fabrica_min` →
  fàbrica; si no → venda. Entrenament juvenil declarable amb validació (parells iguals
  permesos: defensa/anotació/creativitat; ha d'alimentar el pipeline). Regles
  `ALR_JOVE_FORA_PIPELINE`, `ALR_ENTRENAMENT_JUVENIL`. Migració 026.
- **G Especialitats:** ja es llegien del CSV; ara es mostren a Plantilla, Fotrem i
  Venda (amb nota de prima de mercat per a les valuoses). Alerta `ALR_JOVE_ESPECIALITAT`
  (valor a protegir). Recordatori permanent a Fotrem: tàctica «Joc d'especialitats».
  *Simplificació: el «recàrrec de sou creixent per temporada» es marca com a nota, no
  es quantifica (cal un model de sou per especialitat).* 
**Principi de derivació:** tots els camps nous són fets del món (caixa, sous, divisió,
dates, especialistes, entrenament de HT) o decisions (overrides); cap defecte.
**Revertir:** migracions 021–026 additives; els camps de `plans.parametres` són opcionals.

## 2026-07-19 · POLIT #4.2 · Els partits són ROLS, no tipus de calendari
**Context:** «Lliga»/«Amistós» eren noms estructurals dins del motor d'alineació;
tota la doctrina (MC pròxims a la venda a l'aparador, extrems als dos, Junta al
visible) penjava del nom o de l'índex 0.
**Decisió:** cada setmana té N espais de partit definits per **ROL**, contingut de
l'estratègia (config `rols` per plantilla, migració 020). En fàbrica: rol **A
competitiu/aparador** (qualificacions per a compradors, minuts de la Junta, el que
compte oficialment eixa setmana) i rol **B només entrenament**. El motor busca el
rol competitiu per la marca `competitiu`, no per l'índex. Els noms visibles són
claus i18n parametritzades per plantilla (`rol.fabrica_a/b`).
**Setmana d'un sol partit:** `opts.rols_actius` permet declarar que esta setmana
no hi ha amistós; els extrems queden al 50% (limitat pel calendari, no per
banqueta) i Paco ho declara (aviso `una_alineacio`). Contemplat encara que
Benifotrem sempre en tinga dos.
**Revertir:** la migració 020 renombra `partits`→`rols`; tornar el valor a noms.

## 2026-07-19 · POLIT #4.3 · Anglés (avanç Fase 12) i la veu de Paco
**Decisió:** catàleg `en.json` complet amb **paritat** garantida pel guardià i18n
(tota clau existix a les dos llengües). Glossari de traducció a `docs/GLOSSARI.md`
(noms propis en valencià com a marca: Tonico, Paco, Fotrem, lletres de fornada;
conceptes traduïts: fornada→batch, farciment→filler, entrenable→trainee,
parte→weekly report, aparador→showcase…). Rols: «Lineup A — competitive» /
«Lineup B — training only».
**Veu de Paco en anglés:** mateix personatge (sec, concret, acaba en acció, sap
callar). Tics amb equivalent anglés — **«Che» → «Oi»**, «Ep» → «Look», «cap» →
«boss», «Tu diràs» → «Your call», «Cosa teua» → «Up to you». Apuntat a
`docs/veu-paco-meseguer.md`.
**Preferència d'idioma:** selector a registre i a l'app; es desa a `usuaris.idioma`
(camp ja existent) via `/api/idioma`; el client la guarda a localStorage i la
sincronitza en entrar.

## 2026-07-19 · POLIT #4.1c · La fornada és unitat de VENDA (esmena de doctrina)
**Context:** el codi deia «només els entrenables tenen fornada»; un desplaçat a
venda podia perdre el vincle amb la seua cohort.
**Decisió (amb Miquel):** un membre desplaçat de `entrenable` a `venda` **conserva
la lletra** — es ven amb la finestra de la seua fornada (el juvenil A amb A1).
L'assignació automàtica no toca els no-entrenables. Documentat a
`docs/classificacio.md`; protegit per test a `classif_persist.mjs`.

## 2026-07-19 · POLIT #3.4 · Principi de derivació (regla formal)
**Regla:** tot allò derivable de les dades es deriva. L'entrada manual només és
legítima per a **(a)** fets del món absents dels CSV (preus, personal, divisió/mode,
imports, identitat), **(b)** decisions genuïnes de l'usuari (overrides, desfés, motius
de baixa) i res més; **qualsevol altra entrada manual és un DEFECTE**.
**Revisió:** l'inventari `ENTRADES_MANUALS.md` s'ha reclassificat entrada per entrada
amb la seua legitimitat (a)/(b); cap queda com a defecte després del Polit #3. El
darrer sospitós, el **capital d'inflexió**, es demanava en fred (defecte) → passa a
estimació (Polit #3.5). La **nòmina** ja es derivava del sou (P7a).
**On viu:** la regla encapçala `ENTRADES_MANUALS.md`; ací en queda constància.

## 2026-07-19 · POLIT #3.1 · Regla d'or: «ACTUA, INFORMA, DESFÉS» (canvi de contracte protegit)
**AUTORITZACIÓ EXPLÍCITA:** Miquel autoritza este canvi de doctrina sobre un
contracte protegit (la regla d'or) en l'Orde de polit #3, punt 1. Els tests de
contracte s'actualitzen en conseqüència (`reconciliacio.mjs`, `classif_persist.mjs`,
`anti_soroll.mjs`, `regla_or_bucket.mjs`).
**Context:** la doctrina anterior deixava TOT desplaçament com a «decisió pendent»
(pregunta) fins que l'usuari l'acceptava. Amb dades setmanals fiables, això generava
cua de preguntes per a moviments que Tonico ja sap resoldre.
**Decisió:** el secretari **ACTUA**:
- Desplaçament per damunt del `llindar_intercanvi` → **s'EXECUTA** (l'entrant ocupa
  la plaça, el desplaçat baixa per l'embut) i **s'INFORMA** al parte amb botó **Desfés**.
- Per davall del llindar → **silenci** (ni pregunta).
- **ÚNICA pregunta que resta:** quan el desplaçat és **MANUAL** (decisió humana);
  mai sobreescrivim en silenci una decisió de l'usuari → pregunta prèvia.
- **Desfés** restaura l'estat previ complet (entrant a `categoria_previa_entrant`,
  desplaçat a la plaça). Un desfés equival al rebuig antic: activa el fre anti-soroll
  (no es re-executa fins que la diferència cresca substancialment).
- Els auto-moviments **mai encadenen efectes irreversibles** (cap transacció ni baixa):
  només reclassifiquen categories.
**Conseqüència:** ALR_SENSE_CATEGORIA no pot disparar-se per esta via (els moviments
empenten els dos costats a la vegada; no hi ha limbe). La regla queda com a xarxa de
seguretat. La secció «Decisions pendents» passa a **«Moviments»** amb dos llistes
(fets automàticament amb Desfés · preguntes prèvies per manual).
**Implementació:** migració 018 (columna `categoria_previa_entrant`, estats
`executat`/`desfet`); `lib/reconciliacio.js` torna `{autos, moviments, preguntes}`;
`functions/api/intercanvis.js` accions `desfer`/`acceptar`/`rebutjar`.
**Alternatives:** mantindre la pregunta per a tot (cua de decisions, contradiu el rol
de secretari que actua); executar també sobre manuals (sobreescriuria decisions humanes).
**Revertir:** la migració 018 és additiva; tornar `reconcilia` a proposar en compte
d'executar (no recomanat, autoritzat com a doctrina vigent).

## 2026-07-19 · POLIT #2.1 · Versionat de config + llindar d'intercanvi 0.25
**Context:** tot l'estat derivat (categories, fornades, alertes) es calculava
només en pujar; en desplegar codi o canviar poms, prod mostrava derivats vells
sense avisar (el juvenil C a venda). A més, el desafiament del 8é lloc
(el juvenil B 6.0 vs el juvenil A 5.5, diff 0.5) quedava per davall del llindar 1.0.
**Decisió:** (a) hash de config COMPLET (classificació+fornades+regles,
`lib/config_hash.js`); si el hash vigent ≠ el del derivat, el parte ho declara i
«Passa revista» regenera el pipeline sencer (`lib/pipeline.js`), idempotent i amb
la regla d'or. (b) `llindar_intercanvi` baixa a **0.25** (migració 016) perquè els
desafiaments reals del lloc límit (0.5) es proposen; el fre anti-soroll de rebuig
segueix vigent.
**Alternatives:** hash només de regles (no detectava canvis de classificació);
llindar 1.0 (silenciava desafiaments reals del 8é lloc).
**Revertir:** pujar `llindar_intercanvi`; el versionat és additiu.

## 2026-07-19 · POLIT #2 · Punts 3-8
- **P3** `/api/falten`: Paco demana les dades manuals que coixegen (caixa, personal,
  capital objectiu) amb àncora directa; desapareixen soles quan entren.
- **P4b** `/api/motius`: motiu de baixa; venda amb import crea la transacció d'un colp.
  Simplificació: el vincle de promoció (`jugador_origen_juvenil_id`) s'ompli des del
  jugador pendent; els candidats es suggerixen per coincidència de nom.
- **P4d** `/api/oferta`: avaluador de crides per a OFERTES NOVES (no per als de casa).
- **P5** l'ompliment de l'alineació prefereix adequació posicional; un porter mai a
  posició de camp (Castelló a porteria, no a MC). La Junta és restricció de l'alineador.
- **P6** guardià i18n (`test/i18n_guardia.mjs`): cap clau d'alerta/categoria/motiu pot
  quedar sense entrada (va caçar `motiu.fluix`/`sense_dades` que faltaven).
- **P7a** nòmina automàtica des del SOU de la instantània (fora l'apunt manual).
- **P7b** velocitat de TSI al comparador (dies reals). *Segon ús DIFERIT: entrar a la
  puntuació de places i a l'horitzó d'eixida quan hi haja historial (millora ja registrada).*
- **P7c** FORMA com a tercer rellotge de venda (`forma_minima_venda`, defecte 6).
- **P7d** LIDERATGE a la puntuació de futur_entrenador (experiència + lideratge).
- **P7e** FIDELITAT i QUALIFICACIÓ amb pesos xicotets al valor de mercat (pot demanar
  recalibrar el llindar de venda 12.5 amb dades reals).
- **P8** «Entrenable entrenable» i «pressupost 0» corregits; totes les seccions usen
  la temporada operativa.

## 2026-07-19 · POLIT #1 · El bucket no és categoria (correcció de la regla d'or)
**Context:** amb buckets MC/extrem dins la categoria `entrenable`, un jugador que
jugava d'una altra posició a l'últim partit canviava de bucket i desestabilitzava
la classificació (cas el juvenil C: Kirsch juga d'ED → proposta de desclassificar el juvenil C).
La posició jugada és EFECTE, no causa.
**Decisió:** `entrenable` passa a **aforament pla de 8** (els 8 millors per
puntuació creativitat+edat, migració 014); el repartiment MC/extrem el fa
l'ALINEADOR (tria 2 entrenables per entrenar d'extrem i la resta d'MC). La
classificació és ara estable davant la posició. Test protegit: `regla_or_bucket.mjs`.
**Conseqüència:** amb aforament pla, el juvenil B (20a, crea6 → 6.0) desplaça
el juvenil A (21a, crea6 → 5.5) com a 8é entrenable (factor edat). el juvenil C (7.5) dins.
Si es vol el juvenil A, cal recalibrar la puntuació (pom).
**Causa del contracte:** la reconciliació per-bucket proposava el desplaçament
intern com a eixent sense entrant → desclassificació. En llevar els buckets,
`entrenable` usa el camí d'aforament pla (ja testejat), sense instabilitat de posició.
**Revertir:** tornar `places`/`buckets` a la config d'entrenable (no recomanat).

## 2026-07-19 · POLIT #1 · Ajustos 2-8 (migració 015)
- **P2 Venda-pla vs llistat-fet:** la columna `Transferible` del CSV és l'estat REAL
  al mercat; «venda» és intent del pla. ALR_JUNTA_PORTER: urgent si llistat i sense
  jugar (la Junta el retindrà), suau (recordatori) si encara no està llistat. Millora
  el proxy de minuts anterior: ara la base és el llistat, no una data de partit fràgil.
- **P4 Mínim juvenil = 10** (abans 11): menys jugadors = revelacions i minuts menys
  diluïts = descobriment més ràpid. L'alerta operativa és la predictiva (ALR_CRIDA_JUVENIL).
- **P5 Alertes accionables:** ALR_COMPRA_ENTRENABLE porta el filtre concret + pressupost
  màxim = (caixa − `reserva_operativa`) / places. Amb caixa 0, demana apuntar-la.
- **P6 Crides només per a ofertes noves:** l'avaluador ix de la taula de Fotrem (no
  jutja els de casa). 15 anys: «acceptar llevat que siga clarament fluix» → `desconegut`
  NO és fluix (motiu 'sense_dades'), només es rebutja amb compost conegut per davall.
- **P7 Capital d'inflexió:** és un pom que posa Miquel; els 430k eren el cost de
  Salvatella (una partida). Sense pom, la projecció diu «objectiu per definir».
- **P8 Temporada operativa:** una sola font (`temporadaOperativa`): la setmana final
  és pretemporada de la següent. Parte, plantilla i pla mostren la mateixa temporada.


Defectes raonables presos sense consultar (regla 1 del mode). A repassar en el polit.
Format: data · context · decisió · alternatives · com revertir.

---

## 2026-07-18 · Calendari de mercat (Fase 6.1 / 0.2) — fases i modificadors
**Context:** cal un calendari de mercat per setmana de temporada per a les
recomanacions de venda/compra amb «dos rellotges». No hi ha xifres exactes a
l'especificació.
**Decisió:** taula `calendari_mercat` (global, poms) sembrada amb 3 fases sobre
16 setmanes: recuperació (setmanes 1-3, +10%), demanda plena (4-11, 0%),
depressió final (12-16, −15%). Modificador = ajust estimat del valor de venda.
**Alternatives:** corba contínua per setmana; fases per divisió.
**Revertir:** editar files de `calendari_mercat` (res al codi).

## 2026-07-18 · Dos rellotges (0.2) — comparació aniversari vs mercat
**Context:** una recomanació de venda ha de comparar la pèrdua per aniversari amb
el diferencial de fase de mercat. Quantificar la «pèrdua per aniversari» exacta
no és trivial des del CSV.
**Decisió:** heurística: si el jugador (en venda) fa anys a la vora i el mercat
està en depressió amb recuperació a ≤ `mercat_espera_max` setmanes, Paco recomana
esperar i ho diu amb els dos rellotges. Si no, finestra de venda normal. El
modificador de mercat és el diferencial; la pèrdua per aniversari s'aproxima amb
el pom `aniversari_perdua_pct`.
**Alternatives:** model exacte de sou/TSI per aniversari (requerix més dades).
**Revertir:** poms a `plantilles_parametres` / `calendari_mercat`.

## 2026-07-18 · Parte de Paco — base declarada i «revisió» (0.1)
**Context:** evitar la calma falsa (dir «tot en orde» sense haver executat les
regles contra la instantània vigent).
**Decisió:** taula `revisions_alertes` (usuari_id, instantania_id, config_hash).
El parte declara sempre la instantània base. «Tot en orde» només si hi ha revisió
per a la instantània més recent amb el hash de config vigent; si no, «Encara no he
passat revista» + botó de regenerar. Canviar regles/paràmetres canvia el hash →
demana re-revisió.
**Alternatives:** re-executar sempre en carregar la pàgina (cost i no-determinisme).
**Revertir:** taula i columna aïllades; el motor segueix sent idempotent.

## 2026-07-18 · ALR_JUNTA_PORTER — recordatori, no detecció de minuts
**Context:** el CSV no dóna minuts jugats, i el test del cas real vol l'alerta de
Castelló encara que tinga partit recent. No es poden mesurar els 60' des del CSV.
**Decisió:** la regla dispara com a RECORDATORI permanent per a tot porter notable
(`porteria >= porteria_min`) en venda, sense condició de minuts. La doctrina
d'alineació (Fase 3) és qui li garantix els 60'.
**Alternatives:** condició de partit recent (proxy fràgil, falla el cas Castelló).
**Revertir:** reintroduir condició de minuts quan CHPP done minuts reals.

## 2026-07-18 · ALR_ANIVERSARI — categories venda + entrenable
**Context:** el cas real vol Pasiego (venda) i Kirsch (entrenable) al parte.
**Decisió:** la regla dispara per a `venda` i `entrenable`. Per a venda és una
RECOMANACIÓ (dos rellotges amb el mercat); per a entrenable és un FET (nota de
sou/valor, sense mercat).
**Alternatives:** només venda (perdria Kirsch).
**Revertir:** pom `categories` de `ALR_ANIVERSARI` a `regles_parametres`.

## 2026-07-18 · Pla mestre T83→T91 — divisions/modes per definir
**Context:** l'especificació dóna els ESDEVENIMENTS clau (A1 ix T84, A2 T85-86,
V veterans T86, inflexió T88 amb Salvatella→entrenador ~430k€, General→Tribuna,
resistència), però no la divisió ni el mode competitiu de cada temporada.
**Decisió:** carregue els esdeveniments com a dades (`plans_temporades`) i deixe
`divisio_prevista` NULL i `mode` amb la fase (fabrica/inflexio/competitiu). Miquel
ompli divisions/modes reals al formulari del pla.
**Alternatives:** inventar una progressió de divisions (risc d'inventar doctrina).
**Revertir:** editar `plans_temporades` al formulari (res al codi).

## 2026-07-18 · Alineació (Fase 3) — crisi simplificada
**Context:** la doctrina 1.1.7 defineix un orde de sacrifici fi (resultat →
entrenament d'extrems → entrenament de MCs). L'optimitzador complet de crisi
(reassignar extrems a un sol partit per alliberar cossos) és complex.
**Decisió:** v1 assigna els entrenables a les seues places (maximitza
entrenament), ompli amb farciment/venda i genera avisos de cobertura («X/8
entrenen», motiu) + slots buits. No reorganitza automàticament en crisi.
**Alternatives:** optimitzador de crisi complet (solucionador de restriccions).
**Revertir:** el motor és pur i testejat; ampliar `alinea()` amb la reorganització.

## 2026-07-18 · ALR_FINESTRA_MERCAT — missatge sense fornada concreta
**Context:** l'exemple deia «prepara Y€ per a la fornada B», però «B» és una
compra futura que encara no existix com a dada.
**Decisió:** el missatge parla de «la fornada següent» en genèric; el filtre de
cerca (pàgina Mercat) ja concreta el perfil i el pressupost.
**Revertir:** enriquir el missatge amb la fornada quan el pla la modele.

## 2026-07-18 · Fotrem (Fase 7) — potencial i compost
**Context:** l'avaluador de crides usa «potencial» i «compost» sense definició
numèrica exacta.
**Decisió:** `potencial_max` = màxim dels potencials coneguts; `compost_max` =
màxim dels actuals coneguts. Els «desconegut» (?) i buits s'ignoren en el màxim.
**Alternatives:** suma/mitjana ponderada d'habilitats.
**Revertir:** ajustar `vistaJuvenil` (pur, testejat) i els poms `crida_llindars`.

## 2026-07-18 · Personal (Fase 8) — no declarat = 0
**Context:** un usuari nou no ha declarat el seu personal.
**Decisió:** un element no declarat compta com a 0; això dispara l'alerta de
desquadre (recordatori de muntar el personal de la fase). No és soroll: és
la configuració que falta.
**Revertir:** pom o condició de «no avisar fins que declare alguna cosa».
