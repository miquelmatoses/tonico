# FULL DE FÓRMULES DE TONICO

> ⚖️ **CONTRACTE · FONT DE VERITAT.** Aprovat per Miquel (v3: 2026-07-24 · v3.1:
> 2026-07-26). Mana sobre
> qualsevol codi, doctrina o document anterior. El codi de Tonico és un avaluador
> d'estes fórmules i res més. Mirall llegible per màquina:
> [`formules.json`](../formules.json). El rastre de què es va decidir i per què:
> [`docs/DECISIONS.md`](DECISIONS.md).
>
> [Els documents del model anterior —el pla de reconstrucció, la foto del sistema
> d'abans, el contracte v2 i la doctrina de classificació— s'han esborrat: la
> reconstrucció està feta i descrivien codi que ja no existix. Un document que
> descriu mòduls esborrats no és història, és una trampa.]
>
> **REGLA DE PROCÉS (invariant 11):** tot arreglament de símptoma modifica
> `formules.json` o l'avaluador — MAI una secció de presentació. Els tres guardians
> (G1 contracte-full, G2 render-pur, G3 golden-pantalla) entren al CI: un commit que
> els trenque no arriba a prod.

**v3.1 · 2026-07-26 · Model competitiu-econòmic · APROVAT (Miquel)**

Substituïx tota especificació anterior (i el model «fàbrica», retirat: una
estratègia que no competix durant temporades no la tria ningú).

Tonico és este full. El codi és un avaluador de fórmules. Tot nom entre
`accents` és un pom o taula en BD; **cap número viu en codi**. Notació: SI, MAX,
MIN, SUMA, COMPTA, MITJANA, FILTRA, ORDENA, PRIMER/PRIMERS, BUSCA,
ARREDONIX.AMUNT, ∈, ∪, ∅.

**Les dos idees que ho governen tot:**
1. **Flux vs estoc.** El *flux* (ingressos recurrents − despeses) decidix **quin
   sou pots sostindre** → i d'ahí **quin nivell** pots tindre a cada lloc. L'*estoc*
   (caixa cobrada) decidix **què pots comprar hui**. Res s'anticipa: *ven, cobra,
   compra*, sempre en eixe orde.
2. **Cada costat, la seua vara, i una sola per costat.** Comprar s'ordena per
   **distància** (quants nivells li falten al lloc, PAS 5); vendre i retindre, per
   **sobrecost** (quant pagues de més del que el lloc mereix, PAS 5). L'estadi no
   competix amb res: va primer, perquè és l'únic que mou el flux (canvi 6).
   [No hi ha cap mètrica composta que valga per als dos. `mancança × pes` ho
    pretenia i el número no es pintava enlloc: l'únic que se'n veia era l'orde]

---

## V — VARIABLES BASE (una font cadascuna)

```
config          = { estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana }
estrategia      ∈ { competitiva, cycle(WIP) }
hores(pais)     = BUSCA(`hores_pais`; pais) → {economia_dia, economia_hora}
plantilla       = instantània sènior vigent · juvenils = instantània juvenil vigent
llocs_partit    = 11 × partits_setmana
(temporada, setmana) = f_calendari(data, `ancora`)      ← ÚNICA funció del sistema
   [`ancora` ha de caure en `setmana_primer_dia` (diumenge): tota la graella de
    setmanes penja d'ella, i si cau en un altre dia TOTES les vores es desplacen]
setmana_actual  = f_calendari(HUI, `ancora`)
   [el rellotge el mou EL TEMPS, no les pujades. La setmana d'una instantània diu
    de quan és EL FITXER, que és una altra pregunta: dos setmanes sense pujar res
    i el fitxer diu el mateix mentre el món no]
llistat(j)      = csv.transferible(j) = 1  O  fitxa.llistada(j)
lesionat(j)     = csv.lesio(j) ≥ 1                      [font: buit | N setmanes]
sancionat(j)    = csv.amonestacions(j) ≥ `amonestacions_suspensio`   [3; només lliga]
   [LA ROJA I LA GROGA VAN A LA MATEIXA COLUMNA: una groga escriu 1 i una roja escriu
    3, el mateix que tres grogues. O siga que «té roja» i el llindar de sanció són el
    mateix número (observat el 2026-07-29)]
   [ho consumix el PAS 10, que decidix qui juga. L'onze del PAS 6 és ESTRUCTURAL i no
    mira ni lesions ni sancions a posta: diu qui ha d'ocupar el lloc, no qui pot jugar
    dissabte]
edat_d(j)       = anys(j)×112 + dies(j)   ·   dies_aniversari(j) = 112 − dies(j)
fase_mercat(d)  = BUSCA(`fases_mercat`; setmana(d)) → modificador (FRACCIÓ, mai enter)
```

---

## PAS 0 — CONFIGURACIÓ (l'única entrada d'usuari inicial)

```
estrategia      = TRIA(competitiva | cycle)      [cycle: WIP, sense contingut]
pais, divisio, sistema_juvenil ∈ {academia, cercapromeses, cap}, partits_setmana ∈ {2,1}
n_cercapromeses ∈ {1,2,3}
   [el cercapromeses SEMPRE hi és; el mode només diu si hi ha acadèmia i si es crida.
    `academia` = arriben jugadors de 15-17 anys i s'entrenen a cegues abans de pujar ·
    `cercapromeses` = només el cercapromeses, i es crida cada setmana ·
    `cap` = hi és, s'espera, i no es crida mai (i es paga igual: vore PAS 3)]
```
Caixa, ingressos, personal i estadi es demanen a l'informe després de la primera
pujada (mai a l'entrada). Tot el que Tonico consumix i no pot derivar té finestra
de declaració: sense finestra, la dada no es demana.

---

## PAS 1 — ENTRENAMENT (prescrit, no triable)

```
-- SÓN DOS, INDEPENDENTS, I NO TENEN LA MATEIXA FORMA
entrenament_sènior   = `entrenament_a`   · intensitat 100% · resistència `resistencia_pct`
   [UNA sola habilitat. El primer equip no té «entrenament B»: el doble entrenament
    és exclusiu de l'acadèmia, igual que la intensitat i la resistència són
    exclusives del primer equip. Són dues pantalles distintes de Hattrick]
entrenament_acadèmia = (`entrenament_juvenil_a`, `entrenament_juvenil_b`)
   [principal + secundari, i cap intensitat. El secundari rendix 2/3 (PAS 10)]

   [prescripció: el motor de partit decidix per possessió del mig del camp, i el
    mercat de MC és el més líquid → l'entrenament que competix i finança alhora]
   [els tenia fusionats en un sol joc de poms, i això produïa dos errors alhora: la
    pantalla del sènior demanava un «B» que no es pot posar en cap lloc, i TOT el
    PAS 10 penjava de l'habilitat del primer equip. Amb els dos coincidint no es
    notava; el dia que divergiren, el pla juvenil hauria planificat per a
    l'habilitat equivocada sense dir res]
```
**Els dos són PRESCRITS**, no triats: el primer equip entrena el que alimenta els llocs del
motor i l'acadèmia el que fabrica entrenables. Per això són poms i no declaracions.

**Cap acció de desquadre.** Hi havia `ACCIÓ("canvia l'entrenament a HT") SI configurat_HT ≠
prescrit`, i amb ella un panell per a CONFIRMAR què hi ha posat a HT. Però l'entrenament es
prescriu: oferir un panell per a declarar-lo era oferir una decisió que no existix, i sense eixe
panell la comparació no té el seu costat esquerre. Tornarà, si de cas, amb la secció
d'Entrenament — allí l'entrenador i la confirmació tindran on viure.

## PAS 2 — LLOCS I PESOS

```
pos_A(pct) = FILTRA(`taula_entrenament`; habilitat = A)     → MC 100%, extrem 50%
pos_B      = FILTRA(`taula_entrenament`; habilitat = B)
entrenable(lloc) = lloc ∈ pos_A
pes(lloc)  = SUMA(sectors: aportacio(lloc, sector) × pes_sector(sector))
   aportacio  ← `taula_aportacio` (matriu posició × sector, guia §4)
   pes_sector ← distribució d'ocasions de la guia §5:
      mig                    = `pes_mig`   [pom; decidix QUI té l'ocasió, no on]
      atac/defensa central   = `pes_central` [0,36 — 36% de les ocasions pel mig]
      bandes (cada costat)   = `pes_banda`   [0,255 — 25,5% per costat]
   [FORA `N_core`, `N_rotatius` i `max_partits`: comptaven places de la
    classificació vella (core, rotatiu, cos), que no existix. El que en queda viu
    —quantes places d'entrenament hi ha— és `entrenables_n`, al PAS 6]
```

## PAS 3 — ECONOMIA (calculada ABANS de qualsevol decisió de plantilla)

```
periode_setmanes = `setmanes_periode`                       [2: un partit a casa i un fora]
   [en lliga la taquilla entra en setmanes ALTERNES, i HT mateix dona el «balanç
    bisetmanal». Un flux calculat sobre una setmana val el doble o la meitat segons
    quina toque, i eixa oscil·lació és més gran que el flux net.]
per_periode(x)   = x × `setmanes_periode`                   ← NORMALITZACIÓ
   [per a les DESPESES, que són constants setmanals]
setmanes_declarades = ORDENA(setmanes amb declaració; (temporada, setmana) DESC)
   [l'històric va per SETMANA, no per període: cada declaració dona «la passada» i
    «esta», i la setmana següent la que era «esta» es torna a declarar com a
    «passada». Guardant setmanes, el solapament és una actualització; guardant
    períodes, seria comptar dues vegades. La identitat de cada setmana ix de
    f_calendari, que ja és font única]
esta_setmana     = f_calendari(HUI)   ·   passada = f_calendari(HUI − 7 dies)
data(setmana)    = la seua VORA, no el dia que es declara
   [QUINES DUES SETMANES SÓN NO ES PREGUNTA. Declarar és transcriure l'informe de
    HT, que sempre parla d'estes dues; un camp de data només servix per a apuntar
    diners a la setmana equivocada. I la data ha de ser la vora, perquè si no dues
    declaracions de la mateixa setmana poden caure en dues files —o pitjor, en una
    fila amb els diners d'una setmana i el dia d'una altra]
   [una setmana SENSE RES declarat no obri fila: un zero no és una absència, i
    entraria de ple a la mitjana]
mitjana_setmanal = MITJANA(PRIMERS(`setmanes_mitjana`; setmanes_declarades):
                           taquilla + patrocini)
   [NOMÉS taquilla i patrocinadors: club d'aficionats, comissions i vendes són
    PUNTUALS, no s'extrapolen i marejarien el sostre de sou]
ingressos_recurrents = mitjana_setmanal × `setmanes_periode`
calibrat         = COMPTA(setmanes_declarades) ≥ `setmanes_mitjana`
   [la taquilla oscil·la desenes de milers entre setmanes mentre el flux net va en
    milers: amb poques setmanes el número és soroll, i el sistema HO DIU en compte de
    presentar-lo com una certesa. Fer la mitjana d'observacions és ESTIMAR (val);
    extrapolar-ne un creixement seria PROJECTAR (invariant 3)]
despesa_planter  = SI(sistema_juvenil = 'academia'; `cost_instalacions_juvenils`; 0)
                 + `cost_cercapromeses` × n_cercapromeses
despeses_fixes   = per_periode(nòmina + manteniment_estadi + personal + despesa_planter
                               + sou_entrenador)
   [CINC conceptes. `sou_entrenador` hi va perquè és un sou que es paga cada setmana
    com qualsevol altre, i d'ací baixa `sou_sostenible`. L'avaluador en sumava
    QUATRE: el sostre de sou eixia inflat per tot l'import de l'entrenador (amb
    5.000 €/setmana deia 15.291 quan eren 10.291), i d'eixe sostre pengen els
    `nivell_objectiu` de TOTS els llocs. `flux_repartible` sí que el restava, i eixe
    desacord entre dues xifres del mateix pas és el que ho feia invisible]
flux_repartible  = ingressos_recurrents − reserva_flux
                   − per_periode(manteniment_estadi + despesa_planter + sou_entrenador)
   [EL CALAIX ÚNIC del qual ixen els sous del personal I els dels jugadors. Es lleven
    els FETS —planter derivat, manteniment declarat, sou de l'entrenador (que només
    canvia si canvies d'entrenador)— i queda el que sí que es decidix]
flux             = ingressos_recurrents − despeses_fixes
reserva_flux     = `reserva_flux_pct` × ingressos_recurrents
sou_sostenible   = MAX(0; ingressos_recurrents − reserva_flux
                          − (despeses_fixes − per_periode(nòmina)))
   [= les despeses recurrents no poden passar del (1 − `reserva_flux_pct`) dels
    ingressos recurrents. La reserva és POLÍTICA DE RISC declarada, no mecànica]
ACCIÓ("gastes més del que entra") SI flux < reserva_flux
   [EL LLINDAR NO ÉS ZERO, ÉS LA RESERVA: la línia de dalt ja diu que les despeses
    recurrents no poden passar del (1 − `reserva_flux_pct`) dels ingressos. Menjar-se
    la reserva és el senyal; el negatiu és el mateix senyal més fort]
   [i NO espera a `calibrat`: amb poques setmanes la mitjana és provisional i pot
    pujar, però la despesa és exacta i el desequilibri és real HUI. El sistema
    calculava el flux i no el deia enlloc —la píndola es va llevar de la pantalla i el
    `sobrecost` està tancat fins a `setmanes_mitjana`—, o siga que el dèficit existia,
    estava calculat, i era mut]
caixa            = saldo real declarat (mai projectat)
   [= «Diners disponibles» de l'informe, no «diners al final de setmana». NO hi ha
    `caixa_disponible`: la reserva d'estoc no s'ha usat mai i una derivada que val
    igual que la seua entrada és un concepte de més. El PAS 8 compara contra `caixa`]
```
De l'informe setmanal de HT es declaren **QUATRE coses i cap més**: **taquilla** i
**patrocinadors** (de la setmana passada i d'esta), **diners disponibles** i **manteniment
d'estadi**. La nòmina ve del CSV, el personal de les seues fitxes i el planter es deriva. Una
xifra, una font (invariant 1): si no hi ha dues fonts, no hi pot haver discrepància.

**No hi ha comptabilitat de moviments.** Amb la caixa declarada i el flux eixint de
taquilla+patrocini, apuntar moviment a moviment no alimenta cap decisió: el diner d'una venda
apareix a la caixa del període següent, que és on el sistema el mira.

## PAS 4 — NIVELL OBJECTIU PER LLOC (derivat del flux, no dels rivals)

```
sou_sostenible_setmanal = sou_sostenible / `setmanes_periode`
   [`taula_salaris` va en €/setmana: ací es torna a unitats setmanals, i este és
    l'ÚNIC punt on es fa el canvi d'unitat]
pressupost_sou(lloc)  = sou_sostenible_setmanal × pes(lloc) / SUMA(pesos de tots els llocs)
habilitat_lloc(lloc)  = BUSCA(`taula_habilitat_lloc`; lloc)   [POR→porteria,
                        DC/lateral→defensa, MC→creativitat, extrem→extrem, DAV→anotació]
nivell_objectiu(lloc) = MAX(n : BUSCA(`taula_salaris`; habilitat_lloc(lloc), n)
                                ≤ pressupost_sou(lloc))      ← taula de la guia
nivell_objectiu_ht(lloc) = nivell_objectiu(lloc) + `nivell_habilitat_offset`
   [DUES ESCALES, i esta és la que es compara. La taula de salaris de la guia §8
    comença en «Inadequate», el 5é esglaó de Hattrick: els quatre primers
    (disastrous · wretched · poor · weak) es van deixar fora perquè per a tot el
    que no és porteria valen 250 € igual. Les habilitats dels jugadors, en canvi,
    venen del CSV en l'escala SENCERA. El nostre nivell 5 val 2.250 de porteria i
    850 de creativitat: eixa fila de la guia és «Formidable», el HT 9]
```

## PAS 5 — LA DISTÀNCIA A L'OBJECTIU

```
distància(lloc) = MAX(0; −diferència(lloc))          [diferència: vore PAS 6]
   [QUANT LI FALTA al lloc per a arribar al que el flux paga. Un lloc amb algú
    per DAMUNT està igual de fora de lloc, però no compta ací: no es pot arreglar
    comprant. L'assignació tria per a cada lloc el millor de l'habilitat, o siga
    que si fitxes algú al nivell prescrit, el que ja hi era —que és millor— es
    torna a quedar el lloc i el nou se'n va al residu. L'única acció possible és
    vendre el sobrat, i eixa la diu el `sobrecost`]
   [EN L'ESCALA DE HATTRICK als dos costats. Restar l'índex de la taula de
    salaris d'un `hab(jugador)` deixava TOTES les distàncies quatre nivells
    curtes: un objectiu de «Formidable» (HT 9) contra un jugador amb CR 8
    donava 0]
compta(lloc)    = distància(lloc) ≥ `distancia_min`
   [menys de dos nivells no és un forat: s'arregla entrenant o esperant]
sobrecost(j)    = MAX(0; sou(j) − BUSCA(`taula_salaris`; habilitat_lloc(lloc(j));
                                        nivell_objectiu(lloc(j))))

ORDRE DE LES NECESSITATS = places buides PRIMER; després distància DESC
   [una plaça d'entrenament buida o un porter suplent que falta van per damunt de
    tot: entrenament perdut cada setmana no es recupera, i el porter no dobla]
   [FORA `mancança × pes`. Multiplicar la distància pel pes del lloc donava un
    número que no es pintava enlloc: l'únic que se'n veia era quina fitxa anava
    dalt de Mercat, i per a decidir això no cal una mètrica composta que no es pot
    comprovar d'un colp d'ull. També se'n va l'`excés`, que preguntava el mateix
    que el `sobrecost` però en nivells en compte d'euros, i no el mirava ningú]
```

## PAS 6 — L'ASSIGNACIÓ (qui ocupa cada lloc, i qui sobra)

Ací ja no es CLASSIFICA. La classificació vella —core, rotatiu, titular, porter, cos—
decidia qui es quedava **abans** de saber qui ocupa cada lloc, i el resultat es desava en
taula: estat derivat que es quedava ranci i que cada pantalla tornava a derivar pel seu
compte. Ara es reparteixen **tots** els jugadors, lloc a lloc, i el que sobra és el residu.

```
onze      = PER lloc en ORDENA(llocs; pes(lloc) DESC):
               PRIMER(ORDENA(FILTRA(lliures); hab(j, habilitat_lloc) DESC,
                                              sou ASC, id ASC))
   [PER PES: el lloc que més aporta tria primer. A igualtat d'habilitat mana el
    SOU, perquè dos que rendixen igual no valen igual]
sobrants  = plantilla − onze
diferència(lloc) = hab(ocupant, habilitat_lloc) − nivell_objectiu_ht(lloc)
   [el senyal de la fila: negatiu = curt, positiu = passat de nivell]

entrenables_n = COMPTA(llocs que entrenen al 100%) × (`partits_setmana` − 1)
   [un per cada partit EXTRA de la setmana: és quan el titular descansa]
entrenables   = PRIMERS(entrenables_n; ORDENA(FILTRA(sobrants;
                   hab(j, A) ≥ `entrenable_creativitat_min`  I  cap_a_temps(j));
                   hab(j, A) DESC, setmanes_seguent ASC, edat_d ASC))
cap_a_temps(j) = edat_d(j) + setmanes_seguent(j) × 7 < `entrenable_edat_limit` × `any_dies`
   [NO és un tall d'edat pla. Un de 20 i escaig que puja d'ací a cinc setmanes
    encara cobra eixa pujada; un de 19 que no pujarà fins passats els 21 no la
    cobrarà mai. I com que pujar el fa més vell i la següent pujada és més lenta,
    el criteri el trau tot sol JUST DESPRÉS d'haver pujat, que és quan val més]

porter_suplent   = PRIMER(ORDENA(FILTRA(sobrants − entrenables;
                      porteria(j) ≥ `porter_suplent_porteria_min`); sou ASC))
   [TRIA ABANS QUE EL FUTUR ENTRENADOR: la porteria és una OBLIGACIÓ —el titular
    no dobla— i el futur entrenador una OPORTUNITAT. Amb l'orde al revés, un
    porter amb experiència se n'anava d'entrenador i el sistema es quedava sense
    porteria per a l'onze_B, dient «et falta un porter suplent» mentres
    l'alineació el posava sota pals]
   [UN LLINDAR, no una deducció. Abans era «la porteria per damunt de TOTES les
    altres habilitats», i això deixava fora porters de veres: un que llança
    faltes té la pilota aturada igual o més alta. Eixos se n'anaven a VENDA
    mentres la mateixa pantalla demanava comprar-ne un]
   [i entre els que arriben mana el SOU: eixe lloc no compra res]
futur_entrenador = PRIMER(ORDENA(FILTRA(sobrants − entrenables − porter_suplent;
                      experiència(j) ≥ MÍNIM(`coach_preu_reconversio`));
                      experiència DESC, lideratge DESC))
   [només si es pot reconvertir: per davall del primer esglaó de la taula de la
    guia no hi ha cap nivell d'entrenador possible, i assenyalar «el de més
    experiència» d'una plantilla on tots en tenen 1 seria assenyalar per no res]

despatxar = FILTRA(resta; desert(j))        [vore desert(j) al PAS 7]
venda     = resta − despatxar
aturats   = FILTRA(onze_ideal; lesionat(j) O sancionat(j))
onze      = assignació SOBRE ELS DISPONIBLES        [onze_ideal = sobre TOTS]
   [DUES PASSADES a posta: la primera diu QUI HAURIA DE JUGAR i la segona QUI JUGA. La
    diferència entre les dues ÉS la llista de lesionats i sancionats — els que sí que
    anirien a l'onze i esta setmana no hi poden estar. Amb una sola passada eixa llista
    no es pot derivar: només sabries qui juga, no qui falta]
   [i qui no pot jugar i TAMPOC anava a l'onze no desapareix: seguix el seu camí
    normal (venda, despatxar…). Només s'aparta el que ocupava un lloc]
grup(j)   = onze | aturat | entrenable | futur_entrenador | porter_suplent | venda | despatxar
   [UNA SOLA FONT. La pantalla el pinta i el motor d'alertes el consumix: si cada
    u el derivara pel seu compte tornarien a dir coses distintes]
entrenen  = ocupants dels llocs que entrenen ∪ entrenables
   [qui NO hi és, és cos disponible per a cobrir partits]
```

## PAS 7 — VENDRE (allibera sou i genera caixa)

```
motiu_venda(j) = SI(j ∉ cap grup de l'assignació;                  "sobrant";
                 SI(calibrat I sobrecost(j) > 0;                   "sou desproporcionat";
                 SI(j ∈ venda;                                     "sobrant"; ∅)))
   [SENSE CALIBRAR NO ES DESFÀ DE NINGÚ PEL SOU. `sobrecost` penja de
    nivell_objectiu, que penja del flux: mentre el flux siga soroll, este motiu ho
    seria també. Els altres dos no en depenen —l'edat i l'estructura de plantilla— i
    seguixen funcionant]
venda_activa(j)= motiu_venda(j) ≠ ∅  I  ¬desert(j)
ordre_venda    = ORDENA(FILTRA(plantilla; venda_activa); sobrecost DESC)
urgent(j)       = dies_aniversari(j) ≤ `dies_urgencia`
destí(j) = SI(lesionat(j);                              AGENDA("llista'l en recuperar-se");
           SI(fase_mercat(hui + `dies_subhasta`) ≤ `depressio_profunda` I ¬urgent(j);
                                                       AGENDA("llista'l", dia_D);
                                                       ACCIÓ("llista'l HUI")))
   [`depressio_profunda` en FRACCIÓ, mateixes unitats que el modificador]
desert(j) = transferible(j, abans) = 1  I  transferible(j, ara) ≠ 1  I  j ∈ plantilla
   [ES DEDUÏX, no es pregunta: si ja no és a la plantilla, l'han comprat.
    I ES DESA (`vendes.estat` = "desert"), perquè la transició només es veu ENTRE DUES
    instantànies: a la pujada següent les dues diuen «no transferible» i el fet
    desapareixeria. Sense desar-lo, el jugador tornava a Vendes i ACCIÓ("llista'l")
    el proposava un altre volta per la MATEIXA condició que l'hauria de descartar]

   [ES LLISTA UNA VEGADA. Un desert no és transferible i no es rellista: rellistar
    cada setmana és pagar `cost_llistat` per res. I un desert queda fora de TOT el
    mercat, no només de l'ordre: ni fitxa, ni avís, ni agenda]
despatxable(j) = desert(j) I grup(j) = "despatxar"  → decisió de PLANTILLA, no de mercat
   [Qui ocupa un lloc del pla —onze, entrenable, futur entrenador o porter suplent—
    MAI s'acomiada per anar desert: per a ell una subhasta deserta no és un veredicte
    sobre el jugador, és que el preu no era el bo]
caixa cobrada  = la `caixa` DECLARADA del període següent    → activa el PAS 8
   [l'import d'una venda NO s'apunta: no entra a cap fórmula. Es veu a la caixa]
```
**Cap estimació de preu.** Tonico no diu quant val un jugador: qui ho diu és el mercat, i
el resultat entra com a **venda cobrada** (estoc). Un preu esperat era un número inventat
que no canviava cap decisió — l'ordre el porta `sobrecost`, i «es ven o s'acomiada» el
decidix la subhasta, no una previsió.

## PAS 8 — COMPRAR (només amb caixa cobrada; l'ESTADI VA PRIMER)

```
-- opció ESTADI (dades DECLARADES; la guia §10 delega en calculadores CHPP)
PREGUNTA a l'inici de cada temporada, de `url_calculadora_estadi` (configuració NRG):
   `estadi_manteniment`  = manteniment setmanal de la configuració  → FLUX
   `estadi_cost_obra`    = total costs de l'obra                    → ESTOC
estadi_caduc   = (hui − `estadi_data`) > `setmanes_caducitat_estadi` × 7
ACCIÓ("torna a la calculadora i reinserix els números")  SI estadi_caduc
obra_en_curs   = `estadi_obra_inici` ≠ ∅            [declarada: l'obra ja s'està fent]
   [una obra començada NO és una decisió pendent. Mentre dura, l'opció ESTADI no és
    admissible i no es proposa res: ja s'ha decidit i no es pot decidir dues vegades.
    S'acaba quan es declara el `manteniment_estadi` nou i es buida la data.]
Δmanteniment   = `estadi_manteniment` − manteniment_actual
admissible(estadi) = ¬obra_en_curs
                   I  `estadi_cost_obra` ≤ caixa
                   I  flux − per_periode(Δmanteniment) ≥ reserva_flux
ACCIÓ("remodela l'estadi")  SI admissible(estadi) I ¬estadi_caduc
   [PRIORITAT ABSOLUTA: abans que qualsevol fitxatge, sempre. L'estadi és l'única
    compra que MOU EL FLUX — un fitxatge consumix el pressupost, l'estadi aixeca el
    pressupost mateix i amb ell el nivell_objectiu de TOTS els llocs alhora.
    Optimitzar dins de la restricció i relaxar la restricció no són del mateix rang:
    comparar-los per eficiència era comparar coses incomparables.]
   [NO es projecta el que l'obra ingressarà (invariant 3): no fa falta predir-ho,
    s'OBSERVA al període següent quan es declara la taquilla nova]

-- opció FITXATGE (només si l'estadi ja no demana res)
necessitats = places BUIDES d'entrenament i de porter suplent  → distància = ∞
            ∪ llocs de l'onze SENSE OCUPANT                     → distància = ∞
            ∪ llocs de l'onze amb distància ≥ `distancia_min`   [PAS 5]
   [un lloc sense ningú és el senyal més fort que hi ha, i anava amb els altres
    buits per doctrina («buit → es juga amb un menys, i es diu», PAS 9) però no a
    la llista: `diferència` és ∅ quan no hi ha ocupant i el filtre el treia]
   [una plaça d'entrenament buida és entrenament perdut cada setmana i no es
    recupera; un lloc de l'onze fluix, almenys, juga. Per això les buides manen.
    I un sol nivell de distància s'arregla entrenant o esperant: no és un forat]
clau(necessitat) = el TIPUS de fitxatge (bucket + nivell), no el lloc
   [«un mig centre de nivell 9» val el mateix per als tres llocs de mig centre:
    és una sola cerca i un sol preu]
cost        = `preus_referencia`[clau]                → DECLARAT, mai estimat
   [a Hattrick el preu NO el calcula el joc: el paga un altre mànager en una
    subhasta. La velocitat d'entrenament sí que és fórmula i es va desxifrar;
    esta no existix, i cap eina en publica cap (Transfer Compare, HTPE i HAM són
    estimadors estadístics sobre vendes recents). Caduca a `setmanes_caducitat_preu`]
admissible  = cost ≠ ∅  I  cost ≤ caixa
   [SENSE PREU NO ES SUGGERIX MAI: l'opció es veu amb «falta el preu», però no pot
    arribar a recomanació. Suggerir una compra sense saber què costa és decidir a
    cegues, i és el que feia el `base_preu_divisio` que vam llevar al v3.1]
eficiència  = distància / cost
ACCIÓ = PRIMER(ORDENA(FILTRA(necessitats; admissible); distància DESC,
                                                       eficiència DESC))

capacitat_objectiu   = configuració NRG de `url_calculadora_estadi`   [declarada]
   [l'obra concreta —dimensió i repartiment de graderies— es delega a la
    calculadora; Tonico només diu QUAN toca]
```

## PAS 9 — ELS DOS ONZES

```
onze_A = assignació d'estructura                      [el del PAS 6: l'onze ideal]

onze_B = es COMPON damunt de l'onze_A, en este orde:
   llocs que entrenen al 100%  → els ENTRENABLES, per orde de tria
      [eixe és el seu motiu d'existir: si els ocuparen els titulars no
       entrenarien mai. Sense entrenable per a la plaça, es queda BUIDA]
   llocs que entrenen al 50%   → els mateixos de l'onze_A
      [el seu lloc TAMBÉ és entrenament: no es cedix a ningú, doblen ells]
   porteria                    → el PORTER SUPLENT, i BUIDA si no n'hi ha
      [el porter no dobla: és l'únic lloc que obliga a mantindre algú a posta.
       Sense suplent la porteria es queda buida i es diu — abans s'hi quedava el
       titular «doblant», que és justament el que no pot passar: es pintava una
       alineació legal que no ho era]
   futur entrenador            → el millor lloc DELS QUE QUEDEN, si no juga ja
      [hi va per EXPERIÈNCIA, que és el que abarateix reconvertir-lo, no perquè
       siga millor que qui desplaça: per això no toca cap lloc que entrene]
   la resta                    → els mateixos de l'onze_A, que doblen

buit(lloc) = ∅ → es juga amb un menys, i es diu
   [una plaça d'entrenament buida NO s'omplí amb un titular: seria entrenament
    perdut sense guanyar res]
```


## PAS 10 — JUVENILS (si sistema_juvenil ≠ cap) — la fàbrica d'entrenables

L'acadèmia és un PROVEÏDOR ALTERNATIU d'entrenables: en compte de comprar-ne un de 17 anys
amb la creativitat feta, te'l fabriques. Per tant el que produïx val el que costaria
comprar-lo, i la seua vara és la mateixa: `entrenable_creativitat_min`.

NOMÉS COMPTA EL QUE S'ENTRENA. La creativitat, perquè és el producte; les passades, com a
rescat del que ja no arribarà. Un potencial enorme en qualsevol altra habilitat no mou cap
decisió: no s'entrena, i per tant no arriba a res.

```
-- LA MECÀNICA DEL JOC (deduïda de taules públiques; vore migracions 098 i 099)
factor(posició, habilitat) = 1 · 0,5 · 0,15    [`entrenament_juvenil_factors`]
   creativitat: mig centre 1 · extrem 0,5 · qualsevol altra 0,15 (porter inclòs)
   passades:    mig centre = extrem = davanter 1 · qualsevol altra 0,15
   [«els altres jugadors que juguin» és literal: ningú entrena a zero si juga]
revela(posició) = factor ≥ `revelacio_factor_min`
   [una posició del graó residual NO revela. Conseqüència: per a l'habilitat que
    entrenes, REVELAR I ENTRENAR SÓN LA MATEIXA ACCIÓ, i el pla no ha de traure mai
    ningú de la seua posició per a descobrir-lo]
   [i l'entrenador dona COM A MOLT UN missatge per categoria i partit: alinear-ne
    tres de mig centre no revela tres creativitats, en revela una]
habilitats = (`entrenament_juvenil_a`, `entrenament_juvenil_b`)   [PAS 1: les DE L'ACADÈMIA]
matxos(habilitat, edat, nivell) = `velocitat_juvenil_<habilitat>`   [taula per edat i nivell]
   secundària: × `entrenament_juvenil_secundari_divisor`   [rendix 2/3 → costa 1,5×]

-- LA PROJECCIÓ
sub_nivell = `sub_nivell_desconegut`
   [«creativitat 4» vol dir [4,00 · 5,00). Tonico assumix la vora ALTA: no es descarta
    ningú per una suposició pessimista. Deixa de fer falta el dia que el jugador puja
    de nivell, perquè llavors el joc mateix diu on està]
projecció(j,h) = simula setmana a setmana des de (actual + sub_nivell) fins la promoció,
                 acumulant 1/matxos per partit, acotat pel potencial si es coneix
   [la data de promoció NO és una estimació: la promoció és automàtica el primer dia
    possible, o siga que `dies_restants_promocio` és l'horitzó exacte]

-- QUI QUEDA FORA, ABANS DE TOT
bloquejat(j) = lesionat(j) O té targeta roja
   [no pot jugar: ni entrena, ni es revela, ni gasta missatge. No entra a cap tall]

-- LA RUTINA, aplicada a cada habilitat en ORDE: 1r creativitat, 2n passades
talla(j,h) = potencial(j,h) conegut I < `llistó(h)`         → no hi arribarà mai
           O projecció(j,h) < `llistó(h)`                   → no li dona temps
           O actual(j,h) = potencial(j,h)                   → capat: no creix
   [el capat es talla pels DOS costats. Per davall no servix; per damunt JA ÉS el
    producte i no ha de gastar una plaça d'entrenament]
   [DESCONEGUT NO TALLA: sense proves no hi ha motiu. Una habilitat sense revelar
    val `projeccio_desconeguda`, que és el llistó mateix — ni descarta ni desplaça
    els que sabem que arriben]
ordre(h)   = projecció DESC, dies_restants ASC, estreles a la posició DESC, id
places(creativitat) = 3 mig centres + 2 extrems      [RESERVADES: la 2a passada no les toca]
places(passades)    = 3 davanters
   [primer tot el descobriment de creativitat, i després entrenar passades]

-- LA CUA
cua = els que no han entrat en cap passada
    ORDENA(cua; màxima habilitat coneguda DESC, dies_restants ASC, id)
   [òmplin fins al mínim legal —1 porter + 8 de camp— i la resta, banqueta.
    La banqueta no gasta missatge de l'entrenador: els missatges només van als
    que juguen]
alineació(cua) = òmpli `orde_alineacio_residual` fins a `minim_jugadors`,
                 amb les capacitats de `maxims_posicio` i descomptant les places
                 que les passades d'entrenament ja han ocupat
   [porter, defenses, davanters. I SURT AMB POSICIÓ, no amb un «residual» genèric:
    el dia que tota la plantilla està capada per davall del llistó, cap passada
    col·loca ningú i açò és l'única cosa que diu com plantar els nou al camp]
   [mig centres i extrems queden fora d'este orde: són places d'ENTRENAMENT, i
    gastar-les amb qui no entrena res no salva ningú]

-- LA PLANTILLA
objectiu_juvenil = mínim convocable + 1
   [i la raó NO és el cost: és NO DILUIR ELS MISSATGES DE L'ENTRENADOR. Cada juvenil
    de més es menja part d'un canal que ja és d'un missatge per categoria i partit]
sobra = COMPTA(juvenils) − objectiu_juvenil
despatxa PRIMERS(sobra; ORDENA(juvenils; l'ORDE INVERS del d'alinear))
   EXCEPTE qui ja arriba a `entrenable_creativitat_min` de creativitat
   [eixe és el producte acabat, encara que estiga capat i el tall el traga de les
    places d'entrenament. Mai se'n va]
   [i mai per davall de l'objectiu, per roïns que siguen: sense jugadors no hi ha
    partit, i sense partit no hi ha ni entrenament ni missatges]

-- LA PROMOCIÓ
promociona(j) SI dies_restants_promocio(j) ≤ 0
   [no és una decisió: es promociona el primer dia possible. Per això la projecció
    a eixa data és el que t'endús, i no hi ha opció de deixar-lo madurar més]
```
**El cercapromeses no el jutja Tonico.** Quan es crida i si l'oferta val la pena són decisions
que Miquel pren amb criteri propi, fora del sistema. Amb elles se'n va tota la maquinària
d'avaluar candidats i el rellotge de la crida.

## PAS 11 — PERSONAL (bucle de FLUX; el paral·lel del PAS 8)

```
   [El personal consumix FLUX (sou setmanal), no estoc. El cost NOMÉS depén del NIVELL
    i de la BASE del tipus. Per tant no es compara eficiència entre tipus — es seguix
    una PRIORITAT fixa i cada tipus s'emporta el nivell més alt que el flux sostinga.]

pressupost_personal = MIN(`quota_personal` × flux_repartible; sostre_personal)
   [`quota_personal` és POLÍTICA declarada, com `reserva_flux_pct`: no ix de cap taula.
    El NIVELL n'és conseqüència, no a l'inrevés — si es fixara el nivell seria un import
    fix i no escalaria amb els ingressos]
places      = les que la QUOTA DEL JOC permet, per orde de `prioritat_personal`
   [`quotes_personal`: 4 especialistes en total, 2 assistents, 1 de cada altre tipus.
    L'ENTRENADOR PRINCIPAL no és especialista: no gasta plaça i va al PAS 8]
sostre_personal = SUMA(places × cost_flux(nivell_max))
   [passat això el personal no pot absorbir més: el sobrant va als jugadors]
nivell      = MAX(n : SUMA(places × cost_flux(n)) ≤ pressupost_personal)
   [AMPLADA ABANS QUE PROFUNDITAT: l'efecte és lineal i el cost exponencial (guia
    «Staff»), així que 4 places a nivell 1 donen 4,0 punts i una plaça a nivell 3 en
    dona 0,6 — mateix diner, sis vegades menys. MAI es deixa una plaça buida per a
    pujar-ne una altra: totes al mateix nivell]
cost_flux(tipus, nivell) = base(tipus) × 2^(nivell−1)
   base(tipus) = BUSCA(`prioritat_personal`; tipus) → base   [si no en declara: `staff_cost_base`]
   [DUES bases, no una: 1.020 per als especialistes (1.020 · 2.040 · 4.080 · 8.160 ·
    16.320) i 1.250 per a l'entrenador (1.250 · 2.500 · 5.000 · 10.000 · 20.000).
    Mateixa progressió, base distinta: l'entrenador NO cobra com la resta d'empleats.
    Verificat contra l'informe real: 2 assistents + metge de nivell 2 (3 × 2.040) +
    entrenador de nivell 3 (5.000) = 11.120 €, la xifra exacta de HT.]

   [el cost del personal que ja tens ja va restat dins del flux: si no se li torna a
    sumar, el bucle es veu sense marge just per tindre el personal que està valorant.
    Simètric amb sou_sostenible, que fa el mateix amb la nòmina.]

-- L'ENTRENADOR PRINCIPAL: la mateixa forma, amb UNA plaça
pressupost_entrenador = `quota_entrenador` × mitjana_setmanal
nivell_sostingut      = MAX(n ≤ `entrenador_nivell_max` : cost_flux('entrenador', n)
                                                          ≤ pressupost_entrenador)
nivell_actual         = n : cost_flux('entrenador', n) = sou DECLARAT   [es DERIVA]
   [no es pregunta el nivell: l'escala és base × 2^(n−1) i el sou ja està declarat a la
    seua fitxa. Preguntar-lo seria obrir la porta a que les dues dades es contradiguen]
   [CINC nivells contractables (fluix..excel·lent). La taula d'eficiència en té SIS
    perquè inclou «pobre», que no es contracta: és on DECAU un entrenador vell]
ACCIÓ("millora l'entrenador") SI nivell_sostingut > nivell_actual
   [ÉS UNA VARA, NO UN REPARTIMENT: no lleva diner a ningú ni mou cap altre pressupost,
    igual que `nivell_objectiu` fa amb els jugadors. Diu quin nivell sostenen els
    ingressos, i el dia que passa el que tens, hi ha una decisió]
   [i comprar-lo es paga d'un COLP i de CAIXA, com un fitxatge: `coach_preu_extern`
    per lideratge × nivell. El flux diu quin pots MANTINDRE; la caixa, si el pots
    comprar hui]
   [era l'únic element del sistema amb cost conegut i efecte conegut que no escalava
    amb res: es restava sencer com un fet, i per molt que els ingressos crescueren mai
    hi havia un moment de millorar-lo]

prioritat_personal = `prioritat_personal`   [orde fix, pom]
   1. assistent   — +3,5% de velocitat d'entrenament per nivell: l'única palanca que
                    multiplica el motor de l'estratègia
   2. metge       — els assistents PUGEN el risc de lesió (+2,5%/niv) i ell el baixa
                    (−7,5%/niv): van acoblats, i ix de la guia
   3. assistent   — el segon, fins a la quota de 2
   4. psicòleg    — el perfil «competitiu + entrenament» de la guia el posa ací
   5. forma · 6. tàctic · 7. financer — fora de la quota de 4 en la pràctica

lliure = pressupost_personal − SUMA(sous DECLARATS)   [el que queda de VERES, ara]
   [el nivell uniforme diu QUÈ SOSTÉ EL FLUX a llarg, suposant TOTES les places en
    eixe nivell. No és el que es pot pagar HUI: els que ja hi són no poden baixar
    de nivell fins al venciment. Amb 3 a nivell 2 (6.120) d'un pressupost de
    6.564, el pla diu «4 places a nivell 1» però només queden 444 € — i proposar
    un fitxatge de 1.020 era proposar una cosa que no es pot pagar]

ACCIÓ("contracta", tipus, n)  SI la plaça està LLIURE
   n = MÍN(MAX(k : cost_flux(tipus, k) ≤ lliure); nivell_uniforme)
   [i `lliure` es descompta a cada plaça compromesa: dues places lliures no es
    poden gastar el mateix diner. El sostre del nivell uniforme evita contractar
    hui un nivell que al venciment tocaria baixar]
   [pujar a mitjan contracte vol dir ACOMIADAR, i acomiadar costa 2× l'estalvi
    respecte d'un contracte més curt (guia «Staff»): al nivell 4, trencar a la
    setmana 10 de 16 val 57.600 €. Per això el nivell NOMÉS es mou al venciment,
    i qui ho decidix —cap amunt i cap avall— és el bloc RENOVAR]
AVÍS: compromet el flux `setmanes_contracte` setmanes (no es pot desfer)
[i mentre no arribe el venciment NO hi ha cap acció: dir «renova» amb 40 dies per davant
 és soroll, perquè eixe dia no es pot fer res. Vore `dies_avis_contracte`.]

RENOVAR (única decisió reversible; NO existix acomiadar):
   dies_restants(membre) = ARROD.AMUNT(data_fi − hui)      [DIES; una data no es podrix]
   PER membre amb 0 ≤ dies_restants ≤ `dies_avis_contracte`:
      flux_lliure = lliure + sou(membre)
         [el SEU sou torna al calaix: eixe és el pressupost d'esta plaça. Si no,
          es compararia el cost de renovar-lo contra un calaix que encara el conté]
      n = MÍN(MAX(k : cost_flux(tipus, k) ≤ flux_lliure); nivell_uniforme)
      SI(n > actual;                                  ACCIÓ("renova al nivell n")
      SI(cost_flux(tipus, actual) ≤ flux_lliure;      ACCIÓ("renova")
      SI(existix m < actual amb cost_flux(tipus, m) ≤ flux_lliure;
                                                      ACCIÓ("renova al nivell m")
                                                      ACCIÓ("no renoves"))))
   [el flux només es pot retallar al venciment: contractar és comprometre's]
```

## PAS 12 — INFORME I AGENDA

```
CADUCITATS (contractes de personal i altres dates declarades):
   ACCIÓ("renova/decidix", data)  SI 0 ≤ data − hui ≤ `dies_avis_contracte`
   [DIES als dos costats. Abans el full comparava SETMANES amb un pom de DIES.]
urgencia(acció) = BUSCA(`urgencia_tipus`; tipus(acció))      [pom; MAI a la vista]
nivell(acció)   = SI(urgencia ≥ `llindar_urgent`; "urgent";
                  SI(urgencia ≥ `llindar_aviat`; "aviat"; "normal"))
alertes = AGRUPA(ACCIONS amb data = HUI; tipus) ORDENA per urgencia DESC
agenda  = ORDENA(ACCIONS amb data > HUI; data)
res més és alerta; «de moment res» = informació de secció
```

## MECANISME (transversal; no és domini)

```
diferencia = puntuació_nova − puntuació_del_desplaçat
SI(origen(desplaçat) = manual;              PREGUNTA prèvia;
SI(diferencia > `llindar_anti_soroll`;      EXECUTA + INFORMA + DESFÉS;
                                            SILENCI))
desfés = restaura l'estat previ exacte i activa el fre anti-soroll.
Cap moviment derivat encadena efectes irreversibles.
```

---

## RESTRICCIONS (invariants; cada una un test de contracte)

1. Una variable, una fórmula, una font (preu_esperat, calendari, llistat,
   nivell_objectiu).
2. Derivar > preguntar: el que el CSV o una taula dona, mai es demana.
3. Cap decisió de compra amb diners no cobrats; cap compra que deixe el flux per
   davall de `reserva_flux`.
4. llistat no juga · lesionat no s'alinea · mai per davall dels mínims (porters,
   cossos, `minim_en_camp` juvenil).
5. Overrides d'usuari sagrats: només es desplacen preguntant.
6. Moviments derivats: actua + informa + desfés.
7. Cap ACCIÓ("despatxa") amb calibrat = FALS.
8. Tot literal d'este full és pom o taula en BD; el codi no conté cap número.
9. Cap nom d'usuari en codi ni tests; verificació a prod per propietat.
10. Textos = plantilles i18n interpolant variables ja calculades; degradació per
    fila; cap clau crua.
11. EL FULL ÉS EXECUTABLE: `formules.json` és mirall fidel; G1 verifica
    avaluador = fórmula amb fixtures sintètics.
12. RENDER PUR: cap aritmètica, comparació ni literal de domini a la
    presentació; G2 escaneja i peta.
13. GOLDEN DE PANTALLA: render(fixture) = avaluador(fixture), valor a valor (G3).
14. Vocabulari únic: lloc de partit · lloc entrenable · onze · entrenable ·
    futur entrenador · porter suplent · venda · despatxar · sobrant · distància ·
    sobrecost · flux · estoc · flux_lliure. Cap sinònim.
    [FORA `core`, `rotatiu`, `titular`, `cos` i `retingut`: eren els grups de la
     classificació del PAS 6, i el PAS 6 ara és l'assignació]
15. PRECONDICIÓ DEL PAS 0: cap derivació que depenga del PAS 0 s'executa amb el PAS 0
    incomplet. Si falta `partits_setmana`, `pais` o `divisio`, el sistema INFORMA QUÈ
    FALTA I NO TOCA RES: no assigna rols, no genera moviments i no emet accions que en
    depenguen. Les fórmules que no en depenen (els pesos dels llocs, el nivell
    objectiu) sí que s'avaluen.
16. PERÍODE TANCAT: l'economia es declara SEMPRE del període ja tancat, mai de la setmana
    en curs (no està consolidada). Tot import setmanal es normalitza amb `per_periode`
    abans de barrejar-se amb la taquilla; l'ÚNIC pas a unitats setmanals és el PAS 4.
17. FINESTRA DE DECLARACIÓ: si Tonico consumix una dada que no pot derivar, eixa dada té
    finestra per a declarar-la. Cap dada demanada sense on posar-la, cap camp sense ús.
18. DADES VELLES ≠ ABSENTS ≠ ZERO: passats `dies_avis_dades` (7) sense declaració nova, el
    sistema HO DIU i no seguix raonant en silenci sobre xifres velles. La comparació es fa
    contra el dia DE VERES, no contra la data de l'última instantània: si no, quan es deixa
    de pujar dades el rellotge es congela i l'avís no salta mai.

---

## CANVIS RESPECTE DEL SISTEMA ACTUAL (per al DIFF)

1. **Fora l'estratègia «fàbrica»** i tot el seu vocabulari (fornades incloses:
   no són mecànica del joc i compliquen l'onboarding). Queden competitiva i
   cycle (WIP).
2. **L'entrenament és prescripció** (creativitat + passades), no configuració.
3. **`nivell_objectiu` derivat de l'economia** via taula de salaris — els rivals
   no entren al model (dades canviants i interpretables; la ruïna és l'únic
   game over real).
4. **Flux i estoc separats:** el flux fixa el nivell sostenible, l'estoc fixa la
   compra. Cap projecció dins d'una decisió.
5. **Una vara per costat:** `distància` per a comprar, `sobrecost` per a vendre i
   retindre. Cap mètrica composta que valga per als dos.
6. **L'estadi va PRIMER, no competix** (v3.1): és l'única compra que mou el flux, i
   per tant no és comparable amb un fitxatge per eficiència.
7. **El personal és bucle de flux** (contractar = comprometre setmanes;
   l'única decisió reversible és renovar o no al venciment: **acomiadar no
   existix**), amb la mateixa unitat guany/cost que jugadors i estadi.
8. **Fora tota referència a Supporter** — no canvia cap decisió del sistema.
9. **Els juvenils proveïxen rotatius** (`util` = arriba al nivell objectiu), no
   són un negoci a banda.
10. Es mantenen del full anterior: calendari únic, `depressio_profunda` en fracció,
   llindes d'urgència com a poms, mecanisme actua/informa/desfés, i els tres guardians.

## v3.1 · 2026-07-26 · CORRECCIONS SOBRE DADES REALS (aprovades per Miquel)

Diagnosticades contra l'informe setmanal real de Benifotrem (T83). El registre complet,
amb la demostració de cada error, a [`docs/FORATS.md`](FORATS.md).

11. **L'economia és BI-SETMANAL** i es declara el període TANCAT (invariant 16). En lliga
   es juga un partit a casa i un fora: un flux setmanal oscil·la més que el propi flux net.
12. **`premis` ix del flux i entra a l'estoc**: és una prima de final de temporada, no un
   ingrés recurrent. `ingressos_recurrents = taquilla + patrocini`, i prou: la resta no és
   extrapolable i marejaria el sostre de sou.
13. **La reserva és una FRACCIÓ, no un import**: les despeses recurrents no poden passar
   del 95% dels ingressos recurrents (`reserva_flux_pct`).
14. **`guany(estadi)` era impossible de ser positiu**: es calculava només des de l'estalvi
   de manteniment, i ampliar sempre el puja. Cau sencer amb la prioritat absoluta (canvi 6).
15. **Dues bases de personal**: l'entrenador no cobra com la resta (1.250 contra 1.020).
16. **`despesa_planter` es deriva** de `sistema_juvenil` i `n_cercapromeses`; el
   `manteniment_estadi` es declara i és constant fins a la remodelació.
17. **Fora TOT el preu de venda**: ni estimat ni declarat. No canviava cap decisió: l'ordre
   de venda el porta `sobrecost` i «es ven o s'acomiada» el decidix la subhasta. Amb ell
   cauen `valor_net`, `valor_net_promo`, la branca `PROMOCIONA_I_LLISTA` del PAS 10 (el
   juvenil-com-a-negoci que el canvi 9 ja havia retirat) i els camps `preu_eixida` i
   `preu_venut` de la fitxa.
18. **L'ECONOMIA SÓN QUATRE COSES** (ordre de Miquel): taquilla i patrocinadors de les dos
   setmanes, diners disponibles i manteniment d'estadi. **Fora la comptabilitat de
   moviments** sencera (formulari, llista, API i l'alerta que reclamava l'import d'una
   venda): amb la caixa declarada, apuntar moviment a moviment no alimentava cap decisió.
   I els ingressos es declaren **per setmana, literals**, així que cap factor 2 els toca.

## PROCÉS

1. Aprovat → `docs/FORMULES.md`; mana sobre tot; `formules.json` regenerat.
2. Cada canvi: fórmula al full + referència a G1 + test «mateixa entrada → mateix
   número» + G1-G3 verds + verificació per propietat a prod.
