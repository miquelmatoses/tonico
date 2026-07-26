# FULL DE FÓRMULES DE TONICO

> ⚖️ **CONTRACTE · FONT DE VERITAT.** Aprovat per Miquel (v3: 2026-07-24 · v3.1:
> 2026-07-26). Mana sobre
> qualsevol codi, doctrina o document anterior. El codi de Tonico és un avaluador
> d'estes fórmules i res més. Mirall llegible per màquina:
> [`formules.json`](../formules.json). Pla de reconstrucció:
> [`docs/DIFF_FORMULES.md`](DIFF_FORMULES.md). Estat del sistema d'abans:
> [`docs/FORMULES_ACTUALS.md`](FORMULES_ACTUALS.md). Contracte anterior (retirat):
> [`docs/FORMULES_v2_SUPERAT.md`](FORMULES_v2_SUPERAT.md).
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
2. **Una sola mètrica.** `mancança(lloc) × pes(lloc)` ordena compres i vendes.
   L'estadi no hi competix: va primer, perquè és l'únic que mou el flux (canvi 6).

---

## V — VARIABLES BASE (una font cadascuna)

```
config          = { estrategia, pais, divisio, sistema_juvenil, n_cercapromeses, partits_setmana }
estrategia      ∈ { competitiva, cycle(WIP) }
hores(pais)     = BUSCA(`hores_pais`; pais) → {economia_dia, economia_hora}
plantilla       = instantània sènior vigent · juvenils = instantània juvenil vigent
llocs_partit    = 11 × partits_setmana
(temporada, setmana) = f_calendari(data, `ancora`)      ← ÚNICA funció del sistema
llistat(j)      = csv.transferible(j) = 1  O  fitxa.llistada(j)
lesionat(j)     = csv.lesio(j) ≥ 1                      [font: buit | N setmanes]
sancionat(j)    = csv.amonestacions(j) ≥ `amonestacions_suspensio`   [3; només lliga]
edat_d(j)       = anys(j)×112 + dies(j)   ·   dies_aniversari(j) = 112 − dies(j)
fase_mercat(d)  = BUSCA(`fases_mercat`; setmana(d)) → modificador (FRACCIÓ, mai enter)
horitzo_eixida(j) = temporada en què edat_d(j) assoleix `edat_pic_venda`×112
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
(A, B) = (creativitat, passades)   · intensitat 100% · resistència `resistencia_pct`
   [prescripció: el motor de partit decidix per possessió del mig del camp, i el
    mercat de MC és el més líquid → l'entrenament que competix i finança alhora]
ACCIÓ("canvia l'entrenament a HT")  SI configurat_HT ≠ prescrit
```

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
N_core     = COMPTA(pos_A)                     [5: 3 MC + 2 extrems]
N_rotatius = SUMA(pos_A amb pct=100: partits_setmana − 1)   [3: els MC del bloc B]
max_partits(j) = SI(pct(lloc(j)) < 100 O rol(j) ∈ {futur_entrenador, cos}; 2; 1)
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
despeses_fixes   = per_periode(nòmina + manteniment_estadi + personal + despesa_planter)
flux             = ingressos_recurrents − despeses_fixes
reserva_flux     = `reserva_flux_pct` × ingressos_recurrents
sou_sostenible   = MAX(0; ingressos_recurrents − reserva_flux
                          − (despeses_fixes − per_periode(nòmina)))
   [= les despeses recurrents no poden passar del (1 − `reserva_flux_pct`) dels
    ingressos recurrents. La reserva és POLÍTICA DE RISC declarada, no mecànica]
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
```

## PAS 5 — MANCANÇA (la mètrica única)

```
ocupant(lloc)   = el jugador assignat al lloc (PAS 8) o ∅
nivell_actual(lloc) = SI(ocupant ≠ ∅; hab(ocupant, habilitat_lloc(lloc)); 0)
mancança(lloc)  = MAX(0; nivell_objectiu(lloc) − nivell_actual(lloc))
excés(j)        = MAX(0; hab(j, habilitat_lloc(lloc(j))) − nivell_objectiu(lloc(j)))
sobrecost(j)    = MAX(0; sou(j) − BUSCA(`taula_salaris`; habilitat_lloc(lloc(j));
                                        nivell_objectiu(lloc(j))))
prioritat(lloc) = mancança(lloc) × pes(lloc)
```

## PAS 6 — PLANTILLA (qui es queda, derivat)

```
core      = PRIMERS(N_core;  ORDENA(FILTRA(plantilla; hab(j,A) ≥ `core_a_min`);
                                    hab(j,A) DESC, edat_d ASC))
rotatius  = PRIMERS(N_rotatius; ORDENA(FILTRA(plantilla − core;
                     edat_d ∈ [17×112, `edat_pic_venda`×112]); hab(j,A) DESC))
titulars  = PER lloc ∉ pos_A: PRIMER(ORDENA(FILTRA(plantilla − core − rotatius;
                     compatible(j, lloc)); hab(j, habilitat_lloc) DESC, sou ASC))
porters_n = 1 × partits_setmana
cossos_n  = ARREDONIX.AMUNT((llocs_partit − llocs_ocupats(core, rotatius, titulars,
                             porters)) / partits_setmana)
cossos    = PRIMERS(cossos_n; ORDENA(plantilla restant; sou ASC))
retinguts = core ∪ rotatius ∪ titulars ∪ porters ∪ cossos
venda     = plantilla − retinguts        [categoria sencera; cap marca dins]
```

## PAS 7 — VENDRE (allibera sou i genera caixa)

```
motiu_venda(j) = SI(j ∈ rotatius I temporada ≥ horitzo_eixida(j); "pic de valor";
                 SI(calibrat I sobrecost(j) > 0;                   "sou desproporcionat";
                 SI(j ∈ venda;                                     "sobrant"; ∅)))
   [SENSE CALIBRAR NO ES DESFÀ DE NINGÚ PEL SOU. `sobrecost` penja de
    nivell_objectiu, que penja del flux: mentre el flux siga soroll, este motiu ho
    seria també. Els altres dos no en depenen —l'edat i l'estructura de plantilla— i
    seguixen funcionant]
ordre_venda    = ORDENA(FILTRA(plantilla; motiu_venda ≠ ∅); sobrecost DESC)
urgent(j)       = dies_aniversari(j) ≤ `dies_urgencia`
destí(j) = SI(lesionat(j);                              AGENDA("llista'l en recuperar-se");
           SI(fase_mercat(hui + `dies_subhasta`) ≤ `depressio_profunda` I ¬urgent(j);
                                                       AGENDA("llista'l", dia_D);
                                                       ACCIÓ("llista'l HUI")))
   [`depressio_profunda` en FRACCIÓ, mateixes unitats que el modificador]
PREGUNTA("¿venut per quant / deserta?")  quan transferible passa 1→buit sense venda
destí(deserta) = SI(j ∈ sobrants; ACCIÓ("despatxa'l"); TRIA(`eixides_deserta`))
   [ES LLISTA UNA VEGADA. Si va desert i el jugador SOBRA —no té lloc a cap dels dos
    onzes— s'acomiada: rellistar-lo cada setmana és pagar `cost_llistat` per res.
    Un retingut, un rotatiu o un cos MAI s'acomiaden per anar deserts]
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
Δmanteniment   = `estadi_manteniment` − manteniment_actual
admissible(estadi) = `estadi_cost_obra` ≤ caixa
                   I  flux − per_periode(Δmanteniment) ≥ reserva_flux
ACCIÓ("remodela l'estadi")  SI admissible(estadi) I ¬estadi_caduc
   [PRIORITAT ABSOLUTA: abans que qualsevol fitxatge, sempre. L'estadi és l'única
    compra que MOU EL FLUX — un fitxatge consumix el pressupost, l'estadi aixeca el
    pressupost mateix i amb ell el nivell_objectiu de TOTS els llocs alhora.
    Optimitzar dins de la restricció i relaxar la restricció no són del mateix rang:
    comparar-los per eficiència era comparar coses incomparables.]
   [NO es projecta el que l'obra ingressarà (invariant 3): no fa falta predir-ho,
    s'OBSERVA al període següent quan es declara la taquilla nova]

-- opció JUGADOR (només si l'estadi ja no demana res)
candidat(lloc)  = jugador de mercat amb hab(habilitat_lloc) ≥ nivell_objectiu(lloc)
guany(jugador)  = mancança(lloc) × pes(lloc)
cost(jugador)   = preu de mercat del candidat        [preu real llistat, no estimat]
admissible      = preu ≤ caixa  I  sou ≤ pressupost_sou(lloc)
eficiència(jugador) = guany / cost
ACCIÓ = PRIMER(ORDENA(FILTRA(candidats; admissible); eficiència DESC))
   SI cap opció admissible: cap compra; el sistema optimitza NOMÉS venent (PAS 7)
capacitat_objectiu   = configuració NRG de `url_calculadora_estadi`   [declarada]
   [l'obra concreta —dimensió i repartiment de graderies— es delega a la
    calculadora; Tonico només diu QUAN toca]
```

## PAS 9 — ALINEACIONS

```
llocs ordenats per pes DESC, partit ASC
disponible(j, lloc) = j ∈ retinguts I ¬llistat(j) I ¬lesionat(j)
                    I ¬(sancionat(j) I partit = lliga)
                    I partits_assignats(j) < max_partits(j)
   [NO hi ha `compatible`: l'assignació és MAXIMITZACIÓ PURA. Qui discrimina és
    valor(j, lloc) — un porter en un lloc de defensa hi val la seua defensa, i per
    tant el perd contra un defensa de veres.]
valor(j, lloc)  = SI(entrenable(lloc) I j ∈ core ∪ rotatius; `pes_entrenament`;
                     hab(j, habilitat_lloc(lloc)))
jugador(lloc)   = PRIMER(ORDENA(FILTRA(retinguts; disponible); valor DESC,
                                partits_assignats ASC, sou ASC))
   11A (competitiu) = els millors per valor · 11B = onze d'entrenament: garantix
   els minuts dels rotatius i dels juvenils promocionats; la resta, cossos
buit(lloc) = ∅ → juga amb un menys; excepció declarada si cal moure un entrenable
   [INVARIANT: cap lloc queda buit havent-hi un retingut disponible.]
comptabilitat(j) = SUMA(pct dels llocs assignats)
```

## PAS 10 — JUVENILS (si sistema_juvenil ≠ cap) — proveïdors de rotatius

```
esperat_act(h) = MITJANA(revelacions pròpies de h)   [∅ → `esperat_defecte`]
valor(j,h) = SI(act I pot coneguts; act + (pot−act)×`f_marge`;
             SI(act conegut;        act + `marge_ple`×`f_marge`;
             SI(pot conegut;        MIN(esperat_act,pot) + (pot−MIN(esperat_act,pot))×`f_marge`;
                                    esperat_act + `marge_ple`×`f_marge`)))
NIVELL(j)  = `pes_A`×valor(j,A) + `pes_B`×valor(j,B)
util(j)    = potencial(j, A) ≥ nivell_objectiu(MC)   ← ¿arribarà al nivell del lloc?
elegible(j)= edat_d ≥ 17×112 I estada ≥ 112
promo      = PRIMER(ORDENA(FILTRA(juvenils; elegible); NIVELL DESC))
             [màx `promocio_max_setmana` = 1, fet del joc]
destí(promo) = SI(util(promo); PROMOCIONA (entra com a rotatiu de l'11B); DESPATXA)
   [dos branques, no tres. «Promociona i llista'l per a fer caixa» era el model del
    juvenil com a NEGOCI, que el canvi 9 va retirar: els juvenils proveïxen rotatius.
    Si no arriba al nivell del lloc, no serveix, i no hi ha preu que ho canvie]
onze juvenil = mateixa fórmula del PAS 9 amb `taula_entrenament_juvenil`:
   cada lloc entrenable pren el juvenil lliure amb MÉS guany marginal per a ELL
   (només els components del lloc); guany ≈ 0 pertot → estructura; banqueta = el
   que menys perd; formació legal i COMPTA(en_camp) ≥ `minim_en_camp`
sobra = COMPTA(juvenils) − `objectiu_juvenil`   [`objectiu_juvenil` = onze legal + 1]
despatxa PRIMERS(sobra; ORDENA(juvenils; NIVELL ASC, n_revelacions ASC))
reinici_crida = pròxim (hores(pais).economia_dia, economia_hora + 1h)
ACCIÓ("fes la crida al cercapromeses", caduca)  SI crida_disponible
reexecuta el PAS a CADA pujada (revelacions recalibren esperat_act)
```

## PAS 11 — PERSONAL (bucle de FLUX; el paral·lel del PAS 8)

```
   [El personal consumix FLUX (sou setmanal), no estoc. El cost NOMÉS depén del NIVELL
    i de la BASE del tipus. Per tant no es compara eficiència entre tipus — es seguix
    una PRIORITAT fixa i cada tipus s'emporta el nivell més alt que el flux sostinga.]

cost_flux(tipus, nivell) = base(tipus) × 2^(nivell−1)
   base(tipus) = BUSCA(`prioritat_personal`; tipus) → base   [si no en declara: `staff_cost_base`]
   [DUES bases, no una: 1.020 per als especialistes (1.020 · 2.040 · 4.080 · 8.160 ·
    16.320) i 1.250 per a l'entrenador (1.250 · 2.500 · 5.000 · 10.000 · 20.000).
    Mateixa progressió, base distinta: l'entrenador NO cobra com la resta d'empleats.
    Verificat contra l'informe real: 2 assistents + metge de nivell 2 (3 × 2.040) +
    entrenador de nivell 3 (5.000) = 11.120 €, la xifra exacta de HT.]
flux_lliure       = MAX(0; flux + per_periode(cost_personal_actual) − reserva_flux)
   [el cost del personal que ja tens ja va restat dins del flux: si no se li torna a
    sumar, el bucle es veu sense marge just per tindre el personal que està valorant.
    Simètric amb sou_sostenible, que fa el mateix amb la nòmina.]

prioritat_personal = `prioritat_personal`   [orde fix, pom]
   1. assistents  — accelera l'entrenament (sempre, tots dos)
   2. entrenador  — eficiència d'entrenament (guia §7: notable 100%, excel·lent 105,3%)
   3. metge       — assegurança de baixes
   4. psicòleg    — NOMÉS SI divisio ≤ `divisio_psicoleg`

nivell(tipus) = MAX(n : cost_flux_acumulat(tipus, n) ≤ flux_lliure)
                seguint prioritat_personal
   [el pressupost es gasta per orde: el que queda després dels anteriors]

ACCIÓ("contracta/puja de nivell", tipus, nivell, cost_flux)  SI nivell(tipus) > declarat
AVÍS: compromet el flux `setmanes_contracte` setmanes (no es pot desfer)

RENOVAR (única decisió reversible; NO existix acomiadar):
   PER membre amb 0 ≤ setmanes_restants ≤ `dies_avis_caducitat`:
      SI(cost_flux(tipus, actual) ≤ flux_lliure;      ACCIÓ("renova")
      SI(existix n < actual amb cost_flux(tipus, n) ≤ flux_lliure;
                                                      ACCIÓ("renova al nivell n")
                                                      ACCIÓ("no renoves")))
   [el flux només es pot retallar al venciment: contractar és comprometre's]
```

## PAS 12 — INFORME I AGENDA

```
CADUCITATS (contractes de personal i altres dates declarades):
   ACCIÓ("renova/decidix", data)  SI 0 ≤ data − hui ≤ `dies_avis_caducitat`
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
14. Vocabulari únic: lloc de partit · lloc entrenable · core · rotatiu · titular ·
    cos · retingut · sobrant · mancança · flux · estoc · flux_lliure. Cap sinònim.
15. PRECONDICIÓ DEL PAS 0: cap derivació que depenga del PAS 0 s'executa amb el PAS 0
    incomplet. Si falta `partits_setmana`, `pais` o `divisio`, el sistema INFORMA QUÈ
    FALTA I NO TOCA RES: no assigna rols, no genera moviments i no emet accions que en
    depenguen. Les fórmules que no en depenen (`N_core`, `titulars`) sí que s'avaluen.
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
5. **Mètrica única `mancança × pes`** per a comprar i vendre.
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
2. DIFF fórmula a fórmula contra `docs/FORMULES_ACTUALS.md` → lots.
3. Reconstrucció per lots autoritzats: canvi + test «mateixa entrada → mateix
   número» + G1-G3 verds + verificació per propietat a prod.
