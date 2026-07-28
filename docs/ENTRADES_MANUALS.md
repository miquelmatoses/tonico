# Tonico — inventari d'entrades manuals

## Principi de derivació (regla formal, a la vora dels contractes)

> **Tot allò que es pot derivar de les dades, es deriva.** L'entrada manual només
> és legítima en tres casos:
> - **(a) FET DEL MÓN** absent dels CSV (preus, personal, divisió/mode, imports,
>   identitat del compte i dels equips).
> - **(b) DECISIÓ GENUÏNA de l'usuari** (overrides, desfés, motius de baixa,
>   decisions sobre juvenils o ofertes).
> - **(c)** res més. **Qualsevol altra entrada manual és un DEFECTE** i s'ha de
>   substituir per derivació o estimació.

Cada entrada d'esta taula porta la seua legitimitat `(a)`/`(b)`. Els **overrides**
són sempre **opcionals**: mai requerits; si no els toques, l'automatisme ho gestiona.

Estat: ✅ té UI · ⚠️ buit (endpoint sense pantalla o funció no construïda).

| # | Camp / dada | Secció | Legitimitat | Si està buit | Freqüència |
|---|---|---|---|---|---|
| 1 | Correu + contrasenya | `/registre` | (a) identitat | No es pot usar l'app | Una volta |
| 2 | Nom sènior + juvenil | `/onboarding` | (a) identitat | No es pot pujar res | Una volta |
| 3 | País · divisió · partits per setmana · sistema juvenil | Configuració | (a) estructura del club a HT | El PAS 0 no es tanca i no es deriva res que en depenga | Ocasional |
| 4 | CSV sènior + juvenil | Pujar dades | — (és la FONT) | Sense dades, sense parte | **Setmanal** |
| 5 | Vist / Ignora alerta | Esta setmana | (b) decisió | L'alerta es queda «nova» | Setmanal |
| 6 | Caixa · manteniment d'estadi · taquilla i patrocini de les dues setmanes | Economia | (a) informe setmanal de HT | Sense flux no hi ha nivell objectiu, i amb poques setmanes no es calibra | **Setmanal** |
| 7 | Números de la calculadora d'estadi (manteniment nou + cost de l'obra) | Mercat | (a) món; la guia delega en calculadores CHPP | No es proposa cap obra | Per temporada |
| 8 | «Ja estic fent l'obra» / «ja està feta» | Mercat | (b) decisió | L'obra es proposaria per sempre | Quan toque |
| 9 | Preu de referència per TIPUS de fitxatge | Mercat | (a) el preu no el calcula el joc, el paga un altre mànager | La necessitat es veu, però no arriba a «què compensa comprar» | Quan toque |
| 10 | Personal: rol, tipus, nivell, sou i data de fi de contracte | Personal | (a) plantilla tècnica absent del CSV | No es pot dir si el flux la sosté ni quan venç | Ocasional |
| 11 | Nivell d'entrenament de l'entrenador | Entrenament | (a) absent del CSV; entra a la velocitat d'entrenament | Sense ell no hi ha setmanes fins al nivell següent | Ocasional |
| 12 | Fitxa de venda: data de llistat | Mercat | (a) món | El rellotge de la subhasta arranca el dia que puges el fitxer, no el dia que el vas llistar | Quan toque |
| 13 | Motiu de baixa d'un jugador que ja no ix al CSV | Decisions | (b) decisió genuïna | Es queda pendent de declarar | Quan toque |
| 15 | Resultat de la crida al cercapromeses | Juvenils | (a) fet del món | El rellotge de la crida no avança | Setmanal |
| 16 | Idioma | Capçalera | (b) preferència | Valencià | Una volta |

**El que ja NO es demana** (i per què): imports de transaccions —no hi ha comptabilitat de
moviments, el diner d'una venda apareix a la caixa—; preus observats i preu d'eixida —Tonico no
diu quant val un jugador—; fornades; fase i temporada d'inflexió; l'entrenament sènior
confirmat —es prescriu, no es tria—; i l'entrenament juvenil, per la mateixa raó.

### Revisió contra el principi

Cap entrada és un defecte (c): totes cauen en (a) món o (b) decisió. No hi ha cap
entrada manual que substituïsca un càlcul —el que es pot derivar, es deriva— ni cap
override del que l'automatisme ja fa. Els dos casos que hi havia se n'han anat sols:

- L'**override de categoria** no existix perquè no existixen les categories: el grup d'un
  jugador es deriva de l'assignació d'estructura cada volta que es mira.
- L'**entrenament confirmat a HT** no es demana perquè es prescriu: si el que tens posat
  no coincidix, el que canvia és HT, no Tonico.

## Residu manual resoluble per CHPP

Quan Tonico es connecte a la **CHPP** (API oficial de Hattrick), part d'este residu
manual desapareix perquè les dades arribaran de l'API en compte del CSV o de l'apunt:

| Entrada manual | Què aporta la CHPP |
|---|---|
| 4 · Pujada de CSV setmanal | Ingesta directa de la plantilla i els juvenils, sense exportar ni pujar fitxers. |
| 6 · Informe setmanal | Caixa, taquilla, patrocini i manteniment, sense transcriure'ls. |
| 9 · Preu de referència | Vendes recents comparables → una base per a declarar el preu amb menys ull. |
| 12 · Fitxa de venda | Data de llistada i resultat de la subhasta, sense apuntar-los. |
| ALR_JUNTA_PORTER (minuts) | Minuts jugats reals → l'alerta del porter deixa de ser recordatori i mesura els 60'. |

Segueixen sent manuals (no els dóna la CHPP): la **identitat** del compte (1, 2), la
**configuració** del club (3), les **decisions** (5, 8, 13, 14), el **personal declarat**
(10, 11) i els números de la **calculadora d'estadi** (7), que la guia mateixa delega en
una eina de fora. La capa d'ingesta ja és abstracta («Font de dades»), així que afegir la
CHPP és una font nova, no un canvi d'arquitectura.

## Limitació de la font: l'estat DOLORIT (retirat, v3 bloc 2)

La columna «Lesions» del CSV sènior porta EXACTAMENT dos valors: **buit** (cap lesió) o
**N** (lesionat N setmanes). La ingesta mapa NOMÉS això; qualsevol altre valor es registra
i degrada (no s'inventa significat).

L'estat **DOLORIT** (molèsties, creueta a HT) existix al joc però **NO és derivable d'este
export**. **Decisió (Miquel, v3 bloc 2): la font no ho sap → Tonico no ho gestiona.** La
marca manual que s'havia introduït (taula `marca_dolorit`, toggle, pom de fase) s'ha
**retirat sencera** (migració 046). Si algun dia es vol, la via correcta és CHPP, no un
override manual.
