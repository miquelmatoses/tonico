# La veu de Paco Meseguer — guia d'estil del catàleg i18n

> Tota alerta, informe i missatge que l'app dirigix a l'usuari s'escriu en esta
> veu. Este document és la referència per a redactar les claus i18n (des de la
> Fase 2). La identitat visual (cara, avatar) arriba a la Fase 11; ací només la veu.
> **Proposta per revisar/ajustar abans d'escriure cap alerta.**

## Qui és

**Paco Meseguer**, secretari tècnic. Personatge fictici: és **la veu de Tonico**.
Home de futbol de la comarca, veterà, que fa la intendència del **planter** —del
teu ara, i del de qualsevol que òbriga compte (Fase 9: serà el secretari de cada
usuari). Ha vist entrar i eixir centenars de jugadors; coneix el mercat i no es fa
il·lusions. Fa la faena de despatx —fitxes, sous, aniversaris, finestres— i t'avisa
del que no pots deixar passar. Pragmàtic, honest, sense floritures. El seu ofici
és que no se't passe res.

## A qui s'adreça i com

S'adreça a **tu** (l'amo/míster del club) de tu a tu, com un col·lega de tota la
vida en qui confies la intendència. Respectuós però gens llepa. De tant en tant
et diu «cap» o «míster», mai com a formalitat buida. **No decidix per tu**: et
posa el cas damunt la taula amb els números i la seua recomanació, i tu tries
(igual que la regla d'or del classificador — ell proposa, tu signes).

## Registre

- **Breu i directe.** Una idea per missatge. Si es pot dir en dos línies, no en gastes tres.
- **Concret.** Sempre noms, números i dates. Res de generalitats.
- **Honest amb les males notícies.** Millor dir-t'ho ara que et coste diners després.
- **Orientat a l'acció.** Cada missatge acaba assenyalant una decisió o un pas.
- **Sec, amb un punt d'humor.** Ni animador ni catastrofista. Zero signes d'exclamació en cadena.

## Tics de llenguatge (valencià de la comarca)

- Obri sovint amb una crida curta: «Che,», «Ep,», «Escolta,», «Mira,», «Au,».
- Argot de mercat i fàbrica: «traure'l al mercat», «li queda corda», «no dóna més
  de si», «se'ns passa l'arròs», «este xic», «li puja el cartell/el sou».
- Dites pragmàtiques, sense abusar-ne. Cap paraula grossa gratuïta.
- Tanca amb la pilota a la teua teulada: «Tu diràs.», «Ho mires?», «Cosa teua.»,
  «Jo ja t'he avisat.»

## Regles d'or de la veu

**Sí:** brevetat, noms i xifres, dir la veritat encara que faça mal, acabar en acció.
**No:** floritura motivacional, optimisme fals, amagar el problema, jerga per la
jerga, decidir en nom teu, exclamacions a dojo.

**Paco sap callar.** Les setmanes tranquil·les toca informe curt i sec, sense
urgència inventada: «Tot en orde, cap. Els huit entrenen, ningú fa anys, cap foc.»
La punxa i el detall es reserven per a quan hi ha foc de veritat. No s'òmpli
d'avisos per justificar-se: si no hi ha res, ho diu i au.

## Com sonaria (exemples per a alertes de la Fase 2)

Perquè jutges la veu amb casos reals del roadmap. Els paràmetres ({...}) es
substituiran; ací van amb dades de Benifotrem:

- **Aniversari d'un entrenable (fet de sou/valor)** — `ALR_ANIVERSARI`
  > «Che, Pasiego fa anys divendres: se'n va a 20 i li pujarà el sou. No has de fer
  > res —és un entrenable, es queda—, però tin-ho present quan mires la nòmina.»

- **Junta i porter** — `ALR_JUNTA_PORTER`
  > «Ep, Castelló està en venda i no ha jugat ni un minut. És porter i té nivell:
  > la Junta ens el pot retindre. Fes-lo jugar 60 minuts esta setmana o ja pots
  > oblidar-te de traure'l.»

- **Nucli incomplet** — `ALR_NUCLI_INCOMPLET`
  > «Anem justos, míster: 7 entrenables actius, i en volem 8. Falta un mig centre
  > jove per a omplir la fàbrica. Mira't el mercat abans de dissabte.»

- **Llistar un jugador de venda (el valor no espera)** — `ALR_LLISTAR_VENDA`
  > «Che, Pasiego està en venda i encara no l'has llistat. No entrena ni fa
  > estructura: cada setmana són diners de sou i un dia més d'edat que perd. Llista'l
  > ja —el valor no espera—, tret que estiga lesionat o el mercat estiga per terra.»

- **Promoció juvenil a la vora** — `ALR_PROMOCIO_JUVENIL`
  > «Palazuelos es pot promocionar en 6 dies. Si el vols al primer equip, deixa-li
  > el buit fet; si no, decidix què fem amb ell. No el deixes en terra de ningú.»

- **Informe setmanal (capçalera de «Esta setmana»)**
  > «Bon dia, cap. Ací tens el que no pot esperar esta setmana. De més urgent a
  > menys. El que no toque, ja ho vorem la que ve.»

## Paco in English (Fase 12 — mateix personatge, mateix to)

Same man, same register: dry, concrete, ends on an action, knows when to shut up.
He is NOT localised into a generic assistant — he keeps his gruff, been-there tone.
The Valencian tics map to plain, slightly old-school English (not American peppy):

| Tic (ca) | English |
|---|---|
| Che, … | Oi, … |
| Ep, … | Look, … |
| cap / míster | boss |
| Tu diràs. | Your call. |
| Cosa teua. | Up to you. |
| Au, a buscar. | Right, go find one. |
| Jo ja t'he avisat. | Don't say I didn't warn you. |

**English samples (same alerts):**

- `ALR_JUNTA_PORTER` (urgent)
  > «Look, {name}'s LISTED and hasn't played. He's a keeper with quality — the
  > Board will hold him. Get him 60 minutes this week or forget about selling him.»

- `ALR_ANIVERSARI`
  > «Oi, {name} has a birthday in {days} days: he turns {new_age}. If you mean to
  > sell, this is the last window before his wage climbs and his stock drops. Your call.»

- **Weekly report, quiet week**
  > «Morning, boss. All quiet. The trainees are training, nobody's having a
  > birthday and there's no fire. I'll shout if anything comes up.»

Rule stays: **Paco knows when to shut up.** Quiet weeks get a short, dry note, no
invented urgency.
