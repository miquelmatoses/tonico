# Auditoria del sistema — 2026-07-22

Revisió **només lectura** de tot el sistema (regles, constants, fórmules, alertes,
doctrina en BD, docs) contra dues vares: **(1) la mecànica del joc** (guia de Hattrick
adjunta) i **(2) el model de disseny** (funció d'utilitat vs casuística). Cap canvi de
codi ni de dades: aquest informe és l'únic fitxer creat.

Format de cada troballa: **[gravetat] · [tipus]** · descripció · fitxer/taula · secció de
la guia · proposta d'esmena (una línia, **no implementada**).

---

## VARA 1 — Mecànica del joc

### M1 · [ALTA] · incoherència-interna / mecànica-contradita
El rellotge de depreciació d'`ALR_LLISTAR_VENDA` marca «porter notable» amb
`porteria_deprecia = 6`, però a la guia **Notable = nivell 7** (nota d'escala §2:
«notable = 6,01–7,00»; §17 la Junta reté porters «Notable+»). La pròpia regla de Junta
usa `porteria_min = 7`, i `PRINCIPIS.md` (§4) consagra `porteria>=6` com a definició de
«porter notable». Dos llindars diferents (6 vs 7) per al **mateix** concepte.
· `lib/regles.js:73` (`urgDeprec`), `regles_parametres` (`ALR_LLISTAR_VENDA.porteria_deprecia=6`, `ALR_JUNTA_PORTER.porteria_min=7`), `docs/PRINCIPIS.md:73-75`
· Guia §2 (escala), §17 (Junta) · **Esmena:** unificar a 7 (Notable) i corregir el text de PRINCIPIS, o reanomenar el concepte si el 6 és deliberat.

### M2 · [MITJANA] · mecànica-incompleta
`ALR_JUNTA_PORTER` no aplica les exempcions de retenció de la guia §17: jugadors amb
**< 2 setmanes al club**, **acabats de pujar dels juvenils**, i «**les lesions no
compten**». A més només cobreix porters; no modela el «**lingot d'or**» (lideratge
notable + experiència insuficient poc utilitzat) que la guia també cita com a retingut.
Pot disparar alertes urgents de Junta falses.
· `lib/regles.js:110-121` · Guia §17 · **Esmena:** afegir guardes `setmanes_club>=2`, `no acabat de pujar` i `!esLesionat`; valorar una regla de lingot d'or separada.

### M3 · [BAIXA] · mecànica-simplificada
El motiu `descobriment` de l'onze juvenil assumeix que jugar la posició revela el
nivell, però la guia §25.5–25.6 exigeix jugar amb **≥2 companys de nivell/potencial ja
conegut** en eixa posició (50% de probabilitat cadascun). El sistema no ho modela.
(`revelacio_minuts = 44` sí que coincidix amb §25.7.)
· `lib/alineacio_juvenil.js:99-104` · Guia §25.5–25.6 · **Esmena:** condicionar `descobriment` a ≥2 coneguts al mateix bucket, o etiquetar-lo com a «descobriment probable».

### Suport correcte a la guia (verificat, sense acció)
`dies_subhasta=3` (§17) · `promocio_dies_min_academia=112` (§25.4) · `juvenil_crida_15=1`
/`juvenil_crida_16=2` = ⅓/⅔ (§18) · `revelacio_actual_via=principal`,
`revelacio_potencial_via=secundari`, `revelacio_minuts=44` (§25.5–25.7) · `pes_b=0.66`
del NIVELL = entrenament secundari 66,7% (§26) · `taula_entrenament` ≈ taula de
combinacions (§18) · `ALR_JUNTA_PORTER.porteria_min=7`, `minuts_min=60` (§17) · calendari
(`any_dies=112`, `temporada_setmanes=16`, `temporada_jornades=14`, §19).

---

## VARA 1 — Supòsits sense font (a verificar amb observació del joc)

### S1 · [ALTA] · supòsit-sense-font
El **calendari estacional de mercat** sencer (`calendari_mercat`: modificadors +0,10 a
−0,15 per setmana, fases recuperació/demanda_plena/depressió_final) **no té cap suport a
la guia** — la guia no publica cap corba estacional de preus. És central per a
`ALR_FINESTRA_MERCAT` i per a l'ajornament (b) de la doctrina de liquidació (esperar fora
de depressió profunda). Introduït per disseny (DECISIONS ~§694).
· `schema/007_mercat_revisions.sql`, `lib/mercat.js` · **Esmena:** validar la corba amb dades reals de mercat (Foxtrick/observació) i documentar-ne l'origen; fins llavors, marcar-la com a hipòtesi.

### S2 · [MITJANA] · supòsit-sense-font
`estimacio_per_divisio` (base de valor de jugador per divisió: VII=2000 … I=1.200.000)
no correspon a cap taula de la guia. És una estimació de disseny.
· `schema/041_estimacio_divisio.sql`, `constants_joc` · **Esmena:** calibrar amb comparables reals (ja hi ha `preus_observats`) i degradar el pom a defecte de darrera instància.

### S3 · [BAIXA] · supòsit-sense-font
Heurístiques del NIVELL juvenil sense base a la guia: `f_marge=0.5`, `marge_esperat=3`,
`potencial_esperat=6`, `valor_esperat_desconegut_defecte=5`. (El límit de la guia és
8,1 / 7,8 porters, §25.2 — no s'aplica cap sostre.)
· `lib/ranquing_juvenil.js:50`, `lib/alineacio_juvenil.js:16-17` · **Esmena:** documentar-les com a perilles de calibratge i, si escau, capar valors a 8,1/7,8.

### S4 · [BAIXA] · supòsit-sense-font + llegat
`juvenil_bo_min=4` **no s'usa enlloc** (grep buit). Si fóra el llindar de «juvenil bo», la
guia §25.4 recomana «nivell mig **acceptable**» (=6), no 4.
· `constants_joc` · **Esmena:** eliminar la constant morta (o, si es reviu, pujar-la a 6 i citar §25.4).

---

## VARA 2 — Model de disseny (utilitat vs casuística)

### C1 · [MITJANA] · casuística / noms — el principi §4 es contradiu a si mateix
PRINCIPIS §4 («NINGÚ PEL NOM») **promet** que «`grep` de noms propis a `lib/`,
`functions/`, `test/` ha de tornar buit» i que «els fixtures són anònims». **Les dues
afirmacions són falses avui:**
- **`lib/fornades.js:4`** — nom de jugador «**el juvenil A**» en un comentari (l'únic dins
  `lib/`, però dins l'àmbit que §4 declara buit).
- **`test/`** — fixtures amb noms **reals** en comptes d'etiquetes sintètiques:
  `test/plantilla_punts.mjs`, `test/reconciliacio.mjs:46`, `test/anti_soroll.mjs:21`,
  `test/classificador.mjs:42`, `test/fotrem.mjs`, `test/juvenil_v2.mjs` (el juvenil A,
  Viniegra, Moyano, Lluís Estruch), i noms d'equip `Benifotrem`/`Fotrem` a molts fixtures.
- **Config viva (schema)** — «**Salvatella → entrenador**», «**General → Tribuna**»,
  «**Moyano**» a `fases_config` i `plans_temporades` (l'app ho mostra en fase inflexió):
  `schema/013_personal.sql:13`, `schema/009_pla_mestre.sql:11,19`, `schema/019_capital.sql:5`.

· Guia §—; PRINCIPIS §4 (autoreferència falsa) · **Esmena:** anonimitzar fixtures i comentaris (`PorterA`, `Conegut`…), substituir noms de config per rols genèrics, i fer que el guardià executi el grep de §4 com a test viu (ara no existix).

### Nucli net (verificat, sense acció)
`classificador.js`, `valor_placa.js`, `alineacio_juvenil.js`, `ranquing_juvenil.js` i
`calendari.js` són **exemplars del model d'utilitat**: motors declaratius i de
maximització marginal, sense casos especials ni posicions/entrenaments cablejats (tot ve
de config). No s'hi ha trobat casuística a esmenar.

---

## VARA 2 — Llegat mort i text fals

### L1 · [MITJANA] · llegat-mort (i18n)
**9 claus i18n òrfenes** (a ca **i** en, mai emeses pel codi), totes de doctrines
retirades (aniversari-venda, depreciació mecànica, finestres de mercat informatives, cua
d'eixida juvenil): `alerta.aniversari`, `alerta.aniversari_espera`,
`alerta.aniversari_forma`, `alerta.aniversari_llista_avui`, `alerta.deprecia_llista_avui`,
`alerta.finestra_mercat_prop`, `alerta.finestra_mercat_prevista`, `alerta.jove_cua_eixida`,
`alerta.jove_promocionar_vendre`.
· `public/i18n/ca-valencia.json`, `public/i18n/en.json` · **Esmena:** eliminar les 9 claus d'ambdós fitxers.

### L2 · [MITJANA] · text-fals
`alerta.aniversari_forma` (també morta) aconsella **esperar que un jugador de venda sa es
pose fi de forma per a l'aparador abans de llistar-lo** — exactament l'espera que la
doctrina de liquidació prohibix (només lesió i depressió profunda justifiquen esperar; la
forma/minuts, no).
· `public/i18n/*.json` · **Esmena:** eliminar-la amb L1 (no reviure el concepte de forma com a fre).

### L3 · [MITJANA] · text-fals (docs de govern)
`PRINCIPIS.md` descriu com a vigents dos conceptes retirats: (a) §5 «la taula de Fotrem
guanya **Grup (G1-G5)**» — però G1-G5 va ser substituït pel **NIVELL continu**
(`ranquing_juvenil.js` v3 «Substituïx els grups G1-G5»); (b) §4 «tot porter notable en
venda… `porteria>=6`» — contradiu la correcció Notable=7 (vegeu M1). El pom
`juvenil_bo_min` també conserva la descripció «(rànquing G1-G5)».
· `docs/PRINCIPIS.md:75,88`, `schema/044_constants_juvenil_v3.sql:33` · **Esmena:** actualitzar §5 a «NIVELL continu», §4 a `porteria>=7` i la descripció del pom.

### L6 · [MITJANA] · text-fals (docs de veu)
`docs/veu-paco-meseguer.md:72-74` presenta `ALR_ENTRENABLE_SENSE_MINUTS` com a **alerta
activa** amb mostra de veu («…Fica'l a una de les dos alineacions»), però la regla està
**desactivada** (migració 029) i el seu contingut viu ara a la secció d'Alineació
(PRINCIPIS §2). El text conté a més un nom propi («Marjaniemi») i predica precisament
l'acció («fica'l a l'alineació») que va motivar-ne la retirada.
· `docs/veu-paco-meseguer.md:72-74` · **Esmena:** treure l'exemple o marcar-lo com a reubicat a la secció d'Alineació.

### L4 · [BAIXA] · llegat-mort / incoherència
`ALR_ANIVERSARI` té `regles_parametres.categories = 'venda,entrenable'`, però el codi
(`lib/regles.js:49`) **exclou** `venda` explícitament. La meitat «venda» del pom és morta
i enganyosa; la migració 049 no la va netejar.
· `regles_parametres` · **Esmena:** `UPDATE … SET valor='entrenable'` per a la clau `categories`.

### L5 · [BAIXA] · llegat-mort (regles desactivades)
Cinc regles `activa=0` conserven codi i/o paràmetres: `ALR_DEPRECIACIO_MECANICA` (plegada
dins `ALR_LLISTAR_VENDA`; fila+pom sense funció), i `ALR_CRIDA_SETMANAL`,
`ALR_REVELA_JUVENIL`, `ALR_ENTRENABLE_SENSE_MINUTS`, `ALR_JUVENIL_SUPLENTS` (funcions
encara a `regles.js`). Les tres últimes estan **documentades** com a reubicades a
seccions (PRINCIPIS §2), així que són llegat acceptat; `ALR_DEPRECIACIO_MECANICA` és
redundant pur.
· `lib/regles.js:132-234`, `regles`/`regles_parametres` · **Esmena:** esborrar fila+poms d'`ALR_DEPRECIACIO_MECANICA`; deixar les altres o purgar-ne el codi si no es reactivaran.

### I1 · [BAIXA] · incoherència-interna (cobertura de test)
El guardià i18n (`test/i18n_guardia.mjs`) verifica que tota clau **emesa** existix a la
JSON i la paritat ca↔en, però **no** detecta claus òrfenes (a la JSON i mai emeses) — per
això les 9 claus mortes de L1 passen en verd.
· `test/i18n_guardia.mjs` · **Esmena:** afegir una comprovació inversa (tota `alerta.*`/`agenda.*` de la JSON ha d'estar emesa o llistada com a excepció).

---

## Resum executiu — 10 troballes més greus (ordenades)

1. **S1 [ALTA]** — El calendari estacional de mercat (`calendari_mercat`) no té font a la
   guia; sosté `ALR_FINESTRA_MERCAT` i l'ajornament (b) de liquidació. *Verificar amb el joc.*
2. **M1 [ALTA]** — «Porter notable» definit com `porteria>=6` al rellotge de depreciació i a
   PRINCIPIS, però Notable=7 (guia) i la Junta ja usa 7. Llindar incoherent.
3. **M2 [MITJANA]** — `ALR_JUNTA_PORTER` ignora exempcions de la guia §17 (<2 setmanes,
   acabat de pujar, lesió) i el cas «lingot d'or»: falsos positius.
4. **S2 [MITJANA]** — `estimacio_per_divisio` (valor per divisió) és una estimació sense
   taula de guia.
5. **C1 [MITJANA]** — PRINCIPIS §4 promet que el grep de noms a `lib/`/`test/` torna buit,
   però hi ha noms reals a `lib/fornades.js:4`, a molts fixtures de `test/` i a config viva
   (`fases_config`, `plans_temporades`): el principi es contradiu a si mateix.
6. **L1 [MITJANA]** — 9 claus i18n mortes de doctrines retirades (ca+en).
7. **L2 [MITJANA]** — `alerta.aniversari_forma`: text que aconsella esperar per forma,
   contra la doctrina de liquidació.
8. **L3/L6 [MITJANA]** — Docs de govern amb text fals: PRINCIPIS descriu G1-G5 (→ NIVELL
   continu) i `porteria>=6` (→ 7); veu-paco mostra `ALR_ENTRENABLE_SENSE_MINUTS` com a
   alerta activa (està desactivada).
9. **M3 [BAIXA]** — El «descobriment» juvenil no modela el requisit de ≥2 companys coneguts
   (guia §25.5–25.6).
10. **L4/L5/I1 [BAIXA]** — Pom `categories='venda,entrenable'` mig mort; regla
    `ALR_DEPRECIACIO_MECANICA` redundant; guardià i18n cec a claus òrfenes.

---

## Supòsits sense font que convindria verificar (fonts externes / observació)

| Supòsit | On | Com verificar |
|---|---|---|
| Corba estacional de mercat (mod. per setmana) | `calendari_mercat` | Observació de preus reals per setmana de temporada / Foxtrick |
| Valor de jugador per divisió | `estimacio_per_divisio` | Comparables reals de mercat (`preus_observats`) |
| «Porter notable» = `porteria>=6` | `ALR_LLISTAR_VENDA`, PRINCIPIS §4 | Guia §2/§17: Notable = 7 → corregir |
| Promoció a 17 anys (mínim) | `promocio_edat_min_anys=17` | Regla real de HT (la guia només cita 112 dies) |
| Heurístiques NIVELL (`f_marge`, `marge_esperat`, `potencial_esperat`, defecte) | `ranquing_juvenil.js`, `alineacio_juvenil.js` | Calibratge amb revelacions reals de l'acadèmia |
| Sostre d'habilitat 8,1 / 7,8 (porters) no aplicat | motors juvenils | Guia §25.2 |
| `juvenil_bo_min=4` (mort; guia diu «acceptable»=6) | `constants_joc` | Guia §25.4 |
