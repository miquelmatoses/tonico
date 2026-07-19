# Tonico — registre de decisions (mode autònom)

## 2026-07-19 · POLIT #1 · El bucket no és categoria (correcció de la regla d'or)
**Context:** amb buckets MC/extrem dins la categoria `entrenable`, un jugador que
jugava d'una altra posició a l'últim partit canviava de bucket i desestabilitzava
la classificació (cas Maglio: Kirsch juga d'ED → proposta de desclassificar Maglio).
La posició jugada és EFECTE, no causa.
**Decisió:** `entrenable` passa a **aforament pla de 8** (els 8 millors per
puntuació creativitat+edat, migració 014); el repartiment MC/extrem el fa
l'ALINEADOR (tria 2 entrenables per entrenar d'extrem i la resta d'MC). La
classificació és ara estable davant la posició. Test protegit: `regla_or_bucket.mjs`.
**Conseqüència:** amb aforament pla, Cătuneanu (20a, crea6 → 6.0) desplaça
Balagueró (21a, crea6 → 5.5) com a 8é entrenable (factor edat). Maglio (7.5) dins.
Si es vol Balagueró, cal recalibrar la puntuació (pom).
**Causa del contracte:** la reconciliació per-bucket proposava el desplaçament
intern com a eixent sense entrant → desclassificació. En llevar els buckets,
`entrenable` usa el camí d'aforament pla (ja testejat), sense instabilitat de posició.
**Revertir:** tornar `places`/`buckets` a la config d'entrenable (no recomanat).


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
