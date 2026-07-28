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

**Cap.**

El PAS 10 està construït (migracions 098-100, `lib/juvenil_pla.js` i `lib/orquestra_juvenil.js`),
i l'única fórmula que G1 encara declara pendent és **`V.hores`**: el full diu que el reinici de
la crida al cercapromeses va per país, i eixa maquinària s'ha retirat sencera perquè el
cercapromeses no el jutja Tonico. Queda al full com a variable descrita i sense consumidor.
