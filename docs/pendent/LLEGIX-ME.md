# Pendent immediat: cablar el PAS 6 a l'app

`lib/plantilla.js` (PAS 6) està **complet, provat i verd**, però l'app encara classifica
amb el model vell: `lib/orquestra_classificacio.js` crida `classifica()` (categories
entrenable/farciment/experiencia/alliberament) en compte de `construeixPlantilla()`.

## Què falta, exactament

1. **Migració `060_rols_v3.sql`** (ací al costat, sense aplicar). Refà `categories_jugador`
   amb el CHECK del vocabulari v3 (`core·rotatiu·titular·porter·cos·venda·futur_entrenador`)
   i converteix les categories ja assignades:
   `entrenable→core · farciment→cos · nucli_competitiu→titular · experiencia|alliberament→venda`.
   Hi afig el pom `core_a_min`.
2. **`lib/orquestra_classificacio.js`**: substituir `classifica(...)` per
   `construeixPlantilla(...)` i mapar el resultat a l'`ideal` que espera `reconcilia()`
   (el mecanisme actua+informa+desfés es manté igual). Cal un ajudant que derive els
   LLOCS de la formació (bucket, si entrena i a quin %, i quina habilitat el jutja).
3. **`functions/api/categoria.js`**: la llista blanca d'overrides manuals, al vocabulari nou.
4. **9 tests a migrar** — codifiquen el model fàbrica i han d'assertar els rols del v3:
   `alertes_persist · alineacio · anti_soroll · classif_persist · moviments_caducitat ·
   plantilla_categories · plantilla_punts · regeneracio · regla_or_bucket`
   (p. ex. «8 entrenables» passa a ser «5 core + 3 rotatius»).
5. **Vista Plantilla i i18n**: les píndoles de categoria, al vocabulari nou.

## Per què està aparcat ací i no a mig fer

El cablatge es va provar i trencava eixos 9 tests. Deixar-lo a mig camí hauria deixat el
repositori roig i prod amb la BD d'un lot i el codi d'un altre. HEAD queda verd i prod
consistent (la BD de prod NO té la 060 i el codi desplegat encara usa el model vell).
