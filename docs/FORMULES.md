# FULL DE FÓRMULES DE TONICO

> ⚖️ **CONTRACTE · FONT DE VERITAT.** Aprovat per Miquel (2026-07-24). Mana sobre
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

**v3 · 2026-07-24 · Model competitiu-econòmic · APROVAT (Miquel)**

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
2. **Una sola mètrica.** `mancança(lloc) × pes(lloc)` ordena compres, vendes i
   obres d'estadi. Tot competix pel mateix diner amb la mateixa unitat.

---

## V — VARIABLES BASE (una font cadascuna)

```
config          = { estrategia, pais, divisio, sistema_juvenil, partits_setmana }
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
pais, divisio, sistema_juvenil ∈ {acadèmia, cercapromeses, cap}, partits_setmana ∈ {2,1}
```
Caixa, ingressos, despeses, personal i estadi es demanen a l'informe després de
la primera pujada (mai a l'entrada).

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
ingressos_recurrents = taquilla + patrocini + premis        [declarats/derivats]
despeses_fixes       = nòmina + manteniment_estadi + personal + planter
flux                 = ingressos_recurrents − despeses_fixes
sou_sostenible       = MAX(0; flux + nòmina − `reserva_flux`)
   [= tot el que pots dedicar a sous sense entrar en pèrdues]
caixa                = saldo real declarat (mai projectat)
caixa_disponible     = MAX(0; caixa − `reserva_caixa`)
```

## PAS 4 — NIVELL OBJECTIU PER LLOC (derivat del flux, no dels rivals)

```
pressupost_sou(lloc)  = sou_sostenible × pes(lloc) / SUMA(pesos de tots els llocs)
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
                 SI(sobrecost(j) > 0;                              "sou desproporcionat";
                 SI(j ∈ venda;                                     "sobrant"; ∅)))
ordre_venda    = ORDENA(FILTRA(plantilla; motiu_venda ≠ ∅);
                        sobrecost DESC, preu_esperat DESC)
calibrat        = COMPTA(vendes_reals ∪ comparables) ≥ `min_mostres`
preu_esperat(j) = SI(calibrat; estimació_comparables(j);
                     BUSCA(`base_preu_divisio`; divisio) × factor_habilitat(j))
                  ← ÚNICA fórmula de preu del sistema
valor_net(j)    = preu_esperat(j) − `cost_llistat` − sou(j) × setmanes_venda(j)
urgent(j)       = dies_aniversari(j) ≤ `dies_urgencia`
destí(j) = SI(lesionat(j);                              AGENDA("llista'l en recuperar-se");
           SI(calibrat I valor_net(j) < `llindar_despatx`;  ACCIÓ("despatxa'l");
           SI(fase_mercat(hui + `dies_subhasta`) ≤ `depressio_profunda` I ¬urgent(j);
                                                       AGENDA("llista'l", dia_D);
                                                       ACCIÓ("llista'l HUI", preu_esperat))))
   [`depressio_profunda` en FRACCIÓ, mateixes unitats que el modificador]
PREGUNTA("¿venut per quant / deserta?")  quan transferible passa 1→buit sense venda
recalibra(estimació) A CADA venda real       → la caixa cobrada activa el PAS 8
```

## PAS 8 — COMPRAR (només amb caixa cobrada; jugadors i estadi competixen)

```
-- opció JUGADOR (per lloc amb mancança)
candidat(lloc)  = jugador de mercat amb hab(habilitat_lloc) ≥ nivell_objectiu(lloc)
guany(jugador)  = mancança(lloc) × pes(lloc)
cost(jugador)   = preu
admissible      = preu ≤ caixa_disponible  I  sou ≤ pressupost_sou(lloc)

-- opció ESTADI (dades DECLARADES; la guia §10 delega en calculadores CHPP)
PREGUNTA a l'inici de cada temporada, de `url_calculadora_estadi` (configuració NRG):
   `estadi_manteniment`  = manteniment setmanal de la configuració  → FLUX
   `estadi_cost_obra`    = total costs de l'obra                    → ESTOC
   [maximum payout: no es demana, no entra a cap decisió]
Δflux(obra)          = manteniment_actual − `estadi_manteniment`
Δnivell_pagable(lloc)= nivell_objectiu(lloc | sou_sostenible + Δflux)
                       − nivell_objectiu(lloc | sou_sostenible)
guany(estadi)  = SUMA(llocs amb mancança > 0:
                      pes(lloc) × MIN(mancança(lloc), Δnivell_pagable(lloc)))
   [només compta on hi ha mancança — pujar el sostre d'un lloc ja cobert val 0]
cost(estadi)   = `estadi_cost_obra`
admissible     = cost ≤ caixa_disponible  I  flux + Δflux ≥ 0

-- decisió
eficiència(opció) = guany / cost
ACCIÓ = PRIMER(ORDENA(FILTRA(opcions; admissible); eficiència DESC))
   SI cap opció admissible: cap compra; el sistema optimitza NOMÉS venent (PAS 7)
capacitat_objectiu   = configuració NRG de `url_calculadora_estadi`   [declarada]
   [l'obra concreta —dimensió i repartiment de graderies— es delega a la
    calculadora; Tonico només diu QUAN toca i si guanya la comparació]
```

## PAS 9 — ALINEACIONS

```
llocs ordenats per pes DESC, partit ASC
disponible(j, lloc) = j ∈ retinguts I ¬llistat(j) I ¬lesionat(j)
                    I ¬(sancionat(j) I partit = lliga)
                    I partits_assignats(j) < max_partits(j) I compatible(j, lloc)
valor(j, lloc)  = SI(entrenable(lloc) I j ∈ core ∪ rotatius; `pes_entrenament`;
                     hab(j, habilitat_lloc(lloc)))
jugador(lloc)   = PRIMER(ORDENA(FILTRA(retinguts; disponible); valor DESC,
                                partits_assignats ASC, sou ASC))
   11A (competitiu) = els millors per valor · 11B = onze d'entrenament: garantix
   els minuts dels rotatius i dels juvenils promocionats; la resta, cossos
buit(lloc) = ∅ → juga amb un menys; excepció declarada si cal moure un entrenable
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
destí(promo) = SI(util(promo); PROMOCIONA (entra com a rotatiu de l'11B);
               SI(valor_net_promo(promo) > 0; PROMOCIONA_I_LLISTA; DESPATXA))
   valor_net_promo(j) = preu_esperat(hab_visibles + `bonus_club_mare`)
                        − `cost_promocio` − sou_estimat × 2
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
   [El personal consumix FLUX (sou setmanal), no estoc. Tot el personal cobra igual
    siga quin siga el tipus: només compta el NIVELL. Per tant no es compara eficiència
    entre tipus — es seguix una PRIORITAT fixa i cada tipus s'emporta el nivell més alt
    que el flux encara sostinga.]

cost_flux(nivell) = `staff_cost_base` × 2^(nivell−1)
                    [1.020 · 2.040 · 4.080 · 8.160 · 16.320]
flux_lliure       = flux − `reserva_flux`

prioritat_personal = `prioritat_personal`   [orde fix, pom]
   1. assistents  — accelera l'entrenament (sempre, tots dos)
   2. entrenador  — eficiència d'entrenament (guia §7: notable 100%, excel·lent 105,3%)
   3. metge       — assegurança de baixes
   4. psicòleg    — NOMÉS SI divisio ≤ `divisio_psicoleg`

nivell(tipus) = MAX(n : cost_flux_acumulat(fins a tipus, n) ≤ flux_lliure)
                seguint prioritat_personal
   [el pressupost es gasta per orde: el que queda després dels anteriors]

ACCIÓ("contracta/puja de nivell", tipus, nivell, cost_flux)  SI nivell(tipus) > declarat
AVÍS: compromet el flux `setmanes_contracte` setmanes (no es pot desfer)

RENOVAR (única decisió reversible; NO existix acomiadar):
   PER membre amb 0 ≤ setmanes_restants ≤ `dies_avis_caducitat`:
      SI(cost_flux(actual) ≤ flux_lliure;             ACCIÓ("renova")
      SI(existix n < actual amb cost_flux(n) ≤ flux_lliure;
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
3. Cap decisió de compra amb diners no cobrats; cap compra que deixe flux < 0 o
   caixa < `reserva_caixa`.
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
5. **Mètrica única `mancança × pes`** per a comprar, vendre i obrar l'estadi.
6. **L'estadi entra al bucle de caixa** amb la mateixa unitat (guany/cost sobre
   `setmanes_horitzo`).
7. **El personal és bucle de flux** (contractar = comprometre setmanes;
   l'única decisió reversible és renovar o no al venciment: **acomiadar no
   existix**), amb la mateixa unitat guany/cost que jugadors i estadi.
8. **Fora tota referència a Supporter** — no canvia cap decisió del sistema.
9. **Els juvenils proveïxen rotatius** (`util` = arriba al nivell objectiu), no
   són un negoci a banda.
10. Es mantenen del full anterior: calendari únic, preu_esperat únic,
   `depressio_profunda` en fracció, llindes d'urgència com a poms, mecanisme
   actua/informa/desfés, i els tres guardians.

## PROCÉS

1. Aprovat → `docs/FORMULES.md`; mana sobre tot; `formules.json` regenerat.
2. DIFF fórmula a fórmula contra `docs/FORMULES_ACTUALS.md` → lots.
3. Reconstrucció per lots autoritzats: canvi + test «mateixa entrada → mateix
   número» + G1-G3 verds + verificació per propietat a prod.
