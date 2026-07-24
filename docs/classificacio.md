# Classificador automàtic — doctrina (Fase 1, F1-B)

> Font de veritat del comportament del motor. La **lògica** viu al codi; els
> **números** d'esta taula viuen a `plantilles_categories` / `plantilles_parametres`
> (per plantilla de pla). Res hardcoded. Este document és el que el codi implementa.

## Principi

Classificació **automàtica i total**: en cada pujada, tot jugador rep un veredicte.
«No quadra en cap categoria» no existix — en una fàbrica, un jugador sense funció
és un actiu a liquidar.

## L'embut (per a cada jugador, en cada pujada)

**Etapa 1 — Utilitat** (¿té funció al pla actiu?). S'avaluen les funcions en ordre;
les de plaça limitada s'omplin amb els millors puntuats:

| Ordre | Categoria | Funció | Aforament | Qualifica si… | Puntuació |
|---|---|---|---|---|---|
| 1 | `entrenable` | sí | **8** (6 MC + 2 extrem) | posició MC/extrem i mínims | `creativitat + k·(edat_ref − edat_anys)` |
| 2 | `futur_entrenador` | sí | **1** | veterà | `experiencia` (≈ cost de reconversió) |
| 3 | `experiencia` | sí | 2 | veterà d'alta experiència | `experiencia` |
| 4 | `nucli_competitiu` | sí | — | (no s'usa en fàbrica pura) | — |
| 5 | `farciment` | sí | — | ompli sense ser vendible-valuós | — |

**Etapa 2 — Liquidació** (si no ha agafat cap funció de dalt):
- ¿Té **valor de mercat**? → `venda`.
- Si no → `alliberament`.

**Ordre clau (el cas Pequerul):** un jove **valuós** que no agafa plaça d'entrenable
**es ven** (realitzar l'actiu), no cau a farciment. Per això la comprovació de valor
de mercat va **abans** de farciment: farciment és per als que **no** són vendibles-valuosos
(vells barats que òmplin). Pequerul (17a, extrem 5-6, Potent) → sense plaça → valor → **venda**.

## La regla d'or — «ACTUA, INFORMA, DESFÉS»

- **Classificar és automàtic**: assignar categoria a un jugador nou o sense plaça es
  fa sol, en silenci, amb la regla i la puntuació registrades i visibles.
- **Desplaçar també és automàtic (ACTUA + INFORMA)**: qualsevol moviment que **desplace**
  un titular de plaça per damunt de `llindar_intercanvi` **s'executa** (l'entrant ocupa
  la plaça, el desplaçat baixa per l'embut) i **s'informa** al parte amb botó **Desfés**.
  El secretari actua; no fa cua de preguntes.
- **Desfés**: restaura l'estat previ complet (l'entrant torna a `categoria_previa_entrant`,
  el desplaçat recupera la plaça). Un **desfés equival al rebuig antic**: activa el fre
  anti-soroll (es recorda `diferencia_al_rebutjar`; no es re-executa fins que la diferència
  cresca substancialment per damunt del llindar).
- **Sota el llindar**: silenci total, ni pregunta.
- **Override manual (ÚNICA pregunta que resta)**: una categoria posada a mà queda fixada
  (`origen='manual'`); el classificador no la toca. Si un no-manual de l'embut supera un
  ocupant **manual**, no s'executa res: es planteja una **pregunta prèvia** (mai
  sobreescrivim en silenci una decisió humana). Jo accepte o rebutge.
- **Sense efectes irreversibles**: els auto-moviments només reclassifiquen categories;
  mai encadenen una transacció ni una baixa.
- **Revisió fina**: en cada pujada es reavaluen **totes** les places, no sols quan
  entra algú nou. Un titular pot ser desafiat per qualsevol (un farciment que ha crescut).

## Fornades

Automàtiques per **cohort** = temporada d'entrada al club (`data_alta_club`) + edat.
Override manual persistent.

**La fornada és unitat de VENDA, no sols d'entrenament** (esmena de doctrina,
polit #4). Un membre desplaçat de `entrenable` a `venda` **conserva la lletra**:
es ven amb la finestra de la seua fornada (p.ex. el juvenil A es ven amb A1). Per
això l'assignació automàtica no toca els no-entrenables: no els reassigna ni els
lleva la lletra.

## Paràmetres proposats (plantilla `fabrica`) — PER CONFIRMAR/AJUSTAR

`plantilles_categories`:

| categoria | es_funcio | aforament | formula | parametres (JSON) |
|---|---|---|---|---|
| entrenable | 1 | 8 | `entrenable` | `{"places":{"mc":6,"extrem":2},"pes_creativitat":1.0,"pes_marge_edat":0.5,"edat_ref":20,"min_creativitat":2}` |
| futur_entrenador | 1 | 1 | `experiencia` | `{"pes_experiencia":1.0}` |
| experiencia | 1 | 2 | `experiencia` | `{"pes_experiencia":1.0,"min_experiencia":6}` |
| nucli_competitiu | 1 | (null) | (null) | (null) |
| farciment | 1 | (null) | (null) | (null) |
| venda | 0 | — | — | — |
| alliberament | 0 | — | — | — |

`plantilles_parametres`:

| clau | valor | què |
|---|---|---|
| `llindar_intercanvi` | 0.25 | diferència mínima de puntuació per executar un moviment (per davall: silenci) |
| `valor_edat_max` | 21 | fins a esta edat, un jugador es considera potencialment vendible |
| `valor_habilitat_min` | 5 | habilitat màxima ≥ este valor → té valor de mercat |
| `valor_especialitats` | Potent,Ràpid,Joc aeri,Tècnic,Imprevisible | especialitats que donen valor |
| `fornada_finestra_dies` | 21 | marge per agrupar entrades en la mateixa cohort |

## Doctrina de venda en fàbrica (fase NO competitiva)

> En fase no competitiva, **cap jugador que no entrena té valor de retenció per
> qualitat**: es ven tot el que tinga valor de mercat. L'**estructura** (cobertura
> mínima dura) la cobrixen els cossos de **MENYS valor** — els cars es venen per fer
> caixa. L'únic límit és la cobertura mínima.

Manifestació a la secció Vendes (polit #10.5): dins cada línia de posició, el cos de
**menys valor** porta la marca «cobrix {pos} — ven-lo l'últim de la seua línia»
(buffer mentre no arriba el relleu); la resta, «lliure per vendre ja». L'ordre de
venda dins la llista el fixen els rellotges (aniversari, mercat, forma) + esta marca.

**En fase COMPETITIVA el criteri s'invertix** (la qualitat sí que reté): per això és
**contingut de `fases_config`**, no codi. Quan existisca la fase competitiva, la
marca i el llindar viuran com a paràmetres d'eixa fase.

Categoria **«despatxar»** (polit #10.6, redefinix `alliberament`): `valor_net =
preu_esperat − cost_llistat (pom) − sous fins a la venda estimada`. Si `valor_net <
llindar` (pom), llistar és tirar diners → despatxar, amb el càlcul visible a la fila.
El llistat a 1 € és un override manual, no el defecte.

## Punts a confirmar (forks de doctrina)

1. **Ordre de l'embut**: valor-de-mercat abans de farciment (jove valuós → venda, no farciment). ✔?
2. **Pla actiu**: mentre no existisca la UI de plans (Fase 4), l'usuari usa la plantilla `fabrica` per defecte. ✔?
3. **Fórmula d'entrenable**: `creativitat + 0.5·(20 − edat)` (més jove i més creatiu puntua més). ✔ o altres pesos?
4. **Salvatella** (experiència 12): plaça de `futur_entrenador` (aforament 1) abans que `experiencia`. ✔?
5. **Repujada mateix dia+equip**: substituïx la instantània (amb confirmació), no en crea una nova → cal ajustar el `pujar` de la Fase 0. ✔?
