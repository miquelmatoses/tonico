# Tonico — millores futures (registrades, no bloquejants)

Idees acordades que esperen les condicions per implementar-se.

## Horitzó d'eixida de fornades afinat per velocitat de pops
**Quan:** hi haja diverses setmanes d'historial d'instantànies per jugador.
**Què:** `temporadaEixida` (a `lib/fornades.js`) només depén de l'edat i de
`edat_pic_venda`. Afegir-hi la **velocitat de pops observada**: un entrenable que
creix ràpid madura abans i pot eixir una temporada abans que la resta de la seua
cohort. Requerix estimar pops/setmana des de l'historial (ja el calcula el
comparador, F1-D). Segueix sent contingut/paràmetres: pes de la velocitat com a
pom de la plantilla, zero política nova al motor.
