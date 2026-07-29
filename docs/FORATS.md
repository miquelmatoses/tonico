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

**E-01 · L'entrenador té vara però no calaix.** `quota_entrenador` (10%) diu quin nivell
sostenen els ingressos i avisa quan el sostingut passa el que tens. És una VARA: no lleva
diner a ningú. Que competisca de veres pel flux amb els especialistes és una segona decisió,
i és de Miquel.

**J-02 · Els amistosos no es compten.** El joc en dona un cada tres setmanes i la projecció
juvenil només compta els partits de lliga, o siga que va curta. Conservadora, però curta.

**G1: 121 fórmules verificades, CAP pendent.** Cada fórmula del full té avaluador i referència.

**TAPAT el 2026-07-29** — la codificació de la targeta roja. Va una groga i una roja al mateix
partit i les dues van a la columna `Amonestacions`: la groga escriu 1 i la roja escriu 3, el
mateix que tres grogues. O siga que «té roja» i `amonestacions_suspensio` són el mateix número.
El pom s'havia esborrat a la 092 per «sense lector» —i era cert— i el pla juvenil comprovava un
camp `expulsat` que no existix enlloc: la condició no s'havia executat mai.
