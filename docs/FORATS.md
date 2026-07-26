# Tonico — registre de forats

Forats diagnosticats contra el contracte (`docs/FORMULES.md`). **Quan un forat es tapa, s'esborra
d'ací**: este document és la llista del que queda per fer, no un historial. El rastre de què es va
decidir i per què viu a `docs/DECISIONS.md` i al full mateix (secció v3.1).

Fixture de referència: **informe setmanal real de Benifotrem** (T83, S1-S2), compartit per Miquel
el 2026-07-26. L'aritmètica quadra sencera (verificat), i ara està transcrit als fixtures dels
tests: `test/flux_estoc.mjs` i `test/guardia_golden.mjs` reprodueixen els seus números exactes.

---

# PREGUNTES OBERTES PER A MIQUEL

**Cap.**

---

# OBERTS

## N-07 · EL PAS 8 NO TÉ CANDIDATS DE MERCAT REALS

**OBERT · gravetat: mitjana · afecta PAS 8 · nou 2026-07-26**

Amb l'estimació de preu retirada, l'opció JUGADOR del bucle d'estoc ja **no s'inventa un cost**:
torna `cost: null`, `eficiencia: null` i `falta: 'candidat'`. Les mancances segueixen ordenades per
`mancança × pes`, que és la mètrica que val, però **no es pot proposar cap fitxatge concret** fins
que hi haja un candidat de mercat amb el seu preu llistat real.

Això no és una regressió: abans es feia servir `base_preu_divisio` com a escala, o siga un número
inventat que es feia passar per cost. Ara el sistema diu què li falta. Però queda per connectar
`lib/mercat_cerca.js` (cerca de mercat) amb el PAS 8 perquè l'opció JUGADOR arribe a ser
accionable.

## F-11 · `docs/ENTRADES_MANUALS.md` PARLA DEL MODEL ANTERIOR

**OBERT · gravetat: cosmètica**

L'entrada 12 diu «Caixa real + despeses fixes (planter, estadi) + ingressos setmanals» i
l'entrada 8 parla de l'historial de transferències amb imports. Les dues són del model anterior:
ara es declaren quatre coses i no hi ha comptabilitat de moviments. Cal repassar la taula.

---

## C-02 · UN ORACLE DE G1 ESCRIT MIRANT EL CODI

**Vigent. Avís de mètode, no de codi.**

El sou de l'entrenador faltava a `despeses_fixes` de l'avaluador i el sostre de sou eixia inflat
un 49%. G1 tenia comprovació d'eixa línia (`P3.despeses_fixes`) i **no el va caçar**, perquè
l'oracle llistava els mateixos quatre conceptes que el codi en compte dels cinc del full:

```js
const set = { nomina: 5000, manteniment_estadi: 7100, personal: 2040, planter: 20000 };
```

Un guardià que copia el codi confirma el codi. Ara eixa comprovació **llig la línia del full** i
en compta els sumands, o siga que l'oracle ja no pot heretar l'omissió.

**I una segona lliçó, de la mateixa tanda:** en arreglar-ho, cap test va petar — no hi havia cap
fixture amb entrenador declarat que mirara el sostre de sou. El guardià nou només comprovava la
FORMA de la línia, no que l'avaluador la respectara. Fins que no s'ha vist petar amb l'entrenador
posat (`test/economia.mjs` §2b), no valia res. Vore [[verificacio-per-mutacio]].

---

# DECIDIT QUE NO ÉS FORAT (no ho tornes a traure)

## D-01 · el pressupost de sou es reparteix entre 11 llocs, no entre els jugadors pagats

PAS 4 gasta el 100% de `sou_sostenible` en els onze llocs del camp, però la plantilla que
prescriu PAS 6 en paga uns setze (3 rotatius del bloc B, 2n porter, cossos, i els de venda fins
que se'n van). L'onze ideal, per tant, ix més car del que el sostre aguanta de veres.

**Miquel ho ha vist i ho deixa així (2026-07-27):** «la plantilla seran sobretot eixos 11 i la
resta poden viure un poc de crèdit». És una decisió, no un descuit.

---

# CORRECCIONS DEL MEU PROPI DIAGNÒSTIC (es queden com a avís)

## C-01 · CAP NÚMERO DE FLUX ÉS CREÏBLE ENCARA

**Vigent. Este és el punt de parada que importa.**

Vaig calcular un flux bi-setmanal de +2.703 € usant els 21.127 € de taquilla de la setmana
anterior. Miquel va aclarir què eren eixos dos partits:

```
Benifotrem - Aeropuercs    1 986 €   →  AMISTÓS (pausa entre temporades:
                                         el partit menys lucratiu que tindrem mai)
Benifotrem - Sofoneri     19 141 €   →  COPA
```

**Cap dels dos és de lliga.** El fixture cau a l'arrancada de T83 (àncora: primer partit T83 =
2026-07-25), justament al buit entre temporades.

**Conseqüència: encara no tenim ni una sola dada de taquilla de lliga**, i per tant el
`sou_sostenible` i tots els `nivell_objectiu` que Tonico calcule ara són aritmètica correcta sobre
una entrada que no representa el club. El codi del v3.1 està verificat contra els seus fixtures;
**el model no està calibrat contra la realitat.**

**Fa falta un període bi-setmanal amb partits de lliga de veres** abans de creure's cap número de
flux. Val la pena que el sistema ho diga en comptes de donar un `nivell_objectiu` amb cara de
certesa.
