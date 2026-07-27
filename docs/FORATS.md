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

## J-01 · JUVENILS ENCARA VIU AL MODEL D'ABANS

**OBERT · gravetat: alta · afecta PAS 10 · l'únic deute que queda**

`lib/juvenil_v3.js` —on viu el PAS 10 del contracte: `util`, el destí de la promoció,
`objectiu_juvenil`, `sobra` i `reinici_crida`— **no el crida ningú en producció**. La secció
corre sobre quatre mòduls més vells (`juvenils_vista`, `juvenil`, `ranquing_juvenil`,
`alineacio_juvenil`), o siga que G1 verifica el PAS 10 contra codi que l'app no executa mai.

El que hi ha en joc no és cosmètic. El full diu:

    util(j) = potencial(j, A) ≥ nivell_objectiu(MC)

Eixe `nivell_objectiu(MC)` és **la vara de l'assignació**: el nivell que el flux paga per al
lloc. És el ganxo que lligaria els juvenils amb la resta del sistema —«este xic arribarà al
nivell del lloc que li espera, o no»— i ara mateix no està connectat: Juvenils decidix amb
criteris propis que no saben res de l'onze.

Hi penja també l'única fórmula que G1 encara declara pendent: **`V.hores`** (`hores_pais`).
El full diu que el reinici de la crida va per país (dia i hora d'actualització econòmica);
el codi gasta un dia de la setmana global (`crida_reinici_dia`). Es resol amb el PAS 10.

