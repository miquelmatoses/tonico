# FULL DE FÓRMULES DE TONICO (OBJECTIU) — v2, SUPERAT

> ⛔ **SUPERAT PER [docs/FORMULES.md](FORMULES.md) v3 (2026-07-24).** Este era el
> contracte v2 (model «fàbrica»). El model fàbrica s'ha RETIRAT sencer, i amb ell el
> seu vocabulari (fornades incloses). Es conserva NOMÉS com a context històric: no
> mana sobre res ni s'ha de consultar per a decidir.

**Esborrany 1 · 2026-07-24 · PER REVISAR (Miquel)**

Este document substituïx tota la prosa: cada línia és una fórmula avaluable.
El codi de Tonico és un avaluador d'estes fórmules i res més. Tot nom entre
`accents` és un pom o taula en BD. Notació: SI, MAX, MIN, SUMA, COMPTA, MITJANA,
FILTRA, ORDENA, PRIMER/PRIMERS, BUSCA, ARREDONIX.AMUNT, ∪ (unió), ∈, ∅.
El diff línia a línia contra docs/FORMULES_ACTUALS.md és el pla de
reconstrucció: cada fórmula divergent, un canvi amb test «mateixa entrada →
mateix número».

---

## V — VARIABLES BASE (una sola font cadascuna)

```
config           = { estrategia, pais, divisio, sistema_juvenil, partits_setmana }
hores(pais)      = BUSCA(`hores_pais`; pais)            → {economia_dia, economia_hora}
plantilla        = files de la instantània sènior vigent
juvenils         = files de la instantània juvenil vigent (si sistema_juvenil ≠ cap)
llocs_partit     = 11 × partits_setmana                 → 22 amb 2 partits
(temporada, setmana) = f_calendari(data, `ancora`)      ← ÚNICA funció; tots els punts la consumixen
llistat(j)       = csv.transferible(j) = 1  O  fitxa.llistada(j)
lesionat(j)      = csv.lesio(j) ≥ 1        [valors observats de la font: buit | N]
sancionat(j)     = csv.sancio(j) = actiu    [només exclou del partit de lliga]
edat_d(j)        = anys(j)×112 + dies(j)
dies_aniversari(j) = 112 − dies(j)
fase_mercat(d)   = BUSCA(`fases_mercat`; setmana(d))    → modificador ∈ [−0,15 … +0,10] (fracció; MAI enters)
```

---

## PAS 0 — CONFIGURACIÓ (entrades d'usuari; res més es pregunta ací)

```
estrategia = TRIA(usuari; fàbrica | competitiva | cycle)
             SI(resposta="no ho sé";
                SI(caixa < objectiu_transicio; fàbrica; competitiva))
pais, divisio, sistema_juvenil ∈ {acadèmia, cercapromeses, cap}, partits_setmana ∈ {2, 1}
```

---

## PAS 1 — ENTRENAMENT

```
(A, B, intensitat, resistencia) = BUSCA(`entrenament_estrategia`; estrategia, fase_pla)
   fàbrica     → (creativitat, passades, 100, 10)
   competitiva → (defensa, pilota_aturada, 100, 10)
   cycle       → (habilitat_fase, secundari_fase, 100, 10)
ACCIÓ("canvia l'entrenament")  SI configurat_HT ≠ (A, B, intensitat, resistencia)
```

## PAS 2 — POSICIONS ENTRENABLES I OBJECTIU

```
pos_A     = FILTRA(`taula_entrenament`; habilitat = A)      → {(posició, pct)}
pos_B     = FILTRA(`taula_entrenament`; habilitat = B)
valor_lloc(pos) = SI(pos ∈ pos_A I pos ∈ pos_B; 3;
                  SI(pos ∈ pos_A; 2; SI(pos ∈ pos_B; 1; 0)))
N_entrenables = SUMA(pos_A: SI(pct = 100; partits_setmana; 1))
   [creativitat: 3 MC × 2 + 2 extrems × 1 = 8]
max_partits(j) = SI(rol(j) ∈ {doblador_50, futur_entrenador} O rol(j) = cos; 2; 1)
```

## PAS 3 — FILTRE DE COMPRA D'ENTRENABLE

```
perfil_entrenable(x) = edat_d(x) ∈ [17×112, 17×112 + `edat_max_compra`]
                     I hab(x, A) ≥ `entrenable_a_min`
                     I preu(x) ≤ pressupost        [PAS 14]
```

## PAS 4 — ENTRENABLES

```
punts_entrenable(j) = hab(j, A)×2 + MAX(0; `edat_pic_venda`×112 − edat_d(j))/112
entrenables  = PRIMERS(N_entrenables;
                 ORDENA(FILTRA(plantilla; hab(j,A) ≥ `entrenable_a_min` I edat_d < `edat_pic_venda`×112);
                        punts_entrenable DESC))
falten       = MAX(0; N_entrenables − COMPTA(entrenables))
finestra_compra = fase_mercat(hui) = depressió
                I setmanes_fins_eixida_fornada_vigent ≤ `marge_reposicio`
ACCIÓ("compra", falten, perfil_entrenable)   SI falten > 0 I finestra_compra
INFO_secció("la compra toca a la depressió prèvia a l'eixida")  SI falten > 0 I ¬finestra_compra
```

## PAS 5 — FUTUR ENTRENADOR (si `estrategia_te_fe` = cert; fàbrica: cert)

```
fe = PRIMER(ORDENA(FILTRA(plantilla; exp(j) ≥ `fe_exp_min`); exp DESC, sou ASC))
ACCIÓ("compra futur entrenador: exp ≥ `fe_exp_min`, lideratge ≥ `fe_lid_min`, resta mínima")
      SI estrategia_te_fe I fe = ∅
```

## PAS 6 — PORTERS

```
porters_n = 1 × partits_setmana
porters   = PRIMERS(porters_n;
              ORDENA(FILTRA(plantilla − entrenables − fe; hab(j, porteria) ≥ `porter_hab_min`);
                     preu_esperat ASC, sou ASC))
ACCIÓ("compra el porter més barat")   SI COMPTA(porters) < porters_n
```

## PAS 7 — COSSOS

```
llocs_ocupats  = SUMA(entrenables rotació: 1) + SUMA(entrenables dobladors: 2)
               + SI(fe ≠ ∅; partits_setmana; 0) + porters_n
llocs_restants = llocs_partit − llocs_ocupats            [22 − 14 = 8 en fàbrica]
cossos_n       = ARREDONIX.AMUNT(llocs_restants / partits_setmana)
cost_cos(j)    = SI(estrategia = fàbrica;
                    preu_esperat(j)×`pes_valor_cos` + sou(j);
                    |hab(j, hab_posició(j)) − BUSCA(`nivell_per_divisio`; divisio)|×1000 + sou(j))
cossos   = PRIMERS(cossos_n;
             ORDENA(FILTRA(plantilla − entrenables − fe − porters;
                           SI(estrategia = fàbrica; preu_esperat(j) ≤ `cos_valor_max`; CERT));
                    cost_cos ASC))
ACCIÓ("compra cos amb el perfil")   SI COMPTA(cossos) < cossos_n
retinguts = entrenables ∪ fe ∪ porters ∪ cossos
```

## PAS 8 — ASSIGNACIÓ D'ALINEACIONS (greedy per fórmula)

```
llocs = tots els (posició, partit); ordenats per valor_lloc DESC, partit ASC
disponible(j, lloc) = j ∈ retinguts
                    I ¬llistat(j) I ¬lesionat(j) I ¬(sancionat(j) I partit = lliga)
                    I partits_assignats(j) < max_partits(j)
                    I compatible(rol(j), lloc)
      compatible: entrenable → només posicions de pos_A al seu pct
                  porter → POR · fe → qualsevol lloc amb valor_lloc = 0
                  cos → qualsevol lloc amb valor_lloc = 0
guany(j, lloc) = SUMA(components(lloc): pct × 1)          [sènior: constant per rol]
jugador(lloc)  = PRIMER(ORDENA(FILTRA(retinguts; disponible(j, lloc));
                        guany DESC, partits_assignats(j) ASC, sou ASC))
       [partits_assignats ASC = el doblatge de cossos s'alterna sol]
buit(lloc)     = jugador(lloc) = ∅ → es juga amb un menys;
                 SI(lloc ∈ pos_A I ∃ entrenable lliure; assigna'l amb
                    motiu = "excepció per absència")
motiu(fila)    = plantilla_i18n(rol, pct, estat)           [derivat, mai text a mà]
comptabilitat(j) = SUMA(llocs assignats a j: pct)
```

## PAS 9 — SOBRANTS

```
venda = plantilla − retinguts        [categoria sencera; cap marca de retenció dins]
```

## PAS 10 — VENDA O DESPATX (per a cada j ∈ venda)

```
calibrat        = COMPTA(vendes_reals ∪ comparables) ≥ `min_mostres`
preu_esperat(j) = SI(calibrat; estimació_comparables(j);
                     BUSCA(`base_preu_divisio`; divisio) × factor_puntuacio(j))
   ← ÚNICA fórmula de preu del sistema: Vendes, Economia i PAS 7 la consumixen
setmanes_venda(j) = SI(llistat(j); dies_tancament(j)/7; 1)
valor_net(j)    = preu_esperat(j) − `cost_llistat` − sou(j) × setmanes_venda(j)
urgent(j)       = dies_aniversari(j) ≤ `dies_urgencia`
                O (hab(j, porteria) ≥ 7 I A ≠ porteria)
mod_tancament(j) = fase_mercat(hui + `dies_subhasta`).modificador
dia_D(j)        = MIN(d ≥ hui : fase_mercat(d + `dies_subhasta`).modificador > `depressio_profunda`)
   [`depressio_profunda` = −0,20 — FRACCIÓ, mateixes unitats que el modificador]

destí(j) = SI(lesionat(j);                          AGENDA("llista'l en recuperar-se");
           SI(calibrat I valor_net(j) < `llindar_despatx`;  ACCIÓ("despatxa'l", valor_net);
           SI(mod_tancament(j) ≤ `depressio_profunda` I ¬urgent(j);  AGENDA("llista'l", dia_D);
                                                    ACCIÓ("llista'l HUI", preu_esperat))))

llistada(j)   = primera instantània amb transferible = 1   [editable]
tancament(j)  = llistada(j) + `dies_subhasta`
PREGUNTA("¿venut per quant / deserta?")  SI transferible passa 1→buit sense venda apuntada
   deserta → TRIA(rebaixar | rellistar | despatxar | 1 € (override))
   [cap regla de retorn venda→cos: l'algorisme sencer es reexecuta a la pujada
    següent i el PAS 7 tria per cost_cos, no per història]
recalibra(estimació_comparables)  A CADA venda real apuntada
```

## PAS 11 — JUVENILS (si sistema_juvenil ≠ cap)

```
esperat_act(h) = MITJANA(revelacions_pròpies(h))  [∅ → `esperat_defecte`]
valor(j, h) =
  SI(act I pot coneguts;   act + (pot − act) × `f_marge`;
  SI(act conegut;          act + `marge_ple` × `f_marge`;
  SI(pot conegut;          MIN(esperat_act, pot) + (pot − MIN(esperat_act, pot)) × `f_marge`;
                           esperat_act + `marge_ple` × `f_marge`)))
NIVELL(j)   = `pes_A` × valor(j, A) + `pes_B` × valor(j, B)
guany(j, h) = valor(j, h) − hab_certa(j, h)      [el marge esperat; capat → 0]

elegible(j) = edat_d(j) ≥ 17×112 I estada(j) ≥ 112
promo       = PRIMER(ORDENA(FILTRA(juvenils; elegible); NIVELL DESC))   [màx `promocio_max_setmana` = 1]
valor_net_promo(j) = preu_esperat_juvenil(hab_visibles + `bonus_club_mare`)
                   − `cost_promocio` − sou_sènior_estimat × 2
destí(promo) = SI(estrategia = competitiva
                  I pot(promo, hab_posició) ≥ BUSCA(`nivell_per_divisio`; divisio);
                     PROMOCIONA_TITULAR;
               SI(NIVELL(promo) ≥ `nivell_util_min`;   PROMOCIONA;
               SI(valor_net_promo > 0;                 PROMOCIONA_I_LLISTA;
                                                       DESPATXA)))

onze juvenil: mateixa fórmula del PAS 8 amb
   llocs de `taula_entrenament_juvenil`, guany(j, components(lloc)),
   desempat = dies_promoció ASC, banqueta = PRIMER(ORDENA(juvenils_no_assignats;
   guany_total ASC, NIVELL ASC)), formació legal (màxims per posició) i
   COMPTA(en_camp) ≥ `minim_en_camp`  [per davall: 0 informació la setmana]

sobra = COMPTA(juvenils) − `objectiu_juvenil`     [`objectiu_juvenil` = onze legal + 1]
despatxa PRIMERS(sobra; ORDENA(juvenils; NIVELL ASC, n_revelacions(j) ASC))
   [entre iguals ix primer el MENYS revelat: el descartat descobert es reté —
    no consumix comentaris de l'entrenador]

reinici_crida = pròxim (hores(pais).economia_dia, economia_hora + 1h)
crida_disponible = ara ≥ reinici_crida_vigent I ¬crida_declarada_esta_finestra
ACCIÓ("fes la crida al cercapromeses", caduca = fi_finestra)  SI crida_disponible
reexecuta PAS 11  A CADA pujada (revelacions/altes/baixes recalibren esperat_act)
```

## PAS 12 — PERSONAL

```
prescrit = BUSCA(`personal_prescrit`; estrategia)
   fàbrica     → {entrenador ≥ 3, assistents = 2, metge ≥ 2, psicòleg = 0}
   competitiva → {entrenador ≥ 5, assistents = 2, metge ≥ 2, psicòleg ≥ 2}
ACCIÓ("contracta/acomiada", rol, cost)   PER CADA rol: declarat ≠ prescrit
```

## PAS 13 — ESTADI

```
capacitat_objectiu = SI(estrategia = fàbrica; `capacitat_min`;
                        BUSCA(`assistencia_divisio`; divisio))
ACCIÓ("ajusta l'estadi", càlcul, cost)   SI |capacitat − objectiu| > `marge_estadi`
```

## PAS 14 — ECONOMIA

```
nòmina     = SUMA(plantilla: sou)                       [derivada, mai declarada]
balanç     = ingressos − nòmina − planter − estadi − personal
pressupost = caixa − `coixi_setmanes` × nòmina           [consumit pels passos 3–7]
vendes_projectades = SUMA(venda: preu_esperat) + SUMA(fornades futures: `valor_fornada`)
   [preu_esperat = LA fórmula del PAS 10; una sola font]
projecció(d) = caixa + balanç × setmanes(d) + vendes_projectades
transició complida = avalua(condició_pla)                [p. ex. caixa ≥ objectiu]
PROPOSA canvi d'estratègia (actua+informa+desfés) → reexecuta des del PAS 1
```

## PAS 15 — INFORME I AGENDA

```
alertes = AGRUPA(ACCIONS amb data = HUI; tipus)  → una línia per tipus, detall a la secció
agenda  = ORDENA(ACCIONS amb data > HUI; data)   → una línia per data
res més és alerta; «de moment res» = informació de secció
```

---

## RESTRICCIONS (invariants; cadascuna un test de contracte)

1. Una variable, una fórmula, una font — cap punt recalcula el que un altre ja
   produïx (preu_esperat, temporada, llistat, N_entrenables).
2. Derivar > preguntar: el que el CSV o una taula dona, mai es demana.
3. llistat no juga · lesionat no s'alinea · cap entrenable en lloc amb
   valor_lloc = 0 havent-hi cos · mai per davall dels mínims (passos 6–7).
4. Overrides sagrats: només es desplacen preguntant.
5. Moviments derivats: actua + informa + desfés (llindar `anti_soroll`).
6. Cap ACCIÓ("despatxa") amb calibrat = FALS.
7. Tot literal d'este full és pom o taula en BD; el codi no conté cap número.
8. Cap nom d'usuari en codi/tests; verificació a prod per propietat.
9. Textos = plantilles i18n interpolant variables ja calculades; degradació
   per fila; cap clau crua.
10. Vocabulari únic del full; cap sinònim.
11. EL FULL ÉS EXECUTABLE: docs/FORMULES.md té un mirall llegible per màquina
    (formules.json, mateixes expressions) i un test de contracte que l'avalua
    contra el sistema amb fixtures sintètics — resultat de l'avaluador =
    resultat de la fórmula, sempre. Arreglar codi sense tocar el full → el
    test peta; tocar el full → diff visible i revisable.
12. RENDER PUR: cap fitxer de presentació conté aritmètica, comparacions ni
    literals de domini — només interpola variables ja calculades per
    l'avaluador. Guardià estàtic que escaneja les seccions i peta si en troba.
13. GOLDEN DE PANTALLA: per a la instantània de fixtures, cada valor
    renderitzat es compara amb l'eixida de l'avaluador. Un retoc manual a la
    vista trenca el golden encara que passe el guardià estàtic.

## GUARDIANS DEL FULL (mecanisme anti-"arreglar la impressió")

```
G1 contracte-full   : per f ∈ formules.json, per fixture ∈ fixtures:
                      avaluador(f, fixture) = referència(f, fixture)
G2 render-pur       : escaneig estàtic de seccions/render:
                      0 operadors aritmètics o condicionals sobre variables
                      de domini, 0 literals numèrics de domini
G3 golden-pantalla  : render(fixture) = avaluador(fixture), valor a valor
Regla de procés: tot arreglament de símptoma modifica formules.json o
l'avaluador — MAI una secció. Un commit que toque seccions amb lògica nova
falla el G2 en CI abans d'arribar a prod.
```

---

## CORRECCIONS QUE ESTE FULL IMPOSA SOBRE L'ACTUAL (del diff, segures)

1. `depressio_profunda` en FRACCIÓ (−0,20) — la branca morta reviu o s'elimina
   amb decisió, mai per accident d'unitats.
2. preu_esperat ÚNIC: Vendes, Economia i PAS 7 consumixen la mateixa fórmula
   (mor el 150.000 fantasma de la projecció).
3. (temporada, setmana) d'una sola funció (ara es calcula en 3 llocs).
4. Poms morts: cablejar (`bonus_club_mare`, `promocio_max_setmana`, hora de
   crida per país, promocionar-per-vendre) o esborrar amb decisió a DECISIONS.
5. La prioritat de categories i la formació passen de l'orde d'iteració a
   fórmula explícita (valor_lloc, cost_cos, ORDENA declarats).
6. Transició de pla: condició avaluable + proposta P4 (ara és 100% manual).

## PROCÉS

1. Aprovat → docs/FORMULES.md al repo; mana sobre tot.
2. DIFF fórmula a fórmula contra docs/FORMULES_ACTUALS.md → el pla de
   reconstrucció, per pas i per gravetat.
3. Reconstrucció: cada fórmula divergent, un canvi + test «mateixa entrada →
   mateix número» + verificació per propietat a prod.
4. Revisió per conformitat amb la fórmula, mai per impressió.
