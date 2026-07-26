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
