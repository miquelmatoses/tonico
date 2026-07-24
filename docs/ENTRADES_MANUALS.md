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

| # | Camp / dada | Pàgina | Legitimitat | Si està buit | Freqüència | Estat |
|---|---|---|---|---|---|---|
| 1 | Correu + contrasenya | `/registre` | (a) identitat | No es pot usar l'app | Una volta | ✅ |
| 2 | Nom sènior + juvenil (+id Hattrick opc.) | `/onboarding` | (a) identitat | No es pot pujar res | Una volta | ✅ |
| 3 | CSV sènior + juvenil | `/pujada` | — (és la FONT de dades) | Sense dades, sense parte | **Setmanal** | ✅ |
| 4 | Vist / Ignora alertes | `/esta-setmana` | (b) decisió | Les alertes queden «noves» | Setmanal | ✅ |
| 5 | Fixar / Vetar alineació | `/alineacio` | (b) OVERRIDE — **opcional, mai requerit; l'auto ho gestiona** | S'usa la proposta auto | Setmanal (opc.) | ✅ |
| 6 | Fornada (lletra) per entrenable | `/plantilla` | (b) OVERRIDE — **opcional, mai requerit; l'auto ho gestiona** | S'usa l'auto per horitzó d'eixida | Quan toque | ✅ |
| 7 | Fase, temp. inflexió, divisió/mode | `/pla` | (a) fets del pla absents del CSV | Projeccions parcials | Ocasional | ✅ |
| 7b | Capital d'inflexió | `/pla` | (a) món, però **ESTIMAT, no demanat en fred** (Polit #3.5) | Tonico proposa l'estimació | Ocasional | ✅ |
| 8 | Transaccions (tipus, import, jugador, data, nota) | `/economia` | (a) imports reals del món (la nòmina ja es deriva del sou) | ALR_TRANSACCIO_PENDENT | Setmanal | ✅ |
| 9 | Preus observats (posició, edat, habilitat, preu) | `/mercat` | (a) preus del mercat absents del CSV | Sostre = pom manual | Quan toque | ✅ |
| 10 | Decisió juvenil (seguiment/elegit/cua d'eixida) | `/fotrem` | (b) decisió genuïna | Tots en «seguiment» | Quan toque | ✅ |
| 11 | Personal ric (entrenador + especialistes: nivell, sou, setmanes de contracte) | `/personal` | (a) plantilla tècnica absent del CSV | Desquadre amb la fase; ALR_CONTRACTE_PERSONAL a ≤2 setm. | Ocasional | ✅ |
| 12 | Caixa real + despeses fixes (planter, estadi) + ingressos setmanals | `/economia` | (a) informe setmanal de HT | Caixa = SUM de moviments; sense balanç | Setmanal | ✅ |
| 13 | Entrenament sènior confirmat (tipus/intensitat/resistència) | `/personal` | (a) el que hi ha configurat a HT | ALR_ENTRENAMENT_DESQUADRE si difereix de la fase | Ocasional | ✅ |
| 14 | Entrenament juvenil (principal + secundari) | `/fotrem` | (a/b) config de l'acadèmia | Sense validació de pipeline | Ocasional | ✅ |
| 15 | Divisió actual · tipus de setmana (A+B/un/copa) · caducitat Supporter | `/pla` | (a) estructura del club a HT | Sense divisió/alerta de Supporter; setmana = A+B | Ocasional | ✅ |
| 16 | Fitxa de venda (preu d'eixida, data de llistada, estat) | `/mercat` | (a) món + preu **PROPOSAT** des de comparables | Preu proposat; estat 'pendent' | Quan toque | ✅ |

### Revisió contra el principi

- **Cap entrada és un defecte (c)** després del Polit #3: totes cauen en (a) món o
  (b) decisió. El darrer sospitós, el **capital d'inflexió**, es demanava «en fred»
  (defecte); ara Tonico l'**estima** i l'usuari només confirma o edita (Polit #3.5).
- La **nòmina** es va llevar de l'entrada manual: es deriva del `sou` de la instantània (P7a).
- Els **overrides** (5, 6, override de categoria) queden marcats opcionals: existixen per
  a la decisió humana, mai per a suplir el que l'auto ja fa.

## Buits detectats (per a la revisió d'usabilitat)

- ⚠️ **Override manual de CATEGORIA** *(b) OVERRIDE — opcional*: l'endpoint
  `/api/categoria` existix (fixa origen='manual'), però NO hi ha control a la pàgina de
  plantilla per fer-ho. **Cal afegir el selector a `/plantilla`.**
- ⚠️ **Motiu de baixa** *(b) decisió genuïna*: quan un jugador desapareix queda
  `estat='pendent_de_motiu'`, però NO hi ha formulari per declarar el motiu
  (venda/alliberament/promoció) ni per enllaçar una promoció amb la seua fila juvenil
  d'origen (`jugador_origen_juvenil_id`). Paco ho reclama (ALR_TRANSACCIO_PENDENT).
  **Cal un formulari de motius de baixa.**
- ⚠️ **Reserva operativa i sostres de pressupost per perfil** *(a) poms de política*:
  són poms de BD (`reserva_operativa`), sense pantalla d'edició; ara només per SQL.
- ⚠️ **Avaluador de crides d'ofertes noves** *(b) decisió sobre una oferta externa*: la
  lògica existix (`avaluaCrida`) però no hi ha pantalla per avaluar un candidat a fitxar.
  **Cal una pantalla d'ofertes.**

## Residu manual resoluble per CHPP

Quan Tonico es connecte a la **CHPP** (API oficial de Hattrick), part d'este residu
manual desapareix perquè les dades arribaran de l'API en compte del CSV o de l'apunt:

| Entrada manual | Què aporta la CHPP |
|---|---|
| 3 · Pujada de CSV setmanal | Ingesta directa de la plantilla i els juvenils (sense exportar/pujar fitxers). |
| 8 · Transaccions | Historial de transferències (import i data reals) → caixa i marges automàtics. |
| 9 · Preus observats | Vendes recents comparables del mercat → calibratge del sostre sense apunt. |
| 7b · Capital d'inflexió | Estimació més fina amb comparables reals de mercat (avui s'estima des dels sostres/poms). |
| ALR_JUNTA_PORTER (minuts) | Minuts jugats reals → l'alerta del porter deixa de ser recordatori i mesura els 60'. |

Segueixen sent manuals (no els dóna la CHPP): la **identitat** del compte (1, 2), les
**decisions** de l'usuari (4, 5, 6, 10, motius de baixa) i el **personal declarat** (11),
que no forma part de l'API pública. La capa d'ingesta ja és abstracta («Font de dades»),
així que afegir la CHPP és una font nova, no un canvi d'arquitectura.

## Limitació de la font: l'estat DOLORIT (retirat, v3 bloc 2)

La columna «Lesions» del CSV sènior porta EXACTAMENT dos valors: **buit** (cap lesió) o
**N** (lesionat N setmanes). La ingesta mapa NOMÉS això; qualsevol altre valor es registra
i degrada (no s'inventa significat).

L'estat **DOLORIT** (molèsties, creueta a HT) existix al joc però **NO és derivable d'este
export**. **Decisió (Miquel, v3 bloc 2): la font no ho sap → Tonico no ho gestiona.** La
marca manual que s'havia introduït (taula `marca_dolorit`, toggle, pom de fase) s'ha
**retirat sencera** (migració 046). Si algun dia es vol, la via correcta és CHPP, no un
override manual.
