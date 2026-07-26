> ⚠️ **SUPERAT (parcialment) PER [docs/FORMULES.md](FORMULES.md) — contracte 2026-07-24.**
> On este document contradiga el full de fórmules, **mana el full**. Es conserva com
> a context històric; els principis segueixen vigents com a esperit, però la veritat
> numèrica i les fórmules viuen al full i a `formules.json`.

# Tonico — principis formals de disseny

Els principis que governen el producte, al costat dels contractes protegits. Dos
principis rectors:

## 1. Principi de DERIVACIÓ

> Tot allò que es pot derivar de les dades, es deriva. L'entrada manual només és
> legítima per a **(a)** fets del món absents dels CSV i **(b)** decisions genuïnes
> de l'usuari (overrides, desfés, motius). Qualsevol altra entrada manual és un
> DEFECTE.

Detall i inventari a [`ENTRADES_MANUALS.md`](ENTRADES_MANUALS.md).

## 2. Principi de l'INFORME: «L'INFORME NO PARLA DE L'ALINEACIÓ»

> Les **alertes** (l'informe de Paco) són per a **fets del món** i **accions que
> l'usuari ha de fer FORA de les alineacions**: llistar, comprar, declarar, fer la
> crida, renovar contractes, despatxar, promocionar-i-vendre, i **fets nous**
> (revelacions, aniversaris, canvis de fase).
>
> Tot allò que **es resol alineant** és faena de les **seccions d'alineació**: la
> proposta JA incorpora la decisió, amb el **motiu visible** al costat (alineació
> sènior, onze juvenil, comptabilitat d'entrenament, cobertura, fre de suplents).
> A l'informe, com a molt, un **resum d'una línia amb enllaç** a la secció.

### Auditoria (aplicada)

Reclassificades (DESACTIVADES com a alerta; el seu contingut viu a la secció
d'alineació amb el motiu visible):

| Alerta | Per què violava | On viu ara |
|---|---|---|
| `ALR_ENTRENABLE_SENSE_MINUTS` | «fica'l a l'alineació» = es resol alineant | Cobertura de la secció Alineació (avisos `entrenament_perdut`/`cobertura`) |
| `ALR_JUVENIL_SUPLENTS` | fre de suplents = composició de l'onze juvenil | Secció Fotrem → «Onze juvenil proposat» (avís `sense_marge` inline) |
| `ALR_REVELA_JUVENIL` | «fes jugar X per revelar» = instrucció d'alineació | Onze juvenil (motiu «descobriment»); el FET de revelar es celebra amb `ALR_REVELACIO_JUVENIL` |

Es mantenen a l'informe (fets/accions FORA de l'alineació): aniversaris, junta/porter
(llistar), compres, crides, contractes, trajectòria, supporter, sobrants a despatxar,
promocionar-i-vendre, especialitat descoberta, i **revelacions** (fet nou del món).

## 3. Principi de l'AGENDA: «L'INFORME ÉS L'AGENDA D'HUI»

> Una alerta només existix si l'**acció òptima és executable HUI**. Si l'acció té
> una **data futura**, no és alerta: és una línia d'**AGENDA** (una per data, al
> final de l'informe). Si el missatge acaba en «de moment res», no és alerta: és
> **informació de secció**.

L'informe deixa de ser un magatzem d'avisos anticipats i passa a ser el que Paco
faria **hui**. El que toca un altre dia espera al seu dia i viu a l'Agenda, derivada
de les **mateixes regles** que abans disparaven alertes anticipades.

### Auditoria (aplicada)

| Regla | Abans | Ara |
|---|---|---|
| `ALR_ANIVERSARI` (venda, depressió) | alerta «espera a la setmana X» | **agenda** «dia D: llistar X» fins al dia; el DIA de llistat → alerta accionable |
| `ALR_JOVE_FORA_PIPELINE` | alerta sempre que n'hi havia fora | només si la **crida al cercapromeses està disponible** i acceptar el nou passaria de l'objectiu; si no, la taula de Fotrem ja ho mostra |
| `ALR_JOVE_ESPECIALITAT` | alerta per a qualsevol especialitat descoberta | només si és **candidat real a eixida** (fora de pipeline o a la cua d'eixida) |
| `ALR_FINESTRA_MERCAT` (previstes/pròximes) | alertes informatives «ves fent caixa» | **fora de l'informe**; el contingut viu a la secció Mercat. La FORTA (depressió que toca comprar HUI) segueix sent alerta |

La **idempotència** de les alertes amb data d'acció inclou eixa data: un «vist»
anticipat NO silencia l'alerta del dia d'acció (el dia D es crea una instància nova).

## 4. Principi de la GENERALITAT: «NINGÚ PEL NOM»

> Cap regla, funció o **test** referencia un jugador concret pel nom. La lògica es
> defineix per **PROPIETATS** (categoria, estat, agenda, posició, habilitat); les
> verificacions a prod **seleccionen per propietat** sobre les dades vigents; els
> **fixtures de test són sintètics** (etiquetes com `PorterA`, `Conegut`, `Lesionat`).
>
> **Matís (correcció post-auditoria #1):** el principi governa **el codi i els tests**,
> no les dades. Els noms propis a **CONFIG/BD** (files de `fases_config`, `plans`,
> instantànies, CSV d'usuari) són **dades d'usuari legítimes i ES QUEDEN** — descriuen la
> plantilla real, no acoblen la lògica. La frontera és: lògica per propietat; dades pel seu nom.

Un nom propi hardcodejat **a la lògica** acobla el sistema a una plantilla i un moment. Si
una regla «funciona per a un porter concret», el que ha de funcionar és per a **tot porter
notable en venda**. El concepte «notable» té **font única** (`porter_notable_min`, guia
§2/§17): la verificació a prod busca `categoria='venda' AND posicio='PO' AND porteria>=7`
sobre la instantània vigent, no un nom.

Escaneig viu (test): `grep` de noms propis a `lib/`, `functions/`, `test/` ha de tornar
buit. Les dades de `data/`, `schema/` (seeds de config) i la BD en queden **excloses**:
allà els noms són contingut, no acoblament.

## 5. Principi de les TAULES NETES: «UNA DADA PER COLUMNA»

> Una taula = una dada per columna, **sense frases dins de cel·les**. Tota cel·la amb
> més d'una dada o amb text explicatiu es reclassifica: **columna pròpia**, **detall
> desplegable**, o **fora de la taula**. El PERQUÈ d'una assignació o d'un grup viu en
> un detall per fila o a la secció corresponent, mai dins la graella.

Aplicació (v3): la taula de Fotrem perd les columnes **Pipeline** i **Juga?** (frases) i
guanya **NIVELL** (numèric continu, no els antics grups G1-G5) + dades pelades; el raonament va al detall de la
fila o a la secció de l'onze. Les fitxes de venda: la marca de despatxar/cobertura passa
a **insígnia curta** + detall a banda. L'escaneig s'aplica a TOTA taula.

## 6. Principi LEAN: «EL MÍNIM EXACTE, LES ABSÈNCIES QUAN PASSEN»

> El sistema manté el **mínim exacte** de cossos, variables i mecanismes per a la
> **setmana neta**. **Cap marge permanent** per a un risc el cost del qual és menor que
> el cost de cobrir-lo. Les absències (lesió, sanció) es gestionen **quan passen** —jugar
> amb 10, o doblar un entrenable una setmana com a **excepció declarada**—, no amb coixins
> fixos que carreguen sou i plaça cada setmana.

La cobertura mínima **v3** aplica el principi: es lleva el pom `marge_absencies`. El mínim
derivat és exactament el que els **dos onzes** necessiten en setmana neta amb el doblatge
permés als cossos sense valor: `entrenables_objectiu + futur_entrenador + porters_minims
(1 per partit) + camp_minim (cossos que doblen)`. Amb la config actual **emergix 15**
(8+1+2+4), derivat, no escrit. La liquidació honra **tot** el mínim, camp **i** porteria.

La cobertura mínima **no és estalvi de sous**: és l'**assegurança** que cap entrenable jugue
minuts sense guany d'entrenament. Els llocs no entrenables dels dos partits els omplin
cossos sense valor; un entrenable només **dobla** si el seu règim (50%+50%) ho demana o per
decisió manual. Contracte d'alineació: **cap entrenable ocupa un lloc no entrenable mentres
hi haja cos disponible**; sense cos, la plaça queda **buida** (jugar amb 10) i es declara.
