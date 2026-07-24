# Tonico — sol·licitud d'accés CHPP (esborrany per a Miquel)

Text preparat per demanar una **CHPP application** a Hattrick
(Supporter → *My CHPP* → *Create new application*). Revisa'l, ajusta el que
vulgues i presenta'l. La CHPP usa **OAuth 1.0a**; quan aproven l'app rebràs un
`consumer_key` i un `consumer_secret` (van a **secrets de Cloudflare**, mai al repo).

---

## Nom de l'aplicació

Tonico — el planter de Puchades

## Descripció (per al formulari de sol·licitud)

Tonico és un assistent personal i privat de gestió estratègica per a un únic
usuari (l'autor). Llig les dades del meu propi equip i em recomana accions
setmanals seguint un sistema de regles deterministes (sense IA): classificació
de la plantilla, planificació de fornades de juvenils, calendari de vendes i
projecció econòmica cap als objectius del pla pluriennal.

Ara mateix carregue les dades manualment via CSV. Vull usar la CHPP per
**substituir eixa càrrega manual** per la lectura directa de l'API, i per accedir
a dades que l'exportació CSV no dóna (sobretot els **minuts jugats** per partit).

No és un servei públic ni comercial: és una eina personal. No es publiquen ni es
revenen dades; tota la informació es guarda xifrada al meu propi entorn i només la
veig jo, autenticat.

## Ús de l'API (només LECTURA)

L'aplicació **només llig** (cap escriptura, cap acció sobre el joc). Freqüència
baixa: típicament una sincronització manual per setmana, més alguna consulta
puntual. Respecte els límits de ràtio de la CHPP.

### Endpoints previstos

| Fitxer CHPP | Per a què a Tonico |
|---|---|
| `players` | Plantilla sènior: habilitats, edat, sou, TSI, forma, especialitat, estat de transferible → classificació i regla d'or. |
| `youthplayers` | Juvenils: potencial i compost coneguts, dies per a promoció → gestió de l'acadèmia (Fotrem) i crides. |
| `matchesarchive` + `matchdetails` (o `playerdetails` amb minuts) | **Minuts jugats** per jugador → l'alerta del porter deixa de ser recordatori i mesura els 60' reals; suport a la doctrina d'alineació. |
| `transfersplayer` / historial de transferències | Import i data reals de compres i vendes → caixa, marges per fornada i projecció sense apunt manual. |
| `worlddetails` / `teamdetails` | Divisió, sèrie i mode competitiu de la temporada → completar el pla mestre. |
| `economy` | Caixa i finances del club → economia directa (avui apuntada a mà). |

*(Els noms exactes dels fitxers/versions es confirmen contra la documentació
vigent de la CHPP en implementar; la llista marca la INTENCIÓ d'ús.)*

## Dades i privacitat

- Només dades del **meu propi equip** (l'usuari autenticat per OAuth).
- Emmagatzematge al meu entorn privat (Cloudflare D1), accés només amb sessió.
- No es comparteixen ni es publiquen dades de tercers.

## Tècnic

- OAuth 1.0a; `consumer_key`/`consumer_secret` i tokens d'accés guardats com a
  **secrets** de Cloudflare (`wrangler secret`), mai al repositori públic.
- Capa d'ingesta abstracta ja existent: la CHPP entra com una **font de dades**
  nova al costat del CSV, sense reescriure el motor de regles.

---

*Nota interna: en aprovar-se, afegir `CHPP_CONSUMER_KEY` i `CHPP_CONSUMER_SECRET`
als secrets de Pages, i implementar `lib/font_chpp.js` (signatura OAuth + mapatge
al model intern, reusant l'`adaptador`). El residu manual que resol està a
`docs/ENTRADES_MANUALS.md`.*
