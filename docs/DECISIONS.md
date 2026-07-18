# Tonico — registre de decisions (mode autònom)

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
