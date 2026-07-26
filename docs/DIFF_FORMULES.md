# DIFF FÓRMULES — contracte v3 vs sistema actual

> Compara cada fórmula de [`docs/FORMULES.md`](FORMULES.md) **v3 (model competitiu-econòmic)**
> amb el que [`docs/FORMULES_ACTUALS.md`](FORMULES_ACTUALS.md) diu que el sistema fa HUI.
> **Només lectura de codi.** No comença cap canvi: és el pla que Miquel autoritzarà per lots.
> Substituïx el DIFF del contracte v2 (retirat amb el model «fàbrica»).
>
> **Llegenda:** `[IGUAL]` mateixa fórmula i orígens · `[DIVERGENT]` la lògica difereix ·
> `[HARDCODE]` la lògica coincidix però amb números/llistes en codi o doctrina implícita ·
> `[ABSENT]` el full la té i el sistema no · `[SOBRANT]` el sistema ho fa i el full no ho
> contempla.
>
> **Avís de fons:** el v3 no és un retoc del v2, és un **canvi de model**. La conseqüència
> numèrica és que **42 de 100 fórmules són ABSENT** (construcció nova) i que tot el
> vocabulari «fàbrica» (fornades incloses) passa a SOBRANT. Això no és una estimació
> pessimista: és el que costa canviar el motor econòmic del sistema.

---

## V — VARIABLES BASE (12)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `config = {estrategia, pais, divisio, sistema_juvenil, partits_setmana}` | **ABSENT** | no existix cap objecte config; `divisio` viu a plans_temporades, `sistema_juvenil` és el booleà teAcademia | construir l'objecte únic |
| `estrategia ∈ {competitiva, cycle}` | **ABSENT** | no hi ha selector; 'fabrica' cablejat com a plantilla | construir (base de P1/P6/P11) |
| `hores(pais) = BUSCA(hores_pais; pais)` | **ABSENT** | no hi ha `hores_pais`; `crida_reinici_dia`=6 global | construir taula per país |
| `plantilla` / `juvenils` (instantànies vigents) | **IGUAL** | orquestra_classificacio.js:39, orquestra_alertes.js:50-56 | — |
| `llocs_partit = 11 × partits_setmana` | **HARDCODE** | 11 implícit a `formacio`; `partits_setmana` no és pom (deriva de COMPTA(`rols`)=2) | fer `partits_setmana` pom |
| `(temporada, setmana) = f_calendari` | **DIVERGENT** | calculat en **3 llocs**: pla.js:11, orquestra_alertes.js:79, calendari.js (via economia.js:87) | unificar en 1 funció |
| `llistat(j)` | **IGUAL** | estat='llistat' O transferible=1 (orquestra_alineacio.js:53,61) | — |
| `lesionat(j) = csv.lesio ≥ 1` | **IGUAL** | liquidacio.js | — |
| `sancionat(j) = amonestacions ≥ amonestacions_suspensio [només lliga]` | **DIVERGENT** | la **font coincidix** (pom `suspensio_amonestacions`=3, orquestra:37), però el sistema exclou el sancionat de **tots** els partits, no només de lliga (alineacio.js `disp`) | limitar l'abast a lliga; renombrar el pom |
| `edat_d(j)` · `dies_aniversari(j)` | **IGUAL** | `edat_dies`; `any_dies`=112 constant_joc (regles.js:80) | — |
| `fase_mercat(d) → modificador (FRACCIÓ)` | **IGUAL** | BUSCA(calendari_mercat; setmana) (mercat.js:3-34); ja és fracció | renombrar taula `calendari_mercat`→`fases_mercat` (inv. 14) |
| `horitzo_eixida(j) = temporada en què edat_d assoleix edat_pic_venda×112` | **DIVERGENT** | l'horitzó és **per fornada** (lletres), no per jugador (fornades.js, orquestra_classificacio.js:124-177) | reescriure per jugador; les fornades cauen (SOBRANT) |

---

## PAS 0 — CONFIGURACIÓ (2) · tot ABSENT

| fórmula | classe | sistema actual | acció |
|---|---|---|---|
| `estrategia = TRIA(competitiva \| cycle)` | **ABSENT** | — | construir (cycle: WIP declarat, sense contingut) |
| `pais, divisio, sistema_juvenil, partits_setmana` | **ABSENT** (parcial) | `divisio` i `sistema_juvenil` existixen; `pais` i `partits_setmana` no | completar les dos que falten |

> El v3 mou caixa/ingressos/despeses/personal/estadi **a l'informe després de la primera
> pujada**, no a l'entrada. El sistema actual ja els demana per `falten.js` → mecanisme
> **REAPROFITABLE**.

---

## PAS 1 — ENTRENAMENT (2)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `(A,B) = (creativitat, passades)` prescrit, intensitat 100%, `resistencia_pct` | **DIVERGENT** | els **valors coincidixen** (poms juvenils `entrenament_a/b`, schema/044:28-29), però el sènior és **configurable** i ve d'un sol skill de `fases_config` (entrenament.js:4-8) | passar de configuració a prescripció; unificar sènior/juvenil |
| `ACCIÓ("canvia l'entrenament a HT") SI configurat_HT ≠ prescrit` | **DIVERGENT** | ALR_ENTRENAMENT_DESQUADRE compara {tipus,intensitat,resistencia} confirmat vs prescrit (regles.js:342-350) — molt reaprofitable | reapuntar el «prescrit» a la prescripció fixa |

---

## PAS 2 — LLOCS I PESOS (7)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `pos_A(pct) = FILTRA(taula_entrenament; habilitat=A)` | **IGUAL** ✅ | placesEntrenament (entrenament_places.js:13-18) · *verificat al G1* | — |
| `pos_B` | **IGUAL** ✅ | valorPlaces (valor_placa.js) · *verificat al G1* | — |
| `entrenable(lloc) = lloc ∈ pos_A` | **IGUAL** ✅ | *verificat al G1* | — |
| `pes(lloc) = BUSCA(taula_aportacio; lloc)` | **ABSENT** | **no existix cap taula d'aportació**; el sistema no pondera llocs | construir `taula_aportacio` — **és l'entrada de la mètrica única** |
| `N_core = COMPTA(pos_A)` [5] | **DIVERGENT** | `entrenables_objectiu` = Σ(pct/100)·nRols = **8**, no 5 (cobertura.js:73-77) | recomptar: 5 llocs, no 8 jugadors |
| `N_rotatius = SUMA(pos_A amb pct=100: partits_setmana−1)` [3] | **ABSENT** | no hi ha concepte de «rotatiu» | construir |
| `max_partits(j)` | **DIVERGENT** | implícit en doblats/simples (alineacio.js:65-78) | fer funció explícita |

---

## PAS 3 — ECONOMIA (6)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `ingressos_recurrents = taquilla + patrocini + premis` | **DIVERGENT** | un sol número declarat `finances.ingres_setmanal` (schema/021) | descompondre en 3 components |
| `despeses_fixes = nòmina + manteniment_estadi + personal + planter` | **IGUAL** | `despesaTotal` = nomina + despesa_planter + despesa_estadi + personalSetmanal (economia.js:41-44) | renombrar `despesa_estadi`→`manteniment_estadi` |
| `flux = ingressos_recurrents − despeses_fixes` | **IGUAL** | `balancSetmanal` (economia.js:44) | renombrar a `flux` (inv. 14) |
| `sou_sostenible = MAX(0; flux + nòmina − reserva_flux)` | **ABSENT** | **cap concepte de sou sostenible** | construir — **és la frontissa del model nou** |
| `caixa = saldo real declarat (mai projectat)` | **DIVERGENT** | si `finances.caixa` és null, cau **silenciosament** a SUM(transaccions) (economia.js:20-23) | prohibir el fallback; demanar-la |
| `caixa_disponible = MAX(0; caixa − reserva_caixa)` | **DIVERGENT** | `caixa − reserva_operativa`, després **dividida per gap** (regles.js:300) | llevar el repartiment; renombrar el pom |

---

## PAS 4 — NIVELL OBJECTIU PER LLOC (3) · tot ABSENT — **el cor del model nou**

| fórmula | classe | sistema actual | acció / estimació |
|---|---|---|---|
| `pressupost_sou(lloc) = sou_sostenible × pes(lloc) / SUMA(pesos)` | **ABSENT** | — | fórmula curta; depén de `pes` (P2) i `sou_sostenible` (P3) |
| `habilitat_lloc(lloc) = BUSCA(taula_habilitat_lloc; lloc)` | **ABSENT** (taula) | el **mapatge existix repartit**: `buckets_alineacio` (posició→bucket) + `taula_entrenament` (skill→buckets) | taula nova, però derivable de dades ja presents → **barat** |
| `nivell_objectiu(lloc) = MAX(n : taula_salaris(hab,n) ≤ pressupost_sou)` | **ABSENT** | **no existix `taula_salaris`** | **cal carregar la taula de salaris de la guia** (dada externa, feina de seed) + cerca inversa |

---

## PAS 5 — MANCANÇA, LA MÈTRICA ÚNICA (6) · tot ABSENT

`ocupant` · `nivell_actual` · `mancança` · `excés` · `sobrecost` · `prioritat`

**Cap equivalent al sistema.** Són fórmules curtes i pures, però **depenen totes de P4**
(`nivell_objectiu`) i de `pes` (P2). Un colp existixen P2+P4, este pas és mecànic.
`prioritat = mancança × pes` és **la unitat comuna** que P7 (vendre), P8 (comprar/estadi) i
P11 (personal) consumixen: sense ella, els tres bucles no es poden comparar.

---

## PAS 6 — PLANTILLA (8)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `core = PRIMERS(N_core; ORDENA(hab(A)≥core_a_min; hab(A) DESC, edat_d ASC))` | **DIVERGENT** | categoria `entrenable`: places {mc:6,extrem:2}, requisits creativitat≥2/edat≤23, puntuació `creativitat·1+(20−edat)·0.5` (schema/004:18-21) | reescriure (el motor d'embut es reaprofita) |
| `rotatius` | **ABSENT** | — | construir |
| `titulars` (per lloc ∉ pos_A, el millor per `habilitat_lloc`) | **ABSENT** | el sistema no tria titulars per lloc; només categories | construir |
| `porters_n = 1 × partits_setmana` | **HARDCODE** | `porters_minims`=2 pom (=1×2 per casualitat), no derivat (schema/051:8) | derivar |
| `cossos_n = CEIL((llocs_partit − llocs_ocupats)/partits_setmana)` | **HARDCODE** | `camp_minim` = restants − futur_entrenador = 4, implícit (cobertura.js:90-91) | fer explícit |
| `cossos = PRIMERS(cossos_n; ORDENA(plantilla restant; sou ASC))` | **DIVERGENT** | farciment per puntuació inversa `habilitat_max·−2, esp·−3, (25−edat)·−1, sou·−0.001` (schema/004:44-45) | **simplificar**: només sou ASC |
| `retinguts = core ∪ rotatius ∪ titulars ∪ porters ∪ cossos` | **DIVERGENT** | emergix de categories + `retencioCobertura` a banda (cobertura.js:26-49) | unificar en un sol conjunt |
| `venda = plantilla − retinguts` [cap marca dins] | **DIVERGENT** | venda = categoria terminal, i encara marca 'retingut' **dins** (liquidacio.js:20-37) | complement pur |

> **Nota:** desapareixen les categories `experiencia`, `farciment` i `alliberament`, i
> `futur_entrenador` només sobreviu com a `rol` dins `max_partits` (P2) — vore SOBRANT.

---

## PAS 7 — VENDRE (9)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `motiu_venda(j)` (pic de valor / sou desproporcionat / sobrant) | **ABSENT** | els motius no es deriven així | construir (depén de `sobrecost`, P5) |
| `ordre_venda = ORDENA(sobrecost DESC, preu_esperat DESC)` | **ABSENT** | no hi ha orde de venda | construir |
| `calibrat = COMPTA(vendes ∪ comparables) ≥ min_mostres` | **HARDCODE** | `calibrat = (comparable ≠ null)`, és a dir ≥1; `min_mostres` no és pom (vendes.js:79) | fer pom |
| `preu_esperat(j)` — **ÚNICA fórmula de preu** | **DIVERGENT** | **DOS** càlculs: Vendes `estimacio_per_divisio` escalat (vendes.js:67-74) vs Economia `valor_estimat_defecte`=150000 (economia.js:90,102) → el mateix jugador val ~2.000 € i 150.000 € segons la pantalla | **unificar** (correcció clau) |
| `valor_net(j)` | **IGUAL** | vendes.js:81 (hereta la unificació del preu) | — |
| `urgent(j) = dies_aniversari ≤ dies_urgencia` | **DIVERGENT** | el sistema hi afig `O (porter I porteria ≥ porter_notable_min)` (regles.js:80-82); **el v3 no la contempla** | llevar la clàusula de porter (→ SOBRANT) |
| `destí(j)` (4 branques) | **DIVERGENT** | la branca de depressió està **morta** per unitats (regles.js:84, schema/049:12: −20 enter vs −0,15 fracció) | reconstruir amb `depressio_profunda` en fracció |
| `PREGUNTA("¿venut per quant / deserta?")` | **DIVERGENT** | l'estat 'desert' existix; la pregunta no és completa | completar |
| `recalibra(estimació) A CADA venda real` | **IGUAL** | `preus_observats` s'alimenta de vendes reals | — |

---

## PAS 8 — COMPRAR: jugadors i estadi competixen (13) · 12 ABSENT

| fórmula | classe | sistema actual | acció / estimació |
|---|---|---|---|
| `candidat(lloc)` · `guany(jugador) = mancança × pes` · `cost = preu` | **ABSENT** (3) | `filtresCompra` busca per edat/creativitat/posicions, sense guany ni pes (mercat_cerca.js) | construir sobre P5 |
| `admissible = preu ≤ caixa_disponible I sou ≤ pressupost_sou(lloc)` | **DIVERGENT** | pressupost repartit a parts iguals entre gaps (regles.js:300); cap límit de sou per lloc | reescriure |
| `Δflux(obra)` · `Δnivell_pagable(lloc)` · `guany(estadi)` · `cost(estadi)` · `admissible(estadi)` | **ABSENT** (5) | **no existix cap lògica d'estadi** | **subsistema nou sencer** |
| `eficiència(opció) = guany/cost` · `ACCIÓ = PRIMER(ORDENA(eficiència DESC))` | **ABSENT** (2) | no hi ha comparació entre opcions de compra | construir el bucle d'estoc |
| `assistencia_esperada = MAX(assistències recents)` · `capacitat_objectiu` | **ABSENT** (2) | no es guarda assistència | construir (dada nova a demanar) |

> **Invariant 3 nou:** cap compra amb diners no cobrats. El sistema actual **projecta** dins
> les decisions (economia.js:107-131) — eixa projecció-dins-decisió desapareix.

---

## PAS 9 — ALINEACIONS (6)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `llocs ordenats per pes DESC, partit ASC` | **DIVERGENT** | orde per buckets50/100 i doblats/simples (alineacio.js:56-78) | reescriure greedy per `pes` |
| `disponible(j, lloc)` | **DIVERGENT** | filtres quasi iguals (`disp`), però `max_partits` implícit i sancionat exclòs de tot | alinear |
| `valor(j,lloc) = SI(entrenable I core∪rotatius; pes_entrenament; hab(habilitat_lloc))` | **ABSENT** | no hi ha funció de valor per lloc | construir |
| `jugador(lloc) = PRIMER(ORDENA(valor DESC, partits_assignats ASC, sou ASC))` | **DIVERGENT** | el farciment ja ordena per `nPartits asc` (coincidix en part) (alineacio.js:99-105) | reescriure |
| `buit(lloc)` → juga amb un menys | **DIVERGENT** | fallback exacte/compatible (alineacio.js:92-105) | alinear |
| `comptabilitat(j) = SUMA(pct)` | **IGUAL** | alineacio.js | — |

---

## PAS 10 — JUVENILS (13)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `esperat_act(h) = MITJANA(revelacions pròpies)` | **IGUAL** | autocalibra (ranquing_juvenil.js:33) | — |
| `valor(j,h)` (4 casos) | **DIVERGENT** ⚠️ | casos (a)(b)(c) **coincidixen** (verificat al G1); el cas (d) **NO**: el full diu `esperat_act + marge_ple×f_marge` (6,5) i el codi torna `esperat_act` pelat (5) — ranquing_juvenil.js:24. *Divergència detectada pel G1, registrada com a `P10.valor#cas_d`* | corregir el cas (d) |
| `NIVELL(j) = pes_A·valor(A) + pes_B·valor(B)` | **IGUAL** | ranquing_juvenil.js:58-67 | — |
| `util(j) = potencial(j,A) ≥ nivell_objectiu(MC)` | **ABSENT** | no hi ha `nivell_objectiu` | construir (depén de P4) |
| `elegible(j) = edat_d ≥ 17×112 I estada ≥ 112` | **IGUAL** ✅ | lecturaPromocio (ranquing_juvenil.js:43-56) · *verificat al G1* | — |
| `promo = PRIMER(NIVELL DESC)` [màx `promocio_max_setmana`] | **HARDCODE** | el límit 1 és **implícit** (un sol `millor`); el pom **no es llig** (ranquing_juvenil.js:53) | cablejar el pom |
| `destí(promo)` (util → PROMOCIONA / valor_net_promo > 0 → PROMOCIONA_I_LLISTA / DESPATXA) | **DIVERGENT** | només el flag `cua` (posicio_rang > meitat); `disposicioVenda` i `bonus_club_mare` **morts** (juvenil.js:60-64, schema/044:11) | reconstruir amb `util` i `valor_net_promo` |
| `onze juvenil` (fórmula del PAS 9) | **HARDCODE** | alineaJuvenil coincidix en esperit; rangValor/EPS/ordreBucket cablejats (alineacio_juvenil.js:12,95) | unificar amb P9 |
| `sobra = COMPTA(juvenils) − objectiu_juvenil` [= onze legal + 1] | **HARDCODE** | `juvenil_objectiu`=10 pom, **no derivat** d'onze+1 (schema/028:13) | derivar |
| `despatxa PRIMERS(sobra; ORDENA(NIVELL ASC, n_revelacions ASC))` | **DIVERGENT** | filtra per `pipeline.fora` i ordena per revelats/potencial (juvenil.js:45-55) | reescriure l'orde |
| `reinici_crida = pròxim(hores(pais).economia_dia, hora+1h)` | **DIVERGENT** | dia global=6; **l'hora no té efecte** (finestra per dia UTC, calendari.js:38-45) | construir per país + hora |
| `ACCIÓ("fes la crida")` | **IGUAL** | ALR_CRIDA_DISPONIBLE | — |
| `reexecuta el PAS a CADA pujada` | **IGUAL** | classificaEquip a cada pujada | — |

---

## PAS 11 — PERSONAL, bucle de FLUX (7) · tot ABSENT

| fórmula | classe | sistema actual (file:line) | acció / estimació |
|---|---|---|---|
| `cost_flux(membre) = BUSCA(taula_salaris_personal; tipus, nivell)` | **ABSENT** | `personal_membres.sou` declarat, sense taula | seed de la taula de la guia |
| `guany(membre)` — 4 monedes traduïdes a nivell×pes (assistent, entrenador, metge, psicòleg) | **ABSENT** | **cap noció de guany del personal** | **el més conceptual del lot**: cal Δvelocitat/Δeficiència/Δbaixes/Δconfiança de la guia |
| `eficiència(membre) = guany / cost_flux` | **ABSENT** | — | mecànic un colp hi haja guany |
| `CONTRACTAR: admissible = cost_flux ≤ flux_lliure` + ACCIÓ + AVÍS | **ABSENT** (3) | ALR_PERSONAL_FASE compara plantilla esperada per **fase**, sense cost ni eficiència (regles.js:312-317) | reescriure sencer |
| `RENOVAR` (renova / renova al nivell n / no renoves) | **ABSENT** | ALR_CONTRACTE_PERSONAL només avisa del venciment (regles.js:336-339) | construir les 3 branques |

> **Canvi dur:** el v3 diu que **acomiadar no existix** (l'única decisió reversible és
> renovar al venciment). El sistema actual proposa «contracta/acomiada» → l'acomiadament és
> **SOBRANT**.

---

## PAS 12 — INFORME I AGENDA (6)

| fórmula | classe | sistema actual (file:line) | acció |
|---|---|---|---|
| `CADUCITATS: ACCIÓ("renova/decidix", data)` | **DIVERGENT** | ALR_CONTRACTE_PERSONAL (setmanes_avis=2) cobrix el cas de personal | generalitzar a «dates declarades» |
| `urgencia(acció) = BUSCA(urgencia_tipus; tipus)` | **HARDCODE** | cada regla porta el seu pom d'urgència; no hi ha taula per tipus | consolidar en taula |
| `nivell(acció) = SI(urgencia ≥ llindar_urgent; …)` | **HARDCODE** ⚠️ | **les llindes 70/55 viuen a la VISTA** (seccions.js:31) — viola l'invariant 12; ja és al baseline del G2 | moure a poms + avaluador |
| `alertes = AGRUPA(ACCIONS data=HUI; tipus) ORDENA urgencia DESC` | **DIVERGENT** | una alerta per regla (no agrupada per tipus); ordena per urgència (regles.js:400) | agrupar per tipus |
| `agenda = ORDENA(ACCIONS data > HUI; data)` | **IGUAL** | alertes.js:15-25 | — |
| `res més és alerta` | **IGUAL** | doctrina «de moment res» = info de secció | — |

---

# SOBRANT — el sistema ho fa i el v3 no ho contempla

**Res es queda «perquè ja estava».** Cada element: eliminar, o incorporar al full amb decisió
a DECISIONS.md.

## S1. Fornades (tot el subsistema) — retirat explícitament pel v3

| què | on | cost |
|---|---|---|
| mòdul | `lib/fornades.js`, `functions/api/fornada.js` | 2 fitxers a esborrar |
| taules D1 | `fornades`, `fornades_jugadors` (schema/001:160,170) | 2 taules + migració de retirada |
| referències | `lib/pla.js`, `lib/economia.js`, `lib/regles.js`, `lib/alineacio.js`, `lib/orquestra_{alertes,alineacio,classificacio}.js`, `functions/api/{jugador,plantilla}.js` | **9 fitxers** a netejar |
| assignació automàtica | `assignaFornadesAuto` + `proposaFornades` (orquestra_classificacio.js:124-177) | ~55 línies |
| regla | `ALR_FINESTRA_VENDA_FORNADA` (regles.js:275-282) + pom `fornada_finestra_dies` | 1 regla + 1 pom |
| poms | `valor_fornada_estimat` (schema/030:6) | 1 pom (`edat_pic_venda` **es queda**: el v3 l'usa a `horitzo_eixida`) |
| i18n | 8 claus (ca) + 5 (en) | 13 claus |
| vista | `public/jugador.html`, `public/seccions.js` | 2 fitxers |
| tests | 8 fitxers hi fan referència (`fornada_fitxa.mjs` sencer) | 1 test a esborrar + 7 a netejar |

## S2. Estratègia «fàbrica» i el seu vocabulari

| què | on | cost |
|---|---|---|
| categories retirades | `experiencia`, `farciment`, `alliberament` (schema/004:27-53) | seeds + lògica d'embut |
| vocabulari i18n | farciment 3 · entrenable 13 · futur_entrenador 1 · experiencia 3 · alliberament 2 · despatx 3 = **~25 claus** de 542 | renombrar a core/rotatiu/titular/cos/retingut/sobrant |
| plantilla='fabrica' | clau en **29 fitxers de schema** i 28 fitxers de test | migració a plantilla='competitiva' |
| classificador de fàbrica | puntuacions inverses de farciment, `resta_ocupacio_exclou`, cobertura mínima dura duplicada (classificador.js:109-116 vs cobertura.js:26-49) | ~80 línies |

## S3. Supporter — «fora tota referència» (canvi 8 del v3)

| què | on | cost |
|---|---|---|
| regla | `ALR_SUPPORTER` (regles.js:353-359) + poms (schema/024:6-7) | 1 regla + 2 poms |
| camp | `supporterCaducitat` (functions/api/pla.js, orquestra_alertes.js) | 3 fitxers |
| i18n | 2 claus (ca) + 2 (en) | 4 claus |
| vista + test | `public/seccions.js`, `test/regles.mjs` | 2 fitxers |

## S4. Altres sobrants

| element | on | proposta |
|---|---|---|
| `ALR_JUNTA_PORTER` (porter valuós → junta) | regles.js:136-150 | el v3 lleva la clàusula de porter d'`urgent(j)` → **eliminar** |
| Acomiadar personal | ALR_PERSONAL_FASE / vista personal | el v3: acomiadar **no existix** → llevar l'acció |
| Projecció econòmica dins decisions | economia.js:75-131, capital.js sencer | el v3 separa flux/estoc i prohibix projectar dins una decisió → `capital.js` (objectiu de capital) queda **substituït** per `nivell_objectiu` |
| Reconciliació/intercanvis | reconciliacio.js, orquestra_classificacio.js:82-115 | **es queda**: és el MECANISME (actua+informa+desfés) del v3 → re-expressar, no eliminar |
| Poms/regles morts | `ALR_SUBHASTA_TANCA`, `disposicioVenda`, `crida_reinici_hora`, `juvenil_crida_15/16`, `porteria_deprecia`, `objectiu`(nucli 8), `setmanes_avis`(finestra mercat) | cablejar (els que el v3 recupera) o esborrar amb decisió |

---

# REAPROFITABLE — què sobreviu al canvi de model

Encara que el model canvie, això **no s'ha de reescriure**:

| peça | on | per què sobreviu |
|---|---|---|
| **Ingesta CSV** | `lib/adaptador.js` | el v3 consumix els mateixos camps (transferible, lesio, amonestacions, habilitats, sou, edat) |
| **Calendari** | `lib/calendari.js` | `f_calendari` del v3 **és** esta funció; només cal que siga l'ÚNICA (L1) |
| **Comparador d'instantànies** | `lib/diferencia.js` | altes/baixes/recompra: intacte |
| **Motor de classificació** | `lib/classificador.js` | l'embut declaratiu (requisits/puntuació/places/orde) serveix per a core/rotatius/titulars/cossos; **canvia la config, no el motor** |
| **Mecanisme actua+informa+desfés** | `lib/reconciliacio.js` + intercanvis | és literalment el bloc MECANISME del v3 |
| **Motor de regles/alertes** | `lib/regles.js` + `orquestra_alertes.js` | l'esquelet (ctx → regles → alertes/agenda amb dedup) es manté; canvien les regles |
| **Juvenils: NIVELL i valor** | `lib/ranquing_juvenil.js` | IGUAL excepte el cas (d) i `util` |
| **i18n + degradació per fila** | `comu.js`, `public/i18n/*`, guardià i18n | 517 de 542 claus no toquen vocabulari retirat |
| **Formatadors** | `public/format.js` | purs, compleixen el render-pur |
| **Els tres guardians** | `test/guardia_*.mjs`, `formules_paritat.mjs` | ja apunten al v3 |
| **Auth/sessió/middleware** | `lib/auth.js`, `functions/_middleware.js` | independent del model |
| **Base D1** | usuaris, equips, instantanies, instantanies_jugadors, jugadors, vendes, transaccions, preus_observats | l'esquema de dades **no canvia**; canvia què se'n deriva |
| **Falten (dades manuals)** | `functions/api/falten.js` | el v3 el necessita més encara (caixa/ingressos/estadi a l'informe) |

---

# RESUM PER PAS

| pas | IGUAL | DIVERGENT | HARDCODE | ABSENT | total |
|---|---|---|---|---|---|
| V — variables base | 5 | 3 | 1 | 3 | 12 |
| P0 — configuració | 0 | 0 | 0 | 2 | 2 |
| P1 — entrenament | 0 | 2 | 0 | 0 | 2 |
| P2 — llocs i pesos | 3 | 2 | 0 | 2 | 7 |
| P3 — economia | 2 | 3 | 0 | 1 | 6 |
| P4 — nivell objectiu | 0 | 0 | 0 | 3 | 3 |
| P5 — mancança | 0 | 0 | 0 | 6 | 6 |
| P6 — plantilla | 0 | 4 | 2 | 2 | 8 |
| P7 — vendre | 2 | 4 | 1 | 2 | 9 |
| P8 — comprar | 0 | 1 | 0 | 12 | 13 |
| P9 — alineacions | 1 | 4 | 0 | 1 | 6 |
| P10 — juvenils | 5 | 4 | 3 | 1 | 13 |
| P11 — personal | 0 | 0 | 0 | 7 | 7 |
| P12 — informe/agenda | 2 | 2 | 2 | 0 | 6 |
| **Σ** | **20** | **29** | **9** | **42** | **100** |

**Titular:** **20% IGUAL · 29% DIVERGENT · 9% HARDCODE · 42% ABSENT.**
El que ja funciona es concentra a les variables base (V), els llocs entrenables (P2) i els
juvenils (P10). Tot el motor econòmic nou (P3-P5) i els dos bucles simètrics (P8 estoc,
P11 flux) són construcció des de zero.

---

# ORDE DE LOTS (per dependències) I RISC

Cada lot: canvi + test «mateixa entrada → mateix número» + G1-G3 verds + verificació per
propietat a prod. **Cap lot comença sense l'autorització de Miquel.**

| # | lot | fórmules | per què ací | risc · què toca |
|---|---|---|---|---|
| **L0** | **Retirada de fàbrica** (fornades, Supporter, categories velles) | SOBRANT S1-S3 | neteja el terreny: sense això, cada lot posterior arrossega vocabulari mort | **mig-alt** · 11 fitxers lib/functions, 2 taules D1, ~29 claus i18n, 8 tests · pantalles Plantilla/Jugador/Pla |
| **L1** | **Calendari únic** | `V.(temporada,setmana)` | 3 implementacions; el consumixen pla, economia, alertes, mercat | **baix** lògic, **alt** abast · test/calendari, pla, economia · pantalla Esta setmana |
| **L2** | **config + estratègia + partits_setmana** | `V.config`, `P0.*`, `V.llocs_partit` | variable base de P1/P2/P6/P11 | **alt** · onboarding nou · totes les pantalles |
| **L3** | **Economia: flux i estoc** | `P3.*` (ingressos, despeses, flux, sou_sostenible, caixa, caixa_disponible) | `sou_sostenible` és la frontissa de P4 | **mig** · test/economia · pantalla Economia |
| **L4** | **Pesos + nivell objectiu** | `P2.pes`, `P4.*` (+ seeds `taula_aportacio`, `taula_salaris`, `taula_habilitat_lloc`) | sense açò no hi ha mètrica | **mig** · seeds nous de la guia · cap pantalla encara |
| **L5** | **Mancança (mètrica única)** | `P5.*` | mecànic un colp hi ha L4; el consumixen L6/L7/L9/L10 | **baix** · test nou |
| **L6** | **Plantilla: core/rotatius/titulars/porters/cossos** | `P2.N_core`, `P2.N_rotatius`, `P2.max_partits`, `P6.*` | defineix `retinguts`, que alimenta P7 i P9 | **alt** · test/cobertura, classificador · pantalla Plantilla |
| **L7** | **Vendre + preu únic** | `P7.*` (preu_esperat únic, `depressio_profunda` fracció, motiu_venda, ordre_venda) | consumidor de L3/L5/L6; **mata el 150.000 fantasma** | **mig** · test/vendes, mercat · pantalles Vendes/Agenda |
| **L8** | **Alineacions** | `P9.*` | consumidor de L4 (pes) i L6 (retinguts) | **mig** · test/alineacio · pantalla Alineació |
| **L9** | **Juvenils** | `P10.*` (cas (d), `util`, destí, sobra, crida per país) | subsistema aïllat; `util` depén de L4 | **mig** · test/ranquing_juvenil, fotrem · pantalla Juvenils |
| **L10** | **Bucle d'estoc: comprar + estadi** | `P8.*` | consumidor de L3 (caixa_disponible) i L5 (mancança) | **alt** · subsistema nou · pantalla Mercat + estadi nova |
| **L11** | **Bucle de flux: personal** | `P11.*` | simètric de L10; consumidor de L3 (flux_lliure) i L4 (pes) | **alt** · test/personal · pantalla Personal |
| **L12** | **Informe i agenda** | `P12.*` + buidar el baseline del G2 | l'última capa; depén de tota la resta | **baix-mig** · test/alertes · totes les seccions |

**Camí crític:** L1 → L2 → L3 → L4 → L5 → (L6 → L7 → L8) ∥ (L10, L11) → L12.
L0 pot anar en paral·lel a L1 (només neteja). L9 pot anar en qualsevol moment després de L4.

---

# QUANT DEL SISTEMA ACTUAL SOBREVIU (estimació honesta)

| capa | sobreviu | comentari |
|---|---|---|
| **Infraestructura** (auth, middleware, D1 base, ingesta CSV, i18n, formatadors, comparador, guardians) | **~85%** | el canvi de model no la toca |
| **Motors genèrics** (classificador, reconciliació, motor de regles, calendari) | **~70%** | els motors es queden; canvia la config que els alimenta |
| **Lògica de domini** (categories, cobertura, liquidació, economia, personal, fornades) | **~20%** | quasi tot es reescriu; sobreviuen NIVELL juvenil, valor_net, comptabilitat, agenda |
| **Seeds i poms** (schema/*.sql) | **~40%** | constants de joc i calendari es queden; els poms de fàbrica cauen |
| **Pantalles** (public/) | **~60%** | l'estructura i els components es queden; canvien els valors i el vocabulari |

**Global ponderat: ~45% del codi sobreviu; ~30% de la lògica de domini.**
Dit clar: **el motor es queda, el model es reescriu.** Les 42 fórmules ABSENT són la meitat
de la feina, i es concentren en tres blocs nous (P4-P5 mètrica, P8 estadi, P11 personal per
flux) que no tenen cap línia de codi actual per reaprofitar.
