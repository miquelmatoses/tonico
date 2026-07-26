# Tonico — registre de decisions (mode autònom)

## 2026-07-26 · QUATRE CORRECCIONS: repartiment per lloc, històric per setmana, i dues més

**1. El pressupost es repartia entre 5 TIPUS de lloc, no entre els 11 LLOCS.** El full sempre
ha dit «SUMA(pesos de tots els llocs)»; el codi sumava els buckets deduplicats i després donava
el pressupost sencer de cada tipus a **cadascun** dels seus llocs. Els tres MC rebien 3.197 €
cadascun. **L'11 ideal eixia a 19.430 €/setmana amb un sostre de 10.290 — 1,9×.**
Direcció de l'error, que no era neutra: mancances inflades (→ comprar) i sobrecost menor
(→ ningú sembla sobrepagat), just quan Miquel ja va un 3% per damunt del sostre de despeses.
*Per què cap guardià el va vore:* el G1 verificava `pressupostSou` amb `{a:3, b:1}` —un lloc per
tipus— i amb un lloc per tipus les dues fórmules donen el mateix. **El guardià nou no és
aritmètic, és una PROPIETAT:** la nòmina de l'11 ideal ha de cabre sota el sostre. Això el bug
no ho pot complir per casualitat.

**2. HISTÒRIC ECONÒMIC PER SETMANA** (`setmanes_economiques`) + mitjana de 8 setmanes + stopper.
Decisió de Miquel: *«la mitjana de flux que usarem per als càlculs, les últimes 8 setmanes»*.
- **Per setmana i NO per període**, i la raó importa: cada declaració dona «la passada» i
  «esta», i la setmana següent la que era «esta» es torna a declarar. **Les declaracions se
  solapen.** Guardant períodes, cada setmana comptaria dues vegades. Guardant setmanes, el
  solapament és una actualització.
- **La identitat no es demana, es deriva**: `fCalendari(data)` → temporada + setmana. Això
  també repara el defecte que jo havia introduït en llevar `periode_data` (una declaració no
  sabia a quines setmanes pertanyia).
- `calibrat = COMPTA(setmanes) ≥ 8`. **STOPPER:** `motiu_venda` no emet «sou desproporcionat»
  sense calibrar — és l'ÚNIC dels tres motius que penja del flux; l'edat i l'estructura de
  plantilla seguixen vives. I `puntsVenda` torna 0 sense calibrar, que si no ordenaria la
  llista per una xifra provisional.
- Neteja inclosa: `finances` arrossegava 17 columnes i en llegia 10. Fora sis mortes.

**3. El missatge d'obra d'estadi estava trencat** des del lot de la prioritat, i era meu:
interpolava `delta_flux` (renombrat a `delta_manteniment` → `undefined`) i `guany` (ara sempre
`null`, perquè l'estadi ja no es puntua). A més el text deia «t'allibera X cada setmana» quan
`delta_manteniment` és el que l'obra **AFIG**. Signe canviat i dos buits.

**4. Els nivells es pintaven com a números pelats.** L'escala de Tonico no és la de Hattrick:
compta des d'on el sou deixa de ser el mínim, o siga **nivell Tonico 1 = «Insuficient» (HT 5)**.
Un «nivell 5» sonava mediocre i era **Formidable**. Ara es diuen pel nom.
*Compte de disseny:* les claus van indexades pel nivell **de Tonico**. Fer `t('nivell_ht.' +
(n + 4))` a la vista seria aritmètica de domini a la presentació, que l'invariant 12 prohibix.

**I una de camí:** `taula_salaris` tenia el 129.150 € de Playmaking-Diví col·locat com a
`defensa` 16 (la cel·la buida de Defending va desplaçar la columna en llegir la guia). El test
`pesos.mjs` **afirmava el valor equivocat**, i per això no va saltar mai.

## 2026-07-26 · LA UNITAT D'UNA XIFRA ES DECLARA, no s'escriu a l'etiqueta
**Símptoma de Miquel:** *«però com dius que entren més de 100.000 € cada setmana, això com
és?»* No entraven: eren DUES setmanes (102.127 € = 51.064 €/setmana, i el gruix és el
patrocini, 40.500 €/setmana). Però l'app li donava la raó, perquè la targeta deia literalment
**«Flux setmanal»** damunt d'una xifra de període.

**Causa:** al lot del període bi-setmanal es va canviar el CÀLCUL i no l'ETIQUETA. Cap prova
mirava la coherència entre les dues coses, així que va anar a producció i va estar-hi fins que
Miquel va preguntar. **És la segona vegada que una unitat mal dita passa desapercebuda** (la
primera va ser `depressio_profunda` en enters contra fraccions).

**Decisió — la mateixa medicina que ja funcionava per a altres coses:** qui calcula, declara.
Igual que una alerta declara quins paràmetres són `diners` i quin porta el `compte`, ara
l'economia declara **la unitat de cada xifra** (`UNITATS` a `lib/economia.js`): `periode` ·
`setmana` · `estoc` (un saldo no té periodicitat). La vista pinta la unitat des d'`e.unitats`,
i **les etiquetes deixen de dir-la**. Amb la unitat com a dada, una etiqueta no pot mentir
perquè ja no afirma res.

Les caselles d'ENTRADA sí que poden dir-la (`Manteniment d'estadi (€/setm)`): allí la
periodicitat descriu el que Miquel escriu, no afirma res sobre una xifra calculada.

**De passada:** el sou sostenible ara ensenya també el **setmanal** al costat (10.291 €), que
és el número que es compara amb el sou d'un jugador i amb la taula de salaris. Ningú hauria de
dividir de cap. I `estoc.capçal` passa a dir el setmanal pel mateix motiu.

**Guardià nou (`test/unitats.mjs`):** tota xifra pintada ha de tindre unitat declarada, cap
etiqueta de xifra calculada pot contindre una periodicitat, i la vista ha de llegir-la de
l'avaluador. **Verificat reintroduint «Flux setmanal» a mà: el test peta.**

## 2026-07-26 · LA PANTALLA D'ECONOMIA: dos setmanes, i el rellotge de Paco arreglat
Tres coses demanades per Miquel, i la tercera amagava dos bugs.

**1. Visualització per setmanes.** Un bloc per setmana (la passada i esta) amb capçalera
pròpia i els MATEIXOS dos camps en el mateix orde dins de cada u: la lectura és horitzontal i
es veu d'un colp d'ull què falta. Les etiquetes van damunt amb alçada mínima fixa, així els
inputs queden alineats entre columnes encara que un text ocupe dues línies. El bloc «del club»
(caixa i manteniment) ocupa tot l'ample però reparteix els seus camps en columnes, perquè tots
els inputs del formulari tinguen amplada comparable. Verificat al navegador a 360, 480 i 760 px:
cau a una columna en mòbil. Nota: `.camp` ja era el camp de joc → classes `decl-*`.

**2. Fora «Disponible per a comprar».** I no només la targeta: **`caixa_disponible` i
`reserva_caixa` desapareixen del model**. La reserva d'ESTOC no s'ha usat mai (0 per defecte i
ningú la posava), i una derivada que sempre val igual que la seua entrada és un concepte de
més. El PAS 8 compara contra la `caixa` declarada. La reserva de FLUX (5%) es queda: eixa sí
que fa feina.

**3. «Que Paco em demane les dades si fa més de 7 dies».** Ja existia `ALR_DADES_VELLES`, però
**no hauria saltat mai**, per dos motius independents:
   - **El rellotge era la data de l'última INSTANTÀNIA**, no el dia de veres
     (`economia(db, id, instSenior.data)`). Si Miquel deixa de pujar CSV, es compara dada vella
     contra rellotge vell: la diferència es queda congelada i l'avís no salta —justament en
     l'únic cas en què fa falta. Ara `generaAlertes(db, id, hui)` rep el dia com a paràmetre
     (no un `new Date()` amagat: l'avaluador no pot tindre rellotges propis i els tests l'han
     de poder fixar) i el passa avant des de `regeneraPipeline`.
   - **`caixa_data` només s'escrivia la primera vegada** (`if (caixa != null && !caixa_data)`),
     o siga que la data de frescor es congelava a la primera declaració. Ara es reposa a cada
     desada.
   El llindar passa de `setmanes_avis_dades` (1) a **`dies_avis_dades` (7)**: Miquel ho ha
   demanat en dies i anomenar-ho en setmanes obligava a traduir cada vegada.
   **Regressió coberta** (`test/dades_velles.mjs`): calla als 7 dies justos, reclama al huité,
   i —el cas que importa— amb la instantània congelada al 18-07 i dos mesos passats **segueix
   reclamant**. Si algú torna a lligar el rellotge a la instantània, este test peta.

**Nota de procés:** la 072 ja estava aplicada a prod quan encara li afegia coses. Els canvis
tardans s'han separat a la **073**: una migració que ja ha corregut no es toca.

## 2026-07-26 · L'ECONOMIA SÓN QUATRE COSES (correcció de Miquel, i era greu)
**Símptoma de Miquel:** *«si t'he dit que Tonico només ha de tindre taquilla, patrocinadors,
diners disponibles i manteniment de l'estadi, de la setmana passada i esta, per què has fet
esta mamarratxada? CONTINUA PREGUNTANT-ME PER MOVIMENTS PREUS DE VENDA I XORRADES»**

**Causa:** el v3.1 va llevar l'ESTIMACIÓ de preu i es va quedar ahí. Tot el que hi penjava
seguia en peu, i cada peça seguia demanant dades que ja no decidien res:
1. El **formulari de moviments** de la pantalla d'Economia (tipus, import, jugador, data,
   nota) amb la seua llista de transaccions.
2. Els camps de **preu de la fitxa de venda** (`preu_eixida`, `preu_venut`), i una columna
   «proposat» que ja només pintava «—» perquè l'estimació havia caigut.
3. El **meu propi formulari de finances**, que havia quedat en NOU camps.

**Decisions:**
- **De l'informe es declaren QUATRE coses i cap més:** taquilla i patrocinadors *de la
  setmana passada i d'esta*, diners disponibles, manteniment d'estadi. L'estimació d'estadi
  (cost d'obra + manteniment futur + data) va a una targeta a banda: és d'una altra cadència
  (un colp per temporada, amb caducitat) i barrejar-la amb la declaració del període era part
  del soroll.
- **Les DOS setmanes es declaren literals**, i els ingressos del període són la seua suma.
  Efecte lateral valuós: desapareix la multiplicació per 2 del camí dels ingressos, o siga
  l'error que l'invariant 16 vigilava. Només les despeses (constants setmanals) es normalitzen.
- **Fora la comptabilitat de moviments sencera**: formulari, llista, `functions/api/transaccions.js`,
  `signa()`, l'apunt automàtic des de `motius.js` i `ALR_TRANSACCIO_PENDENT`. Amb la caixa
  DECLARADA i el flux eixint de taquilla+patrocini, apuntar moviment a moviment no alimentava
  cap decisió: el diner d'una venda apareix a la caixa del període següent. La **taula** es
  queda (té apunts fets per Miquel i esborrar-la seria destructiu), però ja no la llig ningú —
  i hi ha un test que ho prova: mig milió apuntat i la caixa segueix `null`.
- **Fora els camps de preu de la fitxa de venda.** `un_euro` passa a ser només un ESTAT
  (rellistar a la baixa), sense import. Un `preu_eixida` enviat per l'API s'ignora, i el test
  comprova que **tampoc s'escriu a la BD**: la porta es tanca, no s'amaga.
- La pantalla d'Economia serveix ara de `/api/finances`, que torna les xifres declarades **i**
  l'eixida de l'avaluador. La frescor la data `caixa_data`, que ja s'omplia sola: `periode_data`
  sobrava (un camp menys per a demanar).

**Neteja que arrossega:** 20 claus i18n mortes, les famílies `tipus.*` (moviments) i `font.*`
(d'on eixia el preu estimat), `test/economia.mjs` reescrit per a guardar el que valia —el camí
d'extrem a extrem des del CSV real— i tirar el que provava el subsistema mort.

**Lliçó de procés apuntada:** llevar la causa i deixar els consumidors en peu no és llevar-la.
Quan una peça cau, toca resseguir qui la demanava — formularis inclosos.

## 2026-07-26 · CONTRACTE v3.1 — SET CORRECCIONS SOBRE DADES REALS DE HT
Diagnosticades contra l'informe setmanal real de Benifotrem (T83). El full manda i s'ha
canviat primer (invariant 11); `formules.json` regenerat: **104 fórmules**. Registre de
forats obert i podat a `docs/FORATS.md`. **63 suites verdes**, G1/G2/G3 inclosos.

- **L'economia és BI-SETMANAL** (invariant 16 nou). En lliga es juga un partit a casa i un
  fora, així que la taquilla entra en setmanes ALTERNES: al fixture real, 0 € una setmana i
  21.127 € l'altra, sobre un flux net de milers. **L'oscil·lació era ~15× el senyal.** Es
  declara sempre el període TANCAT: la setmana en curs no està consolidada.
  Regla de normalització escrita al full perquè el factor 2 no s'esmunyisca en silenci: només
  la taquilla ve per període, tot lo altre × `setmanes_periode`. L'ÚNIC canvi de tornada a
  unitats setmanals és el PAS 4 (`taula_salaris` va en €/setmana) i **el fa l'economia, no
  cada orquestrador** — dos llocs dividint és com tindre dues fonts per a la mateixa xifra.
- **`premis` ix del flux i entra a l'estoc**: és una prima de final de temporada. I amb ell
  tot el que no siga extrapolable (club d'aficionats, comissions): `ingressos_recurrents =
  taquilla + patrocini`, i prou. Regla de Miquel: el que no es pot extrapolar només pot
  marejar el sostre de sou.
- **La reserva és una FRACCIÓ, no un import**: `reserva_flux_pct` = 0,05. Les despeses
  recurrents no poden passar del 95% dels ingressos. Canvia la FORMA de `sou_sostenible`,
  no el valor d'un pom.
- **`guany(estadi)` era matemàticament impossible de ser positiu.** Es calculava només des de
  l'estalvi de manteniment, i ampliar sempre el puja → Δflux < 0 → deltaNivell = 0 pertot →
  guany = 0 SEMPRE. L'estadi només podia «guanyar» encongint-se. **Correcció: no s'afig un
  número, s'esborra la comparació.** Amb prioritat absoluta, `guanyEstadi` i `deltaFlux`
  sobren sencers; del PAS 8 de l'estadi només queda l'admissibilitat. I NO es declara la
  taquilla esperada de l'obra: predir-la seria projectar dins d'una decisió (invariant 3), i
  no cal — s'OBSERVA al període següent. Caducitat a 10 setmanes sobre `estadi_data`, que ja
  existia: cap camp nou.
- **L'estadi té PRIORITAT ABSOLUTA** (corregix el canvi 6 del v3). És l'única compra que MOU
  EL FLUX: un fitxatge consumix el pressupost, l'estadi aixeca el pressupost mateix i amb ell
  el `nivell_objectiu` de tots els llocs alhora. Optimitzar dins de la restricció i relaxar la
  restricció no són del mateix rang; comparar-los per eficiència era l'error.
- **DUES bases de personal.** El contracte deia «tot el personal cobra igual». Fals:
  especialistes 1.020, entrenador 1.250. Demostració que ho va destapar: tota suma de nivells
  amb base 1.020 és múltiple de 1.020, i els 5.000 € de l'informe no ho són (5.000/1.020 =
  4,90). Ara el fixture es reconstruïx exacte — 3 especialistes de nivell 2 + entrenador de
  nivell 3 = **11.120 €**, la xifra de HT — i valida també `prioritat_personal` sencer, amb el
  psicòleg correctament absent (divisió VII < `divisio_psicoleg` = III). La base viu dins de
  `prioritat_personal`, que ja dirigia el bucle → dades, no codi.
- **`despesa_planter` es DERIVA**: instal·lacions si hi ha acadèmia + 5.000 × `n_cercapromeses`
  (1..3 en QUALSEVOL mode). El `sistema_juvenil` són tres MANERES D'OPERAR, no tres coses que
  tens: el cercapromeses sempre hi és, i mode `cap` **no vol dir cost zero**.
- **FORA l'estimació de preu de venda** (`lib/preu.js` esborrat). No canviava cap decisió que
  no es puga prendre millor amb el fet real: l'orde de venda el porta `sobrecost` (xifra
  pròpia) i «es ven o s'acomiada» el decidix la SUBHASTA. Amb ella cauen `valor_net`,
  `valor_net_promo` i la branca `PROMOCIONA_I_LLISTA` del PAS 10 — que era el
  juvenil-com-a-negoci que el canvi 9 del v3 ja havia retirat. El PAS 10 queda amb dos
  branques: si no arriba al nivell del lloc, no servix, i no hi ha preu que ho canvie.
  El que sobreviu del PAS 7 (motiu, orde, destí, la pregunta de la subhasta) es muda a
  `lib/vendes.js`.
- **Invariant 17 (finestra de declaració):** si Tonico consumix una dada que no pot derivar,
  eixa dada té finestra. Noves finestres: període tancat, taquilla, patrocinadors, els tres
  números de la calculadora d'estadi i `n_cercapromeses`. Fora del formulari el planter (ara
  derivat) i `ingres_setmanal` (amb el seu fallback i el flag `ingressos_desglossats`, que
  eren la maquinària de tapar un buit que ja no existix).
- **Invariant 18 (dada vella ≠ absent ≠ zero):** `ALR_DADES_VELLES` i `ALR_ESTADI_CADUC`.
- **Balanç del diff:** se'n van `lib/preu.js` sencer, `guanyEstadi`, `deltaFlux`, el fallback
  d'`ingres_setmanal`, el flag `ingressos_desglossats`, `valorNetPromo`, `PROMOCIONA_I_LLISTA`
  i el pom mort `reserva_operativa`. S'afigen 6 poms, 2 camps i 2 regles. **No hem inflat el
  sistema: sobretot l'hem corregit.**

**PUNT DE PARADA (C-01):** els dos partits del fixture eren AMISTÓS i COPA, no de lliga. Encara
**no tenim ni una dada de taquilla de lliga**, així que el codi està verificat contra els seus
fixtures però **el model no està calibrat contra la realitat**. Cap número de flux és creïble
fins que passe un període bi-setmanal amb lliga de veres.

## 2026-07-26 · CORRECCIONS DEL FULL (F1-F3) + SIS VIOLACIONS D'INVARIANT
**Correccions del contracte, aprovades per Miquel:**
- **F1 · Restricció 15**: cap derivació que depenga del PAS 0 s'executa amb el PAS 0
  incomplet. El sistema informa què falta i no toca res.
- **F2 · Fora `compatible(j, lloc)`** del PAS 9. Era vàcua i el concepte sobrava:
  l'assignació és MAXIMITZACIÓ PURA i qui discrimina és `valor(j, lloc)`. Invariant nou:
  cap lloc queda buit havent-hi un retingut disponible.
- **F3 · `flux_lliure = MAX(0; flux + cost_personal_actual − reserva_flux)`**: el cost del
  personal actual ja va restat dins del flux, així que el bucle es veia sense marge just per
  tindre el personal que estava valorant. Ara simètric amb `sou_sostenible`.

**Violacions trobades per propietat sobre l'estat viu:**
- **I1 (a)** · `P2.max_partits`: el codi tractava un lloc que NO entrena com si fóra al 100%
  (màx 1 partit). El full diu `pct(lloc(j)) < 100 → 2`, i un lloc que no entrena té pct 0.
  Efecte real: 1 lloc buit amb 6 titulars lliures. Verificat: 22/22 assignacions, 0 buits
  amb candidat, 0 assignats superats per un lliure.
- **I2 (a)** · `P7.pregunta`: el dispar estava lligat a l'estat de la FITXA (que es queda
  `llistat` fins que algú responga), no a la transició de `transferible` entre INSTANTÀNIES.
  La pregunta no disparava MAI. Quatre jugadors reals van eixir del mercat el 22-07 sense
  venda apuntada i dos alhora constaven de `titular`: dos seccions dient coses incompatibles.
- **I3 (a)** · invariant 12: `alerta.llistar_ja` interpolava un sou sense declarar-lo com a
  import → es pintava en cru. **Regla**: el G2 comprova ara TOTES les emissions d'alerta i
  peta si un import no es declara a `diners` (verificat llevant la declaració).
- **I4 (a)** · invariant 10: l'alineació emet `motiu: 'llistat'` i la clau no existia. **Regla**:
  el guardià DERIVA el domini de motius de les dues funcions productores. De pas es va
  descobrir que el meu primer extractor llegia per línia i l'assignació ocupa dues:
  el domini eixia buit sense dir-ho, i ara una asserció ho impedix.
- **I5 (a)** · la VENDA no rebia puntuació; el full sí que li dona clau d'orde (`P7.ordre_venda`
  = sobrecost DESC). **Regla**: test per a TOT rol de `ROLS`, no per als que fallaven.
- **I6 (a)** · tres taules pintaven capçalera abans de saber si hi havia files. **Regla**: un
  ajudant únic (`graellaAmbFiles`) que es nega a pintar una taula buida, i un test que peta
  si apareix una capçalera sense guarda.

**Tensió del contracte que queda anotada (no tocada):** `porters_n = 1 × partits_setmana` reté
2 porters, però amb `max_partits` un porter en lloc que no entrena pot jugar els DOS partits.
El resultat fidel al full és que el segon porter es reté i no juga. Si el v3 és LEAN, potser
`porters_n` hauria de ser 1: decisió de Miquel.


## 2026-07-26 · PUJADA DES DEL MÒBIL: el fitxer es jutja pel contingut
**Símptoma de Miquel:** al mòbil no es podien pujar els CSV, «com si fóra un format no
acceptat»; a l'escriptori, cap problema. **No era el seu telèfon.**

- **Causa:** els dos inputs de fitxer portaven `accept='.csv'`. El servidor no valida ni
  extensió ni MIME (només llig el contingut), així que el filtre no protegia de res i sí
  que bloquejava: iOS tradueix l'extensió a UTI i, si el fitxer no ve etiquetat com a CSV
  (baixat des del navegador, vingut d'una app de núvol, sense extensió), el mostra **en
  gris i no es pot triar**. A Android, molts proveïdors declaren
  `application/octet-stream` i el filtre se'ls menja igual.
- **Decisió:** el filtre del selector és **comoditat, no validació**. S'amplia a les formes
  amb què un CSV legítim arriba de veres des d'un mòbil, i qui decidix si el fitxer val és
  el **contingut**. Viu en una sola constant (`ACCEPTA_CSV`) perquè els dos inputs no
  divergisquen.
- **A canvi, el rebuig es fa llegible:** el servidor distingix `fitxer_buit` de `no_es_csv`
  i diu de quin fitxer parla, en compte de deixar caure un error de parseig. Abans, un
  fitxer equivocat donava un missatge tècnic.
- **Regressió coberta** (`test/pujada_mobil.mjs`): els sis casos de com arriba un CSV des
  del mòbil han de passar, i el test **falla si algú torna a posar un `accept` estret**.


## 2026-07-26 · TANCAMENT DEL v3 (fet i verificat a prod)
- **Fusionat a `main`** i desplegat des de main. Abans el codi viu no estava a cap branca
  desplegable: qualsevol desplegament de main hauria tornat al model vell.
- **P1 — l'entrenament és PRESCRIPCIÓ**: (A,B) = (creativitat, passades) són poms del
  contracte, no `fases_config` ni un override del pla. `desquadreEntrenament` compara la
  4-tupla sencera (canviar només la intensitat també és desquadre).
- **G1: de 59 a 99 de 100.** Tota fórmula amb codi té entrada al guardià. Una fórmula amb
  test propi però sense vigilància podia divergir del full sense avís, que és el contrari
  del que el G1 existix per fer. **Cap «implementada però no vigilada».**
  L'única pendent és `V.hores`: `hores_pais` està buida perquè la guia no publica el
  dia/hora d'economia per país, i es declara per usuari.
- **El mirall baixa de 104 a 100**: quatre línies de P11 eren PROSA que el generador
  capturava com a fórmula. Corregit al FULL, no al generador.
- **Les tres pantalles, cablades.** Mercat serveix el bucle d'estoc (opcions ordenades per
  eficiència, amb l'obra d'estadi quan els números estan declarats i el motiu derivat de
  cada opció); Personal serveix el pla de flux amb el que toca fer per tipus; Vendes fa la
  PREGUNTA amb les quatre eixides i les desa. `test/pantalles_v3.mjs` ho fixa.
- **G3 actiu** (deixa de ser bastida): 27 valors de pantalla comprovats contra l'avaluador
  —caixa, flux, sou sostenible, divisió normalitzada, eficiència de cada opció, cost de
  cada nivell de personal, el preu i el valor net de cada fitxa, i el nivell de cada
  alerta. **Decisió de disseny:** el golden comprova la FONT de cada valor (que la vista no
  se'l fabrique pel camí) en compte de renderitzar DOM, que és el que l'invariant 13 vol
  protegir i el que es pot verificar sense navegador.
- **Efecte del contracte que queda anotat, no amagat:** `rotatius` es tria només per hab(A)
  sense mínim, així que amb pocs jugadors de l'habilitat entrenada el model arrossega gent
  sense eixa habilitat cap a rotatiu.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L10, L11 i L12 (fet i verificat a prod)
- **L10 — bucle d'estoc** (migració 065). Jugadors i estadi competixen pel mateix diner amb
  la mateixa unitat: guany d'un fitxatge = mancança×pes; guany d'una obra = el que el seu
  Δflux DESBLOQUEJA on hi ha mancança. Guanya la millor relació guany/cost, no el guany més
  gran. **Estadi: no es modela, es DEMANA** (la guia §10 delega en calculadores) — l'usuari
  declara manteniment i cost d'obra de la configuració NRG i Paco els reclama amb l'adreça.
- **L11 — personal** (migració 064). Tot el personal cobra igual: `staff_cost_base × 2^(n−1)`.
  Per això **no hi ha comparació d'eficiència entre tipus** (hauria exigit inventar els
  efectes d'assistent, metge i psicòleg, que la guia no publica): prioritat fixa i cada
  tipus s'emporta el nivell que el flux restant sostinga. **Acomiadar no existix.**
- **L12 — informe i agenda** (migració 066). `urgencia_tipus` i les llindes passen a poms.
  **Les llindes 70/55 vivien a la VISTA** (`seccions.js`), que és el que l'invariant 12
  prohibix; ara les llig l'avaluador i la vista només tria classe. Igual amb l'anell
  d'entrenament (`pct >= 100`), que ara el calcula el PAS 9.
  **Baseline del G2: de 9 a 6**, i les 6 que queden són **excepcions declarades i
  justificades línia a línia** — totes són comprovacions de presència («n'hi ha o no») o de
  flux, no llindes de domini.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L8 (fet i verificat a prod)
- **L8 — alineacions per PES** (migració 062, desplegada en el mateix lot). `lib/onze.js`
  substituïx `lib/alineacio.js` (retirat): l'onze es munta greedy pels llocs de més pes,
  amb `valor(j,lloc)`, `disponible(j,lloc)` i `max_partits` del contracte.
  **Decisions no trivials:**
  1. **`max_partits(j)` depén del LLOC QUE OCUPA, no del lloc candidat.** Avaluant-lo per
     candidat, un del nucli ja col·locat en un lloc al 100% podia doblar en un altre al 50%
     i «robar» la setmana d'un rotatiu. El full diu `pct(lloc(j))`: el lloc que ja té.
  2. **El futur entrenador ja NO té llocs regalats.** El model vell el posava de davanter
     als dos partits; el v3 només li permet doblar (`max_partits`=2) i ha de guanyar el
     lloc pel seu valor.
  3. **`pes_entrenament` declarat i etiquetat** (1000). És el que val ENTRENAR en un lloc
     que entrena, contra l'habilitat que aportaria un altre. Va alt a posta: protegir la
     setmana del nucli és el que el model vol. NO és mecànica de joc.
  4. **En una setmana d'un sol partit, un lloc al 50% no es compta com a entrenament
     perdut**: no pot arribar al 100% i no és culpa de ningú.
  5. Tests: les propietats del motor (exclusions, doblatge, compatibilitat, llocs buits,
     fixats) passen a `test/onze.mjs`; `test/alineacio.mjs` es queda amb la integració amb
     la BD. Els blocs que cridaven el motor retirat s'han retirat amb ell.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L7 (fet i verificat a prod)
- **L7 — vendre** (migració 061, desplegada en el mateix lot). `lib/preu.js` és ara la
  **ÚNICA fórmula de preu del sistema**: Vendes, l'Economia i el bucle d'estoc la consumixen.
  **Decisions no trivials:**
  1. **`depressio_profunda` passa a FRACCIÓ (−0,20).** Estava en enters (−20) contra un
     modificador que no baixa de −0,15: **la branca d'ajornar per depressió no s'activava
     MAI**. Verificat a prod. El test fixa les dues unitats perquè no torne a passar.
  2. **`min_mostres` = 3, declarat.** Abans «calibrat» era implícitament ≥1 comparable. És
     política de prudència, no mecànica: va com a pom.
  3. **`factor_habilitat` es mesura amb la MILLOR habilitat.** El full no en qualifica cap
     («com de bo és el jugador»), i el mercat mira la millor. Amb el mapatge per lloc no
     diferenciava res. **I «desconegut» val 1 (el preu base), no 0**: no saber-ho no és
     que el jugador no valga res.
  4. **La clàusula de porter valuós desapareix d'`urgent(j)`.** El v3 el reduïx a
     l'aniversari; la depreciació de porter la governava la Junta, retirada a L0.
  5. `estimacio_per_divisio` → `base_preu_divisio` (nom del contracte), i `lib/vendes.js`
     queda com a simple reexport de la font única perquè cap punt de decisió es faça la
     seua pròpia fórmula de preu.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L6 CABLAT (fet i verificat a prod)
- **El PAS 6 mana ara a l'app** (migració 060, desplegada en el mateix lot).
  `classificaEquip` deixa de cridar el classificador de categories i construïx la plantilla
  del v3. Les categories passen a `core·rotatiu·titular·porter·cos·venda·futur_entrenador`,
  amb conversió de les ja assignades (`entrenable→core`, `farciment→cos`,
  `nucli_competitiu→titular`, `experiencia|alliberament→venda`).
  **Decisions no trivials:**
  1. **El mecanisme necessitava una magnitud.** `reconcilia` distingix un guany lliure d'un
     DESPLAÇAMENT per l'aforament i mesura si val la pena per la puntuació. Passant-li rols
     sense capacitat ni punts, tot es tornava un «auto» silenciós i el desfés desapareixia.
     Ara `construeixPlantilla` torna `punts` (el mèrit que ha posat cada u al seu rol) i els
     rols porten la capacitat del PAS 6.
  2. **Una millora encadena desplaçaments.** Amb rols amb capacitat, un jugador que creix
     entra al core i empeny cap avall (core→rotatiu→cos). El test ja no fixa el NOMBRE de
     desplaçaments (era artefacte del model vell): fixa que cadascun s'informa i es pot
     desfer, que és el que el contracte garantix.
  3. **El futur entrenador NO el tria el sistema.** El PAS 6 no el selecciona: és un override
     de l'usuari (invariant 5). El test el fixa a mà, com ho farà l'usuari.
  4. **Sense `partits_setmana` no hi ha nucli.** Els tests han hagut de declarar la config,
     com un usuari real: la fórmula no suposa res.
  5. **3 tests esborrats per defensar doctrina morta** (`plantilla_categories`,
     `plantilla_punts`, `regla_or_bucket`: puntuacions i buckets del model fàbrica). La
     xarxa ara és el G1. La resta s'han reescrit contra el v3.
  6. **Vocabulari: 0 ocurrències** de `entrenable/farciment/alliberament/fàbrica/fornada/
     supporter` a l'i18n i a les pantalles. `rol.fabrica_*` → `rol.onze_*`;
     `ALR_ENTRENABLE_SENSE_MINUTS` → `ALR_NUCLI_SENSE_MINUTS`.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L4 (fet i verificat a prod)
- **L4 — pesos i nivell objectiu** (migració 059, desplegada en el mateix lot). `lib/pesos.js`
  amb `pes(lloc)`, `pressupost_sou(lloc)` i `nivell_objectiu(lloc)`.
  **Origen de cada número (cap inventat):**
  · `taula_aportacio` ← guia §4, parsejada de l'ESTRUCTURA HTML de la taula, no del text
    pla (el text pla perd l'alineació de columnes en les files amb cel·les buides i
    hauria assignat percentatges a la columna equivocada). 20 posicions × 10 sectors.
  · `pes_central`=0,36 i `pes_banda`=0,255 ← guia §5 (36,0% de les ocasions pel mig,
    25,5% per cada costat).
  · `taula_salaris` ← guia §8, nivells 1..16 (Insuficient..Diví). Creativitat i Anotació
    no publiquen el 16: la taula ho reflectix i `nivell_objectiu` s'hi para.
  · **Únic pom NO CALIBRAT: `pes_mig`** (defecte 1,0). La guia diu que el mig decidix QUI
    té l'ocasió, però no publica quant pesa contra els sectors. Va etiquetat.
  · `posicio_aportacio` i `taula_habilitat_lloc` són el pont entre els llocs de la
    formació i la matriu/escala de salaris.
  **Propietat verificada al test:** més flux mai dona menys nivell (monotonia), i el mig
  camp és el lloc que més pesa, que és el que el model afirma.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L3 (fet i verificat a prod)
- **L3 — economia flux/estoc** (migració 058, desplegada en el mateix lot).
  `ingressos_recurrents` (taquilla+patrocini+premis), `despeses_fixes`, `flux`,
  `sou_sostenible = MAX(0; flux+nòmina−reserva_flux)`, `caixa_disponible = MAX(0;
  caixa−reserva_caixa)`.
  **Decisions no trivials:**
  1. **La caixa deixa de tindre fallback silenciós.** Abans, si no estava declarada, requeia
     a `SUM(transaccions)` i una derivada es feia passar per saldo real. Ara torna `null` i
     Paco la demana. Mateix criteri per al flux: sense ingressos declarats no hi ha flux, i
     es diu, en compte de fabricar un zero.
  2. **Ingressos: el total heretat es respecta.** No es podia repartir `ingres_setmanal` en
     taquilla/patrocini/premis sense inventar-ho, i tampoc es podia llançar la dada de
     l'usuari. S'usa el total mentre no hi haja desglossament i es marca
     `ingressos_desglossats:false` perquè Paco el demane.
  3. **Cau tot el subsistema de projecció**: `capital.js`, l'objectiu de capital,
     la trajectòria, ALR_TRAJECTORIA_INFLEXIO i els poms `inflexio_*`. El v3 no projecta
     dins d'una decisió (invariant 3).
  4. **DIVISIÓ NORMALITZADA JA** (punt 1 de l'orde): `lib/divisio.js` amb format intern
     romà, conversió en els dos sentits i test propi. La divisió de l'usuari estava
     declarada com a `"7"` i les taules del joc van en romà: **l'estimació de preu queia
     en silenci al valor per defecte**. Migrada a `VII` i verificada a prod.
  5. **La secció «Pla mestre» es retira** (punt 2 de l'orde). Estava òrfena des que va caure
     `plans_temporades`. La substituïx **Configuració**: estratègia activa i el PAS 0, amb
     el que falta marcat. Cap pantalla buida ni mig viva. Les claus `pla.*` i `fase.*` es
     retiren de l'i18n.
  6. `reserva_flux` i `reserva_caixa` són **política de risc declarada**, no mecànica de
     joc: defecte 0 i etiquetades com a tals.


## 2026-07-26 · RECONSTRUCCIÓ v3 · L0–L2 (fet i verificat a prod)
**Autoritzat per Miquel** (orde de reconstrucció completa L0–L12). Branca `v3-reconstruccio`.

- **L0 — retirada de fàbrica** (migració 056). Cauen les FORNADES senceres (2 mòduls, 2
  taules, 1 regla, 2 poms, 13 claus i18n, 9 fitxers netejats), el SUPPORTER i
  ALR_JUNTA_PORTER. **Decisió no trivial:** el desempat per fornada de l'alineació es
  substituïx per `horitzo_eixida(j)` (fórmula del v3), derivat d'`edat_pic_venda`, que ES
  QUEDA. La projecció econòmica deixa de comptar «fornades previstes»: el negoci que hi
  entra són les vendes actives.
- **L1 — calendari únic** (sense migració). `f_calendari(data, ancora, tempSetmanes)` a
  `lib/calendari.js` és ara l'única font de (temporada, setmana). `pla.js` i
  `orquestra_alertes.js` perden la seua còpia inline; abans eren tres implementacions que
  podien discrepar.
- **L2 — config i user-agnostic** (migració 057). Taula `config_usuari` amb els 5 camps del
  PAS 0. **Decisions no trivials:**
  1. La clau de configuració deixa de ser `'fabrica'` i passa a ser l'**estratègia**
     (`'competitiva'`). Afecta 30 fitxers de schema i els tests.
  2. **`plans_temporades` es retira sencera.** Portava el pla mestre d'UN equip (T83→T91,
     amb un nom propi dins) — exactament el que la regla d'or prohibix — i el v3 no té pla
     per temporada. La `divisio`, l'única cosa viva d'eixes files, passa a `config_usuari` i
     és el que consumix l'estimació de preu.
  3. `009_pla_mestre.sql` es buida de dades d'equip i es queda només amb ALR_CANVI_FASE.
  4. El destí d'un juvenil útil passa de `'fabrica'` a `'promociona'` (vocabulari v3,
     invariant 14); el pom `fabrica_min` passa a `util_min`.
  5. **Migració del compte existent, verificada per propietat:** estrategia=competitiva,
     divisió conservada, sistema juvenil derivat de tindre equip juvenil, **país i
     partits_setmana deixats a NULL a posta** — Paco els demana a l'informe, no se suposen.
     Instantànies (14) i vendes (4) intactes.
  6. **Pendent detectat per a L7:** la divisió declarada és `"7"` i `estimacio_per_divisio`
     usa numerals romans (`VII`). Cal normalitzar-ho quan es unifique `preu_esperat`, o
     l'estimació caurà silenciosament al valor per defecte.


## 2026-07-26 · CONTRACTE v3: TRES CORRECCIONS DEL FULL ABANS DE RECONSTRUIR
**Autoritzat per Miquel** (respostes a la parada per ambigüitat). El full es corregix, no
s'interpreta: `docs/FORMULES.md` actualitzat i `formules.json` regenerat abans de tocar codi.

- **1 `pes(lloc)` — la mètrica central.** El full demanava un escalar (`BUSCA(taula_aportacio;
  lloc)`), però la guia §4 dona una **matriu** (posició × sector) i no publica el pes dels
  sectors. **Decisió:** `pes(lloc) = SUMA(sectors: aportacio(lloc,sector) × pes_sector)`, amb
  `aportacio` de §4 (mecànica) i `pes_sector` de la **distribució d'ocasions de §5**:
  central 0,36 · bandes 0,255 cada costat · mig = `pes_mig` (pom; el mig decidix QUI té
  l'ocasió, no on cau). *Conseqüència:* la frase «mig > bandes > defensa > atac» del full era
  una pista descriptiva i queda **substituïda per la fórmula**; amb els pesos de §5 l'orde real
  que ix és mig > bandes > atac > defensa.
- **2 Personal (PAS 11) — reescrit.** No hi ha taula de sous de personal a la guia i 3 de les 4
  «monedes» de guany no tenen números. **Decisió de Miquel:** tot el personal cobra igual, només
  compta el nivell → `cost_flux(nivell) = staff_cost_base × 2^(nivell−1)` (1.020 · 2.040 · 4.080
  · 8.160 · 16.320). **Desapareix la comparació per eficiència**: se seguix una **prioritat fixa**
  (assistents → entrenador → metge → psicòleg, este últim només si `divisio ≤ divisio_psicoleg`)
  i cada tipus s'emporta el nivell més alt que el flux restant sostinga. Cap número inventat.
- **3 Estadi (PAS 8) — dades declarades.** La guia §10 delega en calculadores CHPP. **Decisió:**
  l'usuari declara, a l'inici de cada temporada, els valors de la configuració NRG de
  `url_calculadora_estadi`: manteniment (→ flux) i total costs (→ estoc). El *maximum payout* no
  es demana perquè no entra a cap decisió. `capacitat_objectiu` deixa de calcular-se
  (`assistencia_esperada × marge` fora): la configuració la dona la calculadora. Δflux =
  manteniment_actual − manteniment_nou.
- **Seeds amb origen verificat:** `taula_salaris` (guia §8, 16 nivells × 6 habilitats),
  eficiència d'entrenador (§7), distribució d'ocasions (§5), aportació per posició (§4).
  Únic pom no calibrat que en resulta: `pes_mig`.

## 2026-07-22 · COBERTURA LEAN v3 + PROTECCIÓ DE PORTERS + SALVATELLA (fet verificat)
**Autoritzat per Miquel.** Migració 055. Principi LEAN nou a PRINCIPIS §6.
- **Doctrina (també a `classificacio.md`):** la plantilla mínima **no és estalvi de sous** —
  és l'assegurança que **cap entrenable jugue minuts sense guany d'entrenament**. Els llocs no
  entrenables dels dos onzes els omplin **cossos sense valor**; un entrenable només **dobla** si
  el seu règim (50%+50%) ho demana o per decisió manual.
- **1 LEAN — fora `marge_absencies`:** el mínim és exactament el que els dos onzes necessiten en
  setmana neta. Emergix **15** (8 entrenables + 1 futur + 2 porters + 4 de camp), derivat. Les
  absències es gestionen quan passen (jugar amb 10), no amb coixí fix. *(Concilia els dos ordres:
  el número passa de 17 —amb marge— a 15 —LEAN—; la doctrina de protegir tot el mínim es manté.)*
- **2 La liquidació honra TOT el mínim** (`lib/cobertura.js` `retencioCobertura`): protegix
  **porteria I camp** per separat. **Forat tapat:** abans la retenció excloïa els porters
  (`j.posicio !== posicio_porter`) → es podien vendre els 3. Ara cada classe reté els de menys
  valor fins al seu mínim. Test: cap seqüència de llistats baixa del mínim de cap classe.
- **3 Una sola font:** l'alerta agregada compta els llistables **després** de la retenció, i
  Vendes mostra «es retenen N per cobertura mínima (X de camp + Y porteria); la plantilla no
  baixa de 15» (`vendes.retencio_resum`).
- **4 Contracte d'alineació** (test): cap entrenable en lloc no entrenable havent-hi cos; sense
  cos, plaça buida (jugar amb 10) declarada amb avís `incomplet`. L'entrenable mai baixa fora del
  seu entrenament de manera silenciosa.
- **5 SALVATELLA — FET VERIFICAT (wiki de Hattrick):** l'**experiència** d'un jugador determina el
  **nivell màxim d'entrenador** que pot arribar a ser i **abarata la conversió**; el **lideratge es
  conserva**. Per tant donar minuts al futur entrenador (Salvatella juga de davanter als dos rols)
  és **inversió**, no supòsit — queda confirmada la doctrina.

## 2026-07-22 · FORA LES ACCIONS IMPOSSIBLES SOBRE UN JUGADOR LLISTAT
**Autoritzat per Miquel.** Migració 054.
- **Principi:** una vegada un jugador està a la subhasta, Hattrick **no** deixa canviar el
  preu ni retirar-lo. Per tant cap alerta pot proposar eixa acció (viola el principi #3:
  «l'informe és l'agenda de hui» — sense acció executable, no és alerta).
- **`ALR_SUBHASTA_TANCA` retirada** (activa=0): deia «última oportunitat de revisar el preu
  o retirar-lo», acció impossible. La data de tancament ja viu a la fitxa de **Vendes**
  (columna «tancament previst»), i el resultat (desert/venut) el cobrix la pregunta de
  `resultat_pendent` quan la subhasta tanca. Test 0b (idempotència amb data d'acció)
  repuntat: ara prova la propietat de la CLAU sense dependre de cap regla viva.
- **`alerta.lesio_venda` reformulada:** de «Jo esperaria… per a tornar a llistar-lo»
  (assumia que pots retirar-lo) a **condicional**: «si encara no té ofertes, valora
  retirar-lo fins que es recupere» — perquè amb ofertes ja no es pot.

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
- **3 Alerta de HUI:** tota venda no llistada sense ajornament legítim → «llista'l — cada setmana
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
- **3 «L'informe és l'agenda de hui»** (principi formal, `docs/PRINCIPIS.md` §3): una alerta
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
- **PENDENT (bloc 2): punts 3, 5, 6, 7.** 3 (principi «l'informe és l'agenda de hui» + subsecció
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
