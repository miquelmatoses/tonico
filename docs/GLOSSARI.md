# Tonico — glossari de traducció (ca-valencia → en)

Decisió de com es tradueix el vocabulari de domini a l'anglés (Fase 12, avanç al
polit #4.3). **Miquel revisa i ajusta.** Principi: els **noms propis** es mantenen
en valencià com a marca (Tonico, Paco Meseguer, Fotrem, les lletres de fornada
A1/A2…); els **conceptes** es traduïxen perquè un anglòfon els entenga.

## Noms propis (NO es tradueixen)

| Valencià | Anglés | Motiu |
|---|---|---|
| Tonico | Tonico | marca del producte |
| Paco Meseguer | Paco Meseguer | personatge |
| Fotrem | Fotrem | nom propi del juvenil |
| A1, A2, B1… | A1, A2, B1… | etiquetes de fornada (proper nouns) |

## Conceptes (SÍ es tradueixen)

| Valencià | Anglés | Nota |
|---|---|---|
| fornada | batch | unitat de venda/entrenament; la lletra (A1) es manté |
| descartat | dud (o *ruled out*) | juvenil sense potencial entrenable. **«dud» fora de la interfície ca** (argot): «No (descartat)», «descartat per dades → estructura». En anglés es manté «dud» (concís, encaixa amb la veu) |
| farciment | filler | cos que ompli plaça sense entrenar |
| entrenable | trainee | jugador del nucli d'entrenament |
| informe | weekly report | l'informe setmanal de Paco. **«Parte» PROHIBIT** (castellanisme) — sempre «informe» |
| crida al cercapromeses | youth-academy call-up | **«Crida» MAI a seques**: la primera aparició en cada secció/alerta va sencera. Botó: «He cridat el cercapromeses — acceptat/rebutjat» |
| fitxatge | signing | |
| nucli competitiu | competitive core | |
| futur entrenador | future coach | categoria (p.ex. Salvatella) |
| alliberament | release | |
| venda | sale / sell | |
| experiència | experience | |
| inflexió | inflection | el gir del pla mestre |
| Junta | Board | la directiva de Hattrick |
| pom (config) | plan setting | paràmetre de BD |
| rol (de partit) | role | Lineup A/B |
| Alineació A — competitiva | Lineup A — competitive | rol competitiu |
| Alineació B — només entrenament | Lineup B — training only | rol d'entrenament |
| «Què ha canviat» | What changed | secció comparador |
| desfés | undo | |
| desquadre | mismatch | personal vs fase |

## La veu de Paco en anglés

Mateix personatge (sec, concret, acaba en acció, sap callar). Els tics valencians
tenen equivalent anglés, apuntat a `docs/veu-paco-meseguer.md` i a `DECISIONS.md`:

| Tic (ca) | Equivalent (en) |
|---|---|
| Che, … | Oi, … |
| cap / míster | boss |
| Tu diràs. | Your call. |
| Cosa teua. | Up to you. |
| Au, a buscar. | Right, go find one. |

## Formes vetades (valencià de la casa)

El catàleg ca (`public/i18n/ca-valencia.json`) NO pot contindre estes formes; un guardià
lingüístic (`test/i18n_guardia.mjs`) les rebutja perquè no tornen a colar-se:

| Vetat | Correcte | Motiu |
|---|---|---|
| `d'hui` | `de hui` | «hui» NO s'apostrofa en valencià |
| `avui` | `hui` | forma valenciana |
| `parte` | `informe` | castellanisme |
| `Fotrem` | `Acadèmia` / `Juvenils` / `Planter` | nom propi d'un usuari, no genèric |
| `aquest/-a` | `este/esta` | demostratiu valencià |
| `sortir` | `eixir` | verb valencià |
| `meva/teva/seva` | `meua/teua/seua` | possessiu valencià |
| `migcampista` | `mig centre` | és el nom del TIPUS DE JUGADOR a Hattrick |

## Habilitat ≠ tipus de jugador

Dos vocabularis distints que compartien un catàleg, i d'ací va eixir «vols que confirme que
entrene migcampista i passador?»:

| Camp | Habilitat (què s'ENTRENA) | Tipus de jugador (què es COMPRA) |
|---|---|---|
| `porteria` | porteria | porter |
| `defensa` | defensa | defensa |
| `creativitat` | creativitat | **mig centre** |
| `extrem` | extrem | extrem |
| `passades` | passades | passador |
| `anotacio` | anotació | davanter |
| `pilota_aturada` | pilota aturada | llançador |

Al catàleg: `hab.*` per a l'habilitat, `habilitat.*` per al tipus. «Posa entrenament A:
**creativitat**» i «compra'm un **mig centre** per al lloc MC3» — mai al revés.
