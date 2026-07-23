# Tonico — sistema de disseny (implementat)

El redisseny de **Claude Design** («Redisseny complet Tonico», `Tonico.dc.html`) està
**implementat**, no aplicat com a capa: l'estructura, els components i el layout ixen del
disseny. `public/estil.css` és el sistema (tokens + components amb classe pròpia, cap estil
en línia); `public/seccions.js` emet el marcatge dels components.

## Tokens

Anton (títols) + Manrope (text) · paleta crema `#f4f0e2` / tinta `#14231a` / verd fosc
`#0c3a1e` / llima `#c6f24e` · ombres dures (`2px`–`5px` sòlides) · radis 6–18 · píndoles 999.

## Components implementats

| Component | Classe | On |
|---|---|---|
| Capçalera fixa (marca, fase, caixa, idioma, eixir) | `.hdr` | `app.html` |
| Píndoles de navegació amb secció activa | `.pills` | `app.html` |
| Capçalera de secció numerada | `.sec-cap` / `.sec-num` | `capcalera()` |
| Hero + KPIs | `.hero` / `.kpi` | Esta setmana |
| Banner de Paco amb avatar | `.briefing` / `.avatar` | Esta setmana |
| Targeta d'acció per urgència | `.targeta` + `.tag` | Esta setmana |
| Agenda | `.agenda` | Esta setmana |
| Targeta amb capçalera i compte | `.card` / `.card-cap` | Plantilla, Fotrem, Agenda… |
| Fila densa de jugador amb xip de posició | `.fila` / `.pos` | Plantilla |
| Camp de joc amb xips | `.camp` / `.jug` | Alineació |
| Graella de dades curtes | `.graella` | Comptabilitat d'entrenament |
| Píndola d'estat | `.pill` (`.ok/.avis/.perill/.info`) | transversal |
| Taula (targeta per ella mateixa) | `table` | seccions de dades |
| Autenticació a doble panell | `.auth` / `.auth-pitch` | entrada, registre, onboarding |

## Estat per secció

**Totes les seccions tenen la maqueta del disseny.** Cap taula HTML queda a l'app: el
disseny no en fa servir, i les dades viuen en targetes, files denses i graelles.

| Secció | Maqueta |
|---|---|
| Autenticació | doble panell (pitch il·lustrat + formulari) |
| 01 Esta setmana | hero + KPIs + banner de Paco + targetes d'acció + agenda |
| 02 Moviments | dues columnes: fets / preguntes / motius, amb files de punt |
| 03 Alineació | dos camps de joc amb xips + graella de comptabilitat |
| 04 Plantilla | targeta per categoria amb files denses i xip de posició |
| 05 Fotrem | banner de consell, rellotges, entrenament, rànquing i camp juvenil |
| 06 Mercat | targetes de filtres, comparables i fitxes de venda en graella |
| 07 Economia | tres xifres grans (amb barra de progrés) + targetes de treball |
| 08 Pla mestre | files amb insígnia de temporada, píndoles de divisió i estat |
| 09 Personal | dues columnes: entrenament configurat / personal declarat |
| 10 Comparador | targeta de pujada + targeta «què ha canviat» |

## Ganxos semàntics (classes existents)

| Ganxo | On | Per a què |
|---|---|---|
| `nav#ancores` | `app.html` | barra d'àncores fixa de la pàgina única (estructural) |
| `.cos` | contenidor de cada `<section>` a `app.html` | on cada secció pinta el seu render aïllat |
| `.paco` | paràgrafs del parte a «Esta setmana» | veu de Paco Meseguer (el redisseny li pot donar personalitat) |

## Patrons de component (un per patró, HTML semàntic)

El client construïx el DOM amb `el(tag, attrs, ...fills)` (a `public/comu.js`);
el resultat és HTML idèntic al que escriuríem a mà. Patrons:

1. **Secció** — `<section>` amb encapçalament `<h2>` (pàgina) o `<h3>` (subsecció)
   i el contingut a dins. Tota subsecció usa `<section><h3>…` (uniforme; les
   subseccions de «Moviments» i «Personal» s'han normalitzat de `<div>` a `<section>`).
2. **Taula de dades** — `<table><thead><tr><th></th>…</tr></thead><tbody><tr><td></td>…</tr></tbody></table>`.
   Capçaleres via claus i18n `*.col_*`. Usada a: plantilla, alineació, comptabilitat,
   economia (marges i moviments), mercat (preus), pla, jugador, instantànies.
3. **Formulari** — `<form>` amb `<label>` que embolica etiqueta + control i un
   `<button type="submit">`. Dos orígens (mateix patró): estàtic amb `data-i18n`
   (registre, entrada, onboarding) i construït en JS (pujada, apunts de mercat/economia).
4. **Llista** — `<ul><li>…</li></ul>`. Dos variants: **informativa** (`<li>text</li>`:
   filtres, desglossament de capital, avisos, pops) i **accionable**
   (`<li><span>text</span> <button>…</button></li>`: alertes, moviments).
5. **Control inline / override** — `<select>` o `<input>` dins d'una cel·la de taula
   o d'un `<p>`, amb un `<button>` d'acció (override de categoria/fornada, motius de
   baixa, veto/fixa d'alineació, accepta/edita capital, selector d'idioma).
6. **Missatge de Paco** — `<p class="paco">` (parte setmanal). Text de veu, no dada.
7. **Estat / càrrega** — `<p role="status">` (resultats d'enviament) i
   `<p role="alert" hidden>` (errors de formulari); placeholder `data-i18n="comu.carregant"`.
8. **Navegació** — enllaços separats per ` · ` (`nav#ancores` a l'app; `pintaNav`
   a les pàgines multipàgina). Inclou el **selector d'idioma** (`<select>`) al final.

## Confirmació semàntica (4a)

- Cap `<div>` decoratiu ni de layout: els únics `<div>` són els contenidors `.cos`
  (estructurals, necessaris per al render aïllat per secció).
- Tot text visible ve del catàleg i18n (cap literal al DOM); el **guardià i18n**
  (`test/i18n_guardia.mjs`) vigila que cap clau referenciada quede sense entrada i
  exigix paritat ca-valencia ↔ en.
- Un patró = un tipus d'element semàntic. El redisseny pot vestir cada patró amb
  un sol bloc de regles (p.ex. `section`, `table`, `form`, `.paco`, `nav#ancores`).

## El que NO s'ha fet (deliberadament)

Cap color, cap tipografia, cap espaiat decoratiu, cap layout nou. Això arriba amb
el redisseny (Claude Design) sobre este inventari.
