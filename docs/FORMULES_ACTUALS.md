# FÓRMULES ACTUALS — el «full de càlcul» que el sistema implementa HUI

> Auditoria de només lectura (24-07-2026). Reconstrueix el que el **codi fa avui**, no el que la
> doctrina diu que hauria de fer. Estratègia activa: `fabrica` (l'única sembrada). Cada número
> està etiquetat: **pom** (plantilles_parametres / regles_parametres / plans), **constant_joc**
> (global de joc), **HARDCODEJAT** (`fitxer:línia`), **IMPLÍCIT** (emergix de l'ordre d'iteració
> o d'un `if`, sense número explícit — el pitjor cas per a auditar).
>
> 19 punts de decisió · al final: (a) tot el HARDCODEJAT/IMPLÍCIT per gravetat, (b) el graf de
> dependències sencer, (c) recompte fórmula-pura-sobre-poms vs codi-amb-números.

---

## 1. Classificació de categories (l'embut)

`lib/classificador.js:63-133` — motor universal, no coneix cap número; tot arriba com a config.

```
cats = ORDENA(config.categories, per 'ordre' ASC)
PER j amb fixats[j]: assignat[j] = fixats[j]                         // pins manuals primer
PER cada cat EN cats:
  lliures   = FILTRA(jugadors; lliure(j) I compleixRequisits(p.requisits,j))
  ambP      = MAPA(lliures → {j, p:avaluaPuntuacio(p.puntuacio,j)})
  elegibles = SI(p.llindar_minim!=null; FILTRA(ambP; p≥llindar_minim); ambP)
  SI p.places (per bucket de posició):
     PER (bucket,spec): n = spec.n − jaEnCat(bucket) − SI(p.resta_ocupacio; ocupadaAltres(bucket);0)
        SI n<1: CONTINUA
        PRIMERS(n) de ORDENA(elegibles del bucket que passen spec.requisit; p DESC) → posa
     SI p.cobertura_minima: PER bucket amb spec.n≥1 I ocupada(bucket)==0:
        reté el MILLOR lliure d'eixe bucket encara que no complisca adequació   // cobertura dura
  SINÓ SI cat.aforament: PRIMERS(MAX(0,aforament−jaEnCat)) de ORDENA(elegibles;p DESC) → posa
  SINÓ: tots els elegibles → posa
terminal: qui no ha agafat res → params.categoria_terminal
```
`avaluaPuntuacio` = `constant + Σ pes·v`, on `v = desde−resolField` si hi ha `desde`; `resolField`: `habilitat_max`=MAX de 7 habilitats, `especialitat_valuosa`=1 si a `valor_especialitats`.

| símbol | valor | origen | referència |
|---|---|---|---|
| ordre categories | entrenable1·futur_entrenador2·experiencia3·farciment4·venda5·alliberament6 | pom | `plantilles_categories.ordre` / schema/004:16-53 |
| entrenable places | `{mc:6, extrem:2}` | pom | schema/004:21 |
| entrenable requisits/puntuació | creativitat≥2, edat≤23 / creativitat·1+(20−edat)·0.5 | pom | schema/004:18,20 |
| futur_entrenador / experiencia | aforament 1 req exp≥8 / aforament 2 req exp≥6 | pom | schema/004:23-29 |
| farciment places (seed) | porter{1,porteria≥6}·DC{2,defensa≥6}·davanter{1,anotacio≥5} | pom | schema/004:38-41 (**SOBREESCRIT**, §3) |
| farciment resta_ocupacio/cobertura_minima | true / true | pom | schema/004:42-43 |
| farciment puntuació (inversa) | habilitat_max·−2, esp_valuosa·−3, (25−edat)·−1, sou·−0.001 | pom | schema/004:44-45 |
| venda llindar_minim / puntuació | 12.5 / habilitat_max·2, esp_valuosa·3, (edat−25)·1 | pom | schema/004:50-51 |
| valor_especialitats | Potent·Ràpid·Joc aeri·Tècnic·Imprevisible | pom | schema/004:8 |
| buckets_posicio | `{mc:[MC], extrem:[ED,EE]}` | pom | schema/004:9 |
| HABILITATS (7) | porteria…pilota_aturada | HARDCODEJAT | classificador.js:10 |
| llista blanca override manual (7 cat.) | — | HARDCODEJAT | functions/api/categoria.js:4 |

**Entrades**: `jugadors` (instantània), `config` (plantilles_*), `fixats` (categories origen='manual'). Càrrega config_pla.js:14-33, assemblatge orquestra_classificacio.js:34-82.
**Eixides**: `ideal=[{id,nom,categoria,puntuacio}]` → §3 (reconciliació/farciment) i, via categoria='venda', → §4 (liquidació).
**Discrepàncies**: (a) les `places` seed de `farciment` (004:38-41) es **descarten**: `derivaFarciment` (orquestra_classificacio.js:26) les sobreescriu i **els `requisit` per bucket desapareixen**. (b) La prioritat entre categories NO és un número: emergix de l'ORDENA per `ordre`; `resta_ocupacio` depén de quines categories s'han assignat abans → ocupació IMPLÍCITA. (c) Dues "cobertures mínimes" distintes: la dura de l'embut (reté 1 ocupant) vs la retenció de liquidació (§3).

---

## 2. Cobertura mínima

`lib/cobertura.js:80-98`.
```
nRols                = LLARGÀRIA(config.rols) o 1
entrenables_objectiu = ARRODONIX( Σ_{s∈slots, s.entrena}(s.pct/100) · nRols )
restants             = MAX(0, |slots| − COMPTA(entrena) − COMPTA(porter))
camp_minim           = MAX(0, restants − futur_entrenador)
total                = entrenables_objectiu + futur_entrenador + porters_minims + camp_minim
```
Cas actual: `8 + 1 + 2 + 4 = 15`.

| símbol | valor | origen | referència |
|---|---|---|---|
| slots (formació 3-5-2) | 11 llocs; MC1-3 entrena@100, EXT1-2 entrena@50 | pom | `formacio` / schema/008:7-18 |
| rols (nRols) | 2 (A competitiu, B no) | pom | schema/020:6-7, 028:19 |
| porters_minims | 2 | pom | schema/051:8 (default HARDCODEJAT 2 a cobertura.js:83) |
| bucket_porter | 'porter' | HARDCODEJAT | cobertura.js:83 |
| futur_entrenador (0/1) | 1 si existix cat futur_entrenador aforament≥1 | IMPLÍCIT | functions/api/vendes.js:98,101 |

**Entrades**: `formacio`, `rols`, entrenament efectiu (§6), `porters_minims`, existència de `futur_entrenador`.
**Eixides**: `{entrenables_objectiu, futur_entrenador, porters_minims, camp_minim, total}` → §3 (retenció rep camp_minim/porters_minims); `farcimentDerivat` (mateix fitxer) → §1.
**Discrepàncies**: `total` (15) es calcula ací però **no es persistix ni s'usa com a capacitat directa**: l'embut usa places per bucket derivades a banda (`farcimentDerivat`), que poden no sumar 15.

---

## 3. Retenció / farciment (dos mecanismes separats)

**3a. Farciment derivat** `lib/cobertura.js:57-70`:
```
perPos[pos] += 1  PER slot NO-entrena, PER pos EN bucketsAlineacio[slot.bucket]
PER (fb,positions): SI posicio_porter∈positions: places[fb]={n:porters_minims}
                    SINÓ n=Σ perPos[pos]; SI n>0: places[fb]={n}
```
Cas actual → DC `n=3`, davanter `n=2`, porter `n=2`.

**3b. Retenció en liquidació** `lib/cobertura.js:26-49`:
```
PER classe (camp = posicio≠porter; porters = posicio==porter):
  resta = MAX(0, cos − |membres_candidats|);  calen = MAX(0, minim − resta)
  reté PRIMERS(calen) de ORDENA(membres; coixí_primer, després valVenda ASC, després sou ASC)
```
`valVenda = valor ?? preu_proposat ?? puntuacio ?? 0`; `COIXI = {alliberament, despatx, despatxat}`.

| símbol | valor | origen | referència |
|---|---|---|---|
| farciment buckets | `{porter:[PO], DC:[DC], davanter:[DV]}` | pom | schema/004:38 |
| buckets_alineacio | `{porter:[PO],defensa:[DC],mc:[MC],extrem:[ED,EE],davanter:[DV]}` | pom | schema/008:5-6 |
| porters_minims | 2 | pom | schema/051:8 |
| posicio_porter | 'PO' | HARDCODEJAT (cap seed per 'fabrica') | orquestra_classificacio.js:25, cobertura.js:39,57, vendes.js:103 |
| resta_ocupacio_exclou | `['entrenable']` | HARDCODEJAT | orquestra_classificacio.js:29 |
| COIXI (3 categories) | alliberament/despatx/despatxat | HARDCODEJAT | cobertura.js:22 |
| camp_minim, cos_camp, cos_porter | derivats | IMPLÍCIT | vendes.js:99-117 |

**Eixides**: 3a `places` → §1 (embut farciment). 3b `{ids, camp, porters}` → §4 (`conjuntLiquidacio`).
**Discrepàncies**: (a) `farcimentDerivat` **no propaga `requisit`** (només `{n}`) → l'embut ompli farciment sense filtrar per porteria/defensa/anotació; només la `cobertura_minima` dura queda com a xarxa. (b) `n` seed ≠ `n` derivat (porter 1→2, DC 2→3, davanter 1→2): el seed és lletra morta. (c) `cos_*` ve de comptes SQL (vendes.js:115), font distinta de `slots`/`total` de §2.

---

## 4. Liquidació / despatx

`lib/liquidacio.js:15-37` + `functions/api/vendes.js:50-124`.
```
sans/lesionats = partició(venda; esLesionat)
ret        = retencioCobertura(sans, opts)                    // §3b
llistables = FILTRA(sans; NO ret.ids conté j)
estat = SI(llistat O transferible==1; 'llistat') SINÓ SI lesionat;'lesionat'
        SINÓ SI ret.ids conté j;'retingut' SINÓ 'llistable'
forc      = estat∈{llistat,venut,despatxat} O data_llistada O agenda_llistar
valor_net = SI(calibrat; preu_proposat − cost_llistat − sou·setmanes_venda; null)
despatxar = calibrat I valor_net < despatxar_llindar I NO forc
tancament_previst = data_llistada + dies_subhasta·86400000
```

| símbol | valor | origen | referència |
|---|---|---|---|
| cost_llistat / despatxar_llindar / setmanes_venda | 1000 / 0 / 3 | constant_joc | schema/037:6-8 (fallbacks 1000/0/3 vendes.js:56-58) |
| dies_subhasta | 3 | constant_joc | schema/033:4 (fallback '3' vendes.js:51) |
| estimacio_per_divisio | `{VII:2000…I:1200000}` | constant_joc | schema/041:6-8 |
| divisio_defecte | 'VII' | constant_joc | schema/041:9 |
| valor_estimat_defecte | 150000 | pom | schema/030:5 |
| ESTATS venda (5) | pendent/llistat/venut/desert/despatxat | HARDCODEJAT | vendes.js:11 |
| agenda forçada | missatge_clau='agenda.llistar' | HARDCODEJAT | vendes.js:63 |

**Entrades**: categoria='venda' (§1), `vendes`, `preus_observats`, retenció (§3b), cobertura (§2), constants econòmiques.
**Eixides**: `{estat_liquidacio, despatxar, valor_net, preu_proposat, tancament_previst, cobertura{retinguts_camp/porters, llistables, sou_total}}` → UI Vendes.
**Discrepàncies**: (a) **Doble "valor per defecte"**: `estimacio_per_divisio[VII]=2000` s'usa primer; `valor_estimat_defecte=150000` només si el mapa falla (però la divisió sempre resol → el pom 150000 està **mort** ací; a Economia és el que s'usa → §17). Divergixen 75×. (b) `despatxar` requerix `calibrat` (comparable real): sense `preus_observats` mai es proposa despatxar. (c) `valor` de retenció ordena per puntuació de venda quan n'hi ha, no pel preu en € mostrat.

---

## 5. Assignació d'alineacions sènior (quins 11, on, rotació)

`lib/alineacio.js`. `formacio` es carrega amb `entrena/pct` de la llavor, però **orquestra_alineacio.js:20-21 els sobreescriu** amb `aplicaEntrenament(slots, places)` (§6) → els `entrena/pct` de la llavor 008 són **valors morts**.
```
rolsActius = SI(opts.rols_actius; FILTRA(rols; id∈rols_actius); rols)
competitiu = PRIMER(FILTRA(rolsActius; competitiu=true)) SINÓ rolsActius[0]
disp = FILTRA(squad; NO lesionat I NO suspes I NO llistat I NO vetat)
       suspes=amonestacions≥suspensio_amonestacions(3); llistat=(estat='llistat') O transferible=1
0. FIXATS manuals guanyen a tot
buckets50=ÚNICS(slots entrena amb (pct??100)<100); buckets100=(…≥100); n50/n100=COMPTA
doblats=PRIMERS(ORDENA(entrenables; bucket50_natural asc,(fornada_eixida??99)asc); n50)
simples=ORDENA(entrenables∖doblats; (fornada_eixida??99)asc)
PER doblat,PER partit: omplir slot entrena buckets50 → juga els DOS onzes
PER simple[i]: partit = ordreRols[ARROD.AVALL(i / MÀX(1;n100))]; omplir buckets100   // ordreRols=[competitiu,...]
futur_entrenador → 'davanter' a TOTS els partits
FARCIMENT (per slot buit): cosPool=disp∖{entrenable,futur_entrenador};
  compatibles=FILTRA(cosPool; NO juga_partit I (bucketDe='porter')==(slot='porter')) ORDENA nPartits asc
  exacte=PRIMER(compatibles; bucketDe=slot.bucket); cos=SI(exacte I nPartits(exacte)≤nPartits(compatibles[0]); exacte; compatibles[0]??exacte)
```

| símbol | valor | origen | referència |
|---|---|---|---|
| rols | `[{A,competitiu:true},{B,competitiu:false}]` | pom | schema/028:19 |
| formacio / buckets_alineacio | 3-5-2 / mapa posicions | pom | schema/008:6-18 |
| suspensio_amonestacions | 3 | pom | schema/008:19 (fallback '3' orquestra:37) |
| llistat / transferible | estat='llistat' / 1 | pom (BD) | orquestra_alineacio.js:53, instantania:40,61 |
| llindar pct 100 (separa 50/100) | 100 | HARDCODEJAT | alineacio.js:56-57 |
| pct per defecte / fornada per defecte | 100 / 99 | HARDCODEJAT | alineacio.js:56-57 / 67,71 |
| bucket futur_entrenador / bucket porteria | 'davanter' / 'porter' | HARDCODEJAT | alineacio.js:82 / 94,96 |
| tipus_setmana → rols_actius | un/copa→[competitiu] | pom (pla) | orquestra_alineacio.js:26-31 |

**Entrades**: `squad` (instantània), `config{rols,slots,buckets}`, `opts{vetats,fixats,rols_actius,copa}`, `places` (§6).
**Eixides**: `{onze, comptabilitat, experiencia, avisos, rols, copa}` → functions/api/alineacio.js (UI) + avisos de cobertura.
**Discrepàncies**: (a) `formacio` seed `entrena/pct` (MC=100,EXT=50) **mai s'usen**; coincidixen per casualitat amb l'entrenament `creativitat` per defecte. (b) "qui entrena" es compta a dos llocs amb bases distintes: `comptabilitat()` sobre `disp∩entrenable`, `avisos()` sobre el `squad` sencer (alineacio.js:141-156).

---

## 6. Entrenament sènior (quins entrenen, places/%, cobertura)

`lib/entrenament_places.js` + `lib/entrenament.js`.
```
skill = params.entrenament_senior SINÓ fase.principal SINÓ fase.tipus SINÓ null
        (fase = fases_config[plantilla, fase_actual].config.entrenament)
places[b]=100 PER b∈taula_entrenament[skill]
places[b]=50  PER b∈taula_entrenament_baix[skill] SI buit          // 100 mana sobre 50
aplicaEntrenament: PER slot: SI places[slot.bucket] EXISTIX → {entrena:true,pct} SINÓ {entrena:false}
cobertura (avisos): totalEnt(id)=Σ_partit(SI slot.entrena; pct; 0); entrena_ok = totalEnt≥100 O (unaAlineacio I entrenaEnTots(id))
```
Per defecte `creativitat`: `places={mc:100, extrem:50}` → MC×3 100%, EXT×2 50% (n100=3, n50=2).

| símbol | valor | origen | referència |
|---|---|---|---|
| skill per defecte (fase) | creativitat | pom | `fases_config.config.entrenament` / schema/025:11 |
| entrenament_senior (override) | per pla | pom (pla) | entrenament_places.js:31,33 |
| taula_entrenament (100%) | mapa 7 skills → buckets | constant_joc | schema/044:23-25 |
| taula_entrenament_baix (50%) | `{creativitat:[extrem], extrem:[defensa]}` | constant_joc | schema/053:11-14 |
| valors 100 / 50 (efecte) | 100 / 50 | HARDCODEJAT | entrenament_places.js:15-16 |
| llindar cobertura 100% | 100 | HARDCODEJAT | alineacio.js:152 |

**Eixides**: `{skill, places{bucket→pct}}` → orquestra_alineacio.js:20-21 → **alimenta directament §5** (buckets50/100, n50/n100, doblatge).
**Discrepàncies**: (a) `skill=null` (sense entrenament configurat) → `places={}` → cap slot entrena i **cap avís de "no configurat"**. (b) `mc_entrenament=1` (schema/043:5) és de places MC **juvenils**, no del sènior. (c) `entrenament_a/b` (schema/044:28-29) són poms **juvenils** i NO governen el sènior; el governa `fases_config`.

---

## 7. NIVELL juvenil

`lib/ranquing_juvenil.js:58-67` (`valorHabilitat` :14-29). El pom `nivell_potencial_esperat` NO entra al NIVELL (només a l'onze).
```
NIVELL(y) = pes_a·valor(y,A) + pes_b·valor(y,B)
valor(y,skill):  act=actual; pot=potencial
 (a) act conegut, pot desc:  act + marge_esperat·f_marge
 (b) tots dos desc:          VE
 (c) act desc, pot conegut:  esperat + MAX(0, pot−esperat)·f_marge   (esperat=MIN(VE,pot))
 (d) tots dos coneguts:      act + MAX(0, pot−act)·f_marge
VE = SI hi ha actuals revelats de A: MITJANA(actuals_A revelats)   SINÓ valor_esperat_desconegut_defecte
ORDENA per NIVELL desc; empat → dies_restants_promocio asc; nivell a 2 decimals; posicio_rang=1..n
```

| símbol | valor | origen | referència |
|---|---|---|---|
| pes_a / pes_b | 1.0 / 0.66 | pom | `nivell_pes_a/b` / schema/045:4-5 |
| f_marge / marge_esperat | 0.5 / 3 | pom | schema/045:6-7 |
| valor_esperat_desconegut_defecte | 5 | pom | schema/045:8 |
| A / B (entrenaments) | creativitat / passades | pom | `entrenament_a/b` / schema/044:28-29 |
| HABS (7) | via camps `${skill}_actual/_potencial` | HARDCODEJAT | ranquing_juvenil.js |
| defaults numèrics | idèntics als poms | HARDCODEJAT | ranquing_juvenil.js:59 |

**Eixides**: `rang=[{jugador_id,nom,nivell,posicio_rang,dies_restants_promocio}]` → §8 (onze), §9 (promoció).
**Discrepàncies**: dins el NIVELL, la `VE` del component **B es calcula amb els actuals de A** (ranquing_juvenil.js:33,60); a l'onze sí que se separen `veA`/`veB` → dos càlculs de VE distints.

---

## 8. Assignació d'onze juvenil

`lib/alineacio_juvenil.js:14-128` — slot-centric per valor de plaça.
```
valPlaça[bucket] = classifica(bucket, A, B, taula_entrenament) → 'ab'|'a'|'b'|'cap'
marge(y,skill):  (a) act conegut,pot desc: marge_esperat·f_marge
                 (b) tot desc: MAX(0, potencial_esperat − VE(skill))·f_marge
                 (c) act desc,pot conegut: MAX(0, pot − MIN(VE,pot))·f_marge
                 (d) coneguts: MAX(0, pot−act)·f_marge     [VE(skill)=veB si skill==B sinó veA]
valorEntrenable(y,bucket) = (valPlaça∈{ab,a} ? pes_a·marge(y,A):0) + (valPlaça∈{ab,b} ? pes_b·marge(y,B):0)
slots = FILTRA(formacio[bucket]) capat a MIN(formacio[b], maxims[b])
PAS 1 (places ORDENA per rangValor desc: ab=3>a=2>b=1>cap=0): per slot no-'cap' agafa el juvenil LLIURE amb MAX valorEntrenable(>EPS); empat → dies_restants_promocio menor
PAS 2: slots 'cap' i entrenables buits → restants per NIVELL desc
FRE SUPLENTS: SI banqueta buida I enCamp>minim → lleva la plaça 'cap' de menor nivell
no_viable = en_camp<minim O sense porter
```

| símbol | valor | origen | referència |
|---|---|---|---|
| formacio_juvenil | `{porter:1,defensa:2,mc:3,extrem:2,davanter:1}` (=9) | pom | schema/039:4-6 |
| maxims_posicio | `{porter:1,defensa:5,mc:3,extrem:2,davanter:3}` | constant_joc | schema/039:11 |
| minim_jugadors | 9 | constant_joc | schema/033:5 |
| taula_entrenament | mapa 7 skills → buckets | constant_joc | schema/044:22-25 |
| potencial_esperat | 6 | pom | `nivell_potencial_esperat` / schema/047:5 |
| pes_a/pes_b/f_marge/marge_esperat/VE | 1.0/0.66/0.5/3/5 | pom | (mateixos que §7) |
| rangValor `{ab:3,a:2,b:1,cap:0}` | escala | HARDCODEJAT | valor_placa.js:19 |
| ordreBucket (visual) / EPS | porter..davanter / 1e-9 | HARDCODEJAT | alineacio_juvenil.js:95 / :12 |
| defaults minim=9, potencial_esperat=6 | — | HARDCODEJAT | alineacio_juvenil.js:15-17 |

**Eixides**: `{onze, banqueta, en_camp, minim, porter, no_viable, descobriments, entrenen, estructura}` → UI Fotrem (cap altra decisió backend). `revelacio_minuts`(44, schema/028:4) s'adjunta però NO entra al càlcul.
**Discrepàncies**: `maxims_posicio(defensa:5) > formacio_juvenil(defensa:2)`; com que `cap()` limita per formació, `maxims` **mai mossega** (mort de facto excepte defensa/davanter).

---

## 9. Promoció (juvenil → sènior)

`lib/ranquing_juvenil.js:43-56` (fotrem.js:61).
```
elegible(y): edat_anys≥edat_min I perDies
  perDies = SI dies_academia conegut: dies_academia≥dies_academia_min SINÓ dies_restants_promocio≤0
elegibles = FILTRA(rang, elegible); SI cap: proposta=null
millor = elegible amb MAX nivell
cua    = (millor.posicio_rang > SOSTRE(rang.length / 2))          // meitat baixa del rànquing
proposta = {jugador_id, nom, nivell, cua}
```

| símbol | valor | origen | referència |
|---|---|---|---|
| edat_min / dies_academia_min | 17 / 112 | constant_joc | schema/044:7-8 |
| defaults | 17 / 112 | HARDCODEJAT | ranquing_juvenil.js:43 |
| màx 1 promoció/setmana | 1 | IMPLÍCIT (un sol `millor`) | ranquing_juvenil.js:53 |

**Eixides**: `promocio={proposta|null}` → UI. `cua` → §10.
**Discrepàncies**: `promocio_max_setmana=1` (schema/044:6) és **constant morta** (mai llegida); el límit 1 és implícit. `bonus_club_mare=1.5` (schema/044:11) **mai llegit** — no entra a cap estimació.

---

## 10. Eixida juvenil (tres mecanismes, cap comparteix fórmula)

**10a. Rànquing d'eixida automàtic** `lib/juvenil.js:45-55` (regla ALR_JUVENIL_SOBRANT):
```
excedent = COMPTA(juvenils) − objectiu;  SI≤0: []
candidats = FILTRA(juvenils; pipeline.fora==true)  ORDENA per revelats asc, principal_potencial asc
DESPATXA = PRIMERS( MIN(excedent, |candidats|) )
   pipeline.fora = topat O sostreBaix;  topat=prAct≥prPot;  sostreBaix=prPot≤sostre_min(2)
```
**10b. `disposicioVenda`** (juvenil.js:60-64) — **CODI MORT** (cap crida).
**10c. Marcatge manual `cua_eixida`** — POST fotrem.js:65-74, sense càlcul.

| símbol | valor | origen | referència |
|---|---|---|---|
| objectiu (juvenil_objectiu) | 10 | pom | schema/028:13 |
| sostre_min / vendible_min / fabrica_min | 2 / 5 / 5 | fase_config (JSON) | schema/025:11 (defaults ??2/??5 fotrem.js:46-52) |
| criteri desempat | revelats asc, potencial asc | HARDCODEJAT | juvenil.js:51-53 |
| estats permesos | seguiment/elegit/cua_eixida | HARDCODEJAT + CHECK | fotrem.js:67, schema/012:6 |
| preu_esperat_min | 100000 | pom (**MORT**) | schema/028:14 |

**Discrepàncies**: (a) `disposicioVenda` + `preu_esperat_min` **morts** → la doctrina "promocionar-i-vendre vs despatx per barra de valor" **no s'executa**; `ranquingEixida` només ordena. (b) `ALR_JOVE_FORA_PIPELINE` gateja per `juvenil_objectiu ?? 10` (regles.js:196) mentre `ranquingEixida` usa `juvenil_objectiu` sense fallback (juvenil.js:47) → dos objectius si el pom falta.

---

## 11. Crida (disponibilitat + acceptació d'oferta)

**11a. Disponibilitat** `lib/crida.js:6-12` + `calendari.js:38-45`:
```
enrere = (getUTCDay(dataRef) − dia + 7) mod 7;  inici = dataRef − enrere;  fi = inici + 7 dies
gastada = COMPTA(crides WHERE usuari I data ≥ inici);  disponible = (gastada==0)
```
**11b. Acceptació d'oferta** `lib/fotrem.js:18-31` (per ofertes noves):
```
l = llindars[String(edat)];  SI cap: null;  SI l.mai: rebutja 'mai'
perPot = potencialMax≥l.potencial_min;  perComp = compostMax≥l.compost_min
SI perPot O perComp: accepta;  SINÓ SI l.per_defecte=='accepta': (compostMax<compost_min → 'fluix' sinó 'sense_dades');  SINÓ 'per_davall'
potencialMax/compostMax = MAX de les 7 habilitats
```

| símbol | valor | origen | referència |
|---|---|---|---|
| crida_reinici_dia | **6** (dissabte) | constant_joc | inserit 5 schema/032:8, UPDATE 6 schema/044:17 (fallback '5' crida.js:8) |
| crida_reinici_hora | 02:00 | constant_joc (**MORT**) | schema/044:18 (finestraCrida ignora l'hora) |
| llindars (crida_llindars) | `{15:{compost_min:3,per_defecte:accepta},16:{potencial_min:7,compost_min:6},17:{mai:true}}` | pom | schema/012:12, UPDATE 015:21-23 |
| HAB (7) | porteria…pilota_aturada | HARDCODEJAT | fotrem.js:5 |
| juvenil_crida_15/16 | 1, 2 | constant_joc (**MORT**) | schema/028:7-8 |

**Eixides**: `crida={disponible,oberta,caducitat,proxima}` → Fotrem + regles ALR_CRIDA_*; `avaluaCrida` → /api/oferta.
**Discrepàncies**: (a) `finestraCrida` usa **només el dia UTC** → `crida_reinici_hora`=02:00 **sense efecte** (reinici real 00:00 UTC dissabte). (b) fallback crida.js:8 ='5' (divendres) ≠ BD 6 (dissabte). (c) `avaluaCrida` s'aplica **també a juvenils de casa** malgrat el comentari "NOMÉS ofertes noves".

---

## 12. Estimacions de preu (preu proposat de venda)

`functions/api/vendes.js:67-88` + `lib/vendes.js:3-11`.
```
preu_comparable = proposaPreuEixida(comparables, jugador)
   ambPreu = FILTRA(preus_observats; preu≠null); mateixaPos = FILTRA(ambPreu; posicio=j.posicio)
   pool = SI(|mateixaPos|>0; mateixaPos; ambPreu);  preu_comparable = SI(pool buit; null; MEDIANA(pool.preu))
divisio    = PRIMER(plans_temporades.divisio_prevista DESC) SINÓ divisio_defecte('VII')
valorDefecte = estimacio_per_divisio[divisio] SINÓ config.params.valor_estimat_defecte SINÓ null
punts_i    = avaluaPuntuacio(vendaSpec, jugador);  mitjana = MITJANA(punts amb p>0)
preu_proposat = SI(preu_comparable≠null; preu_comparable;
                   SI(valorDefecte=null; null;
                      SI(mitjana≠null I punts_i>0; MAX(0, ARROD(valorDefecte·punts_i/mitjana)); valorDefecte)))
calibrat = (preu_comparable≠null)
```

| símbol | valor | origen | referència |
|---|---|---|---|
| estimacio_per_divisio | `{VII:2000,VI:8000,V:25000,IV:70000,III:180000,II:450000,I:1200000}` | constant_joc | schema/041:6-8 |
| divisio_defecte | VII | constant_joc | schema/041:9 |
| valor_estimat_defecte | 150000 | pom (plantilla) | schema/030:5 |
| cost_llistat / despatxar_llindar / setmanes_venda | 1000 / 0 / 3 | constant_joc | schema/037:6-8 |
| divisio (usuari) | declarada | pom | plans_temporades.divisio_prevista |
| MEDIANA / escalat / valor_net | fórmula | HARDCODEJAT | vendes.js:73-74,81 |

**Eixides**: `preu_proposat, calibrat, valor_net, despatxar, valor, tancament_previst` → Vendes + §4 (`valor` per retenir, `tancament_previst` per dies_subhasta).
**Discrepàncies**: (a) el **modificador de calendari de mercat NO s'aplica MAI numèricament** al preu (§13); només és senyal direccional. (b) **Vendes vs Economia**: la mateixa "venda prevista sense comparable" val ~2000 (div VII) a Vendes i 150000 a Economia (economia.js:90,102) — dues fórmules. (c) el pom `valor_estimat_defecte` (150000) està **mort** al camí de Vendes perquè el mapa per divisió sempre resol.

---

## 13. Calendari de mercat (finestres, quan llistar/vendre)

`lib/mercat.js:3-34` + doctrina de liquidació `lib/regles.js` (ALR_LLISTAR_VENDA).
```
modificador   = calendari_mercat[setmana(inst)].modificador_valor;  depressio = modificador < 0
finsRecuperacio = propModificador(cal,s,T,+1).dins        // recorre el cicle buscant mod>0
venda = FILTRA(jugadors; categoria='venda' I transferible≠1 I NO ja_llistat)
{llistables, lesionats} = conjuntLiquidacio(venda, cobertura)     // §4
PER lesionat: alerta llistar_lesionat (urg. 40)
PER llistable:
  urgAniv  = (0 ≤ any_dies − edat_dies ≤ dies_aniversari)
  urgDeprec = (posicio=posicio_porter I porteria ≥ porter_notable_min)
  SI( NO urgencia I depressio I modificador ≤ depressio_profunda ): AGENDA finestraLlistat; SEGÜENT
  SI urgencia: alerta llistar_ja (urg.72)  SINÓ afig a agregat (urg.55)
finestraLlistat: SI(depressio I finsRecuperacio≤esperaMax): data_tancament=vora+finsRecuperacio·7; data_llistat=data_tancament−dies_subhasta;  SINÓ hui / hui+dies_subhasta
```

| símbol | valor | origen | referència |
|---|---|---|---|
| calendari_mercat (16 setmanes) | S1-3 recup +.10/+.10/+.05 · S4-11 plena 0 (S11 −.05) · S12-16 depressió −.10/−.12/−.15/−.15/−.15 | pom (seed) | schema/007:12-17 |
| mercat_espera_max | 4 | constant_joc | schema/007:30 |
| any_dies / temporada_setmanes / dies_subhasta | 112 / 16 / 3 | constant_joc | schema/002:7-8, schema/033:4 |
| urgencia / normal / lesionat | 72 / 55 / 40 | pom (regla) | schema/049:6-8 |
| dies_aniversari / depressio_profunda / posicio_porter | 14 / −20 / PO | pom (regla) | schema/049:9,12,10 |
| mercat_modificadors_calibrats | no | constant_joc | schema/050:33-34 |

**Discrepàncies**: (a) **La branca "depressió profunda" no s'activa MAI**: `depressio_profunda=−20` (enter) vs `modificador` que mai baixa de `−0.15` (fracció) → **mismatch d'unitats**; l'ajornament per depressió és codi mort de facto, tot es llista hui excepte lesionats. (b) `porteria_deprecia=6` (schema/049:11) és mort: el codi usa `porter_notable_min`=7. (c) els modificadors estan marcats `calibrats='no'`.

---

## 14. Valor de plaça (a/b/ab)

`lib/valor_placa.js`.
```
posA = taula_entrenament[entrenament_a];  posB = taula_entrenament[entrenament_b]
PER bucket b: valor_placa[b] = SI(b∈posA I b∈posB;'ab'; SI(b∈posA;'a'; SI(b∈posB;'b';'cap')))
rangValor(v) = {ab:3, a:2, b:1, cap:0}
```

| símbol | valor | origen | referència |
|---|---|---|---|
| taula_entrenament | mapa 7 skills → buckets | constant_joc | schema/044:23-25 |
| entrenament_a / entrenament_b | creativitat / passades | pom (plantilla) | schema/044:28-29 |
| entrenament A/B efectius | pom SINÓ pipeline.principal/secundari | pom / IMPLÍCIT | functions/api/fotrem.js:35-36 |
| rangValor `{ab:3,a:2,b:1,cap:0}` | escala | HARDCODEJAT | valor_placa.js:19 |

**Eixides**: `valor_placa[bucket]` → **només** §8 (onze juvenil) i el comptador de personal (functions/api/personal.js:26). **No** alimenta §12 ni §13.
**Discrepàncies**: `taula_entrenament_baix` (50%, schema/053) NO entra al valor de plaça; `valorPlaces` només creua `taula_entrenament` (100%).

---

## 15. Agenda / alertes (motor de regles)

`lib/regles.js` (objecte `REGLES`: cada clau és `(ctx,p)→[alertes]`), orquestrat a `lib/orquestra_alertes.js`. Cada regla és **codi**; els llindars són **poms** (`regles_parametres`). L'orquestrador carrega només `activa=1` i, sense acadèmia, filtra tota regla `modul='juvenil'`.

**Regles actives** (codi · condició · urgència · fitxer):

| codi | condició (notació full) | urgència | fitxer:línia |
|---|---|---|---|
| ALR_ANIVERSARI | j.categoria='entrenable' I 0≤(any_dies−edat_dies)≤dies_avis(14) | 70 | regles.js:47-55 |
| ALR_LLISTAR_VENDA | sobre conjuntLiquidacio: lesionats→ajorna; urgent si aniv-vora O (porter I porteria≥porter_notable_min); depressió profunda→AGENDA; resta→agregat | 72/55/40 | regles.js:63-104 |
| ALR_LESIO_VENDA | v∈vendes_llistades I esLesionat | 80 | regles.js:108-113 |
| ALR_JUNTA_PORTER | posicio=PO I categoria='venda' I porteria≥porter_notable_min(7); exclou setmanes_club<2 O bonificacio_origen O lesionat | 90/45 | regles.js:136-150 |
| ALR_NUCLI_INCOMPLET | COMPTA(entrenable) < objectiu (=cobertura.entrenables_objectiu, IMPLÍCIT; pom 8 mort) | 60 | regles.js:155-161 |
| ALR_PROMOCIO_JUVENIL | 0<dies_restants_promocio≤dies_avis(7) | 75 | regles.js:171-173 |
| ALR_PLANTILLA_JUVENIL_MINIMA | COMPTA(juvenils)<minim(10) | 50 | regles.js:176-177 |
| ALR_CRIDA_JUVENIL | promocionen>0 I (total−promocionen)<minim(10) | 68 | regles.js:180-186 |
| ALR_JOVE_FORA_PIPELINE | fora>0 I crida.disponible I |juvenils|+1>juvenil_objectiu(⟂10) | 50 | regles.js:190-199 |
| ALR_JOVE_ESPECIALITAT | especialitat I (pipeline.fora O cua_eixida) | 48 | regles.js:204-207 |
| ALR_ENTRENAMENT_JUVENIL | principal=secundari no permès, O cap servix pipe | 55 | regles.js:210-223 |
| ALR_CRIDA_DISPONIBLE | crida.disponible=TRUE | 60 | regles.js:228-232 |
| ALR_JUVENIL_SOBRANT | |ranquingEixida(juvenils,obj)|>0 | 56 | regles.js:243-250 |
| ALR_REVELACIO_JUVENIL | r∈revelacions (2 últimes instantànies) | 40 | regles.js:254-256 |
| ALR_SENSE_CATEGORIA | NOT j.categoria | 40 | regles.js:270-272 |
| ALR_FINESTRA_VENDA_FORNADA | 0≤(temporada_eixida−temporadaActual)≤temporades_avis(1) | 65 | regles.js:275-282 |
| ALR_CANVI_FASE | 0<(temporada_inflexio−temporadaActual)≤temporades_avis(1) | 85 | regles.js:285-290 |
| ALR_COMPRA_ENTRENABLE | gaps rol='entrenable' I falten>0; pressupost=FLOOR((caixa−reserva)/Σfalten) | 72 | regles.js:293-305 |
| ALR_TRANSACCIO_PENDENT | j∈pendents_transaccio | 55 | regles.js:308-309 |
| ALR_PERSONAL_FASE | personal.desquadres no buit | 52 | regles.js:312-317 |
| ALR_TRAJECTORIA_INFLEXIO | economia.projeccio.arriba=FALSE (informatiu si sense_dades) | 70/35 | regles.js:322-333 |
| ALR_CONTRACTE_PERSONAL | setmanes_contracte≤setmanes_avis(2) | 58 | regles.js:336-339 |
| ALR_ENTRENAMENT_DESQUADRE | confirmat[k]≠prescrit[k] en {tipus,intensitat,resistencia} | 68 | regles.js:342-350 |
| ALR_SUPPORTER | 0≤(supporterCaducitat−dataInst)≤dies_avis(7) | 62 | regles.js:353-359 |
| ALR_FINESTRA_MERCAT | nucli_ple: FORTA si raw=prox.temporada−1 I depressio; nucli amb buit: FORTA si depressio | 58 | regles.js:366-390 |

**Inactives rellevants**: ALR_ENTRENABLE_SENSE_MINUTS, ALR_JUVENIL_SUPLENTS, ALR_CRIDA_SETMANAL, ALR_SUBHASTA_TANCA (totes activa=0). `ALR_REVELA_JUVENIL` i `ALR_DEPRECIACIO_MECANICA` sembrades **sense funció** a `REGLES` (no farien res ni actives).

**Ordenació / dedup de l'agenda**:
```
motor:   alertes.sort((a,b) ⇒ b.urgencia − a.urgencia)              // regles.js:400; ítems agenda urgencia=0
clau:    regla_codi | (jugador_id||'') | (data_accio||'')           // orquestra_alertes.js:230
conciliació no-agenda: existents que ja no ixen I estat≠ignorada → 'resolta'; clau existent → UPDATE preservant vista/ignorada; nova → INSERT 'nova'
agenda:  DELETE total estat='agenda' + reinsert complet cada revisió (derivada)
API:     alertes WHERE estat='nova' ORDER BY urgencia DESC,id  |  agenda WHERE estat='agenda' ORDER BY data_accio,id
```

**Discrepàncies**: (1) "aniversari a la vora" amb **dos poms** (dies_avis=14 a 006:15 i dies_aniversari=14 a 049:9) per al mateix concepte. (2) **posicio_porter='PO' definida en 3 fonts** (regla junta, regla llistar, plantilla cobertura). (3) `ALR_NUCLI_INCOMPLET`: pom `objectiu=8` mort, guanya el derivat de cobertura. (4) **10 juvenil en 3 conceptes** (minim, juvenil_objectiu, fallback hardcodejat regles.js:196). (5) `ALR_FINESTRA_MERCAT` pom `setmanes_avis=2` sembrat però **mai llegit**. Nota: `functions/api/falten.js` és **independent** del motor (llig finances.caixa + comptador personal; no toca regles/alertes).

---

## 16. Pressupost (per comprar entrenables)

`lib/regles.js:293-305` (ALR_COMPRA_ENTRENABLE).
```
caixa          = SI(finances.caixa≠NULL; finances.caixa; SUM(transaccions.import))
totalFalten    = Σ gap.falten  PER gap EN FILTRA(compra.filtres; rol='entrenable' I falten>0)
pressupost_gap = SI(caixa>0; MAX(0, FLOOR((caixa − reserva_operativa) / totalFalten)); NUL)
```
El pressupost es reparteix **a parts iguals** entre tots els forats (divisor = total agregat).

| símbol | valor | origen | referència |
|---|---|---|---|
| caixa (real) | declarada | pom (BD) | taula `finances` / schema/021:6-13 |
| caixa (derivada) | SUM(import) | IMPLÍCIT | economia.js:20,23 |
| reserva_operativa | 50000 | pom | schema/015:14 (default '0' orquestra_alertes.js:182) |
| compra_edat_max / creativitat_min / posicions | 18 / 6 / ["MC","ED","EE"] | pom | schema/011:17-18, schema/014:12 (defaults 18/6/["MC"]) |
| MAX(0, floor) | 0 | HARDCODEJAT | regles.js:300 |

**Discrepàncies**: `reserva_operativa` es resta **ací** però NO entra a l'objectiu de capital ni a la projecció (§17). El default de codi ('0') difereix del pom (50000): si el pom s'esborra, la reserva cau silenciosament a 0.

---

## 17. Projecció econòmica (objectiu de capital + trajectòria)

`lib/economia.js:51-131` + `lib/capital.js:5-36`.
```
objectiu = SI(params.capital_objectiu≠NUL; params.capital_objectiu; reconversio+fitxatges+coixiSou)
   sostre = SI(|preus_observats|>0; MEDIANA(preu); inflexio_sostre_fitxatge)
   fitxatges = ARROD(inflexio_fitxatges_n · sostre);  coixiSou = SI(nomina≠NUL; ARROD(inflexio_setmanes_coixi·nomina);0)
   reconversio = inflexio_cost_reconversio
despesaTotal   = nomina + despesa_planter + despesa_estadi + personalSetmanal
balancSetmanal = SI(ingres_setmanal≠NUL; ingres_setmanal − despesaTotal; NUL)
setmanes       = MAX(0, setmanesEntre(inst.data, dataDeTemporada(temporada_inflexio)))
vendesPrevistes = Σ (v.preu_eixida SINÓ proposaPreuEixida SINÓ valor_estimat_defecte)  PER v∈vendes(pendent,llistat)
fornadesPrevistes = COMPTA_DIST(eixides_fornada futures) · valorFornada   [valorFornada=MITJANA marges reals SINÓ valor_fornada_estimat]
caixaProjectada = caixa + balancSetmanal·setmanes + (vendesPrevistes + fornadesPrevistes)
arriba          = caixaProjectada ≥ objectiu
```

| símbol | valor | origen | referència |
|---|---|---|---|
| inflexio_cost_reconversio / fitxatges_n / sostre_fitxatge / setmanes_coixi | 430000 / 2 / 200000 / 8 | pom | schema/019:5-8 |
| valor_estimat_defecte / valor_fornada_estimat | 150000 / 300000 | pom | schema/030:5-6 |
| capital_objectiu (manual) / temporada_inflexio | 430000 / 88 | pom (plans) | schema/009:6 |
| ancora_data / ancora_temporada / any_dies / temporada_setmanes | 2026-07-25 / 83 / 112 / 16 | constant_joc | schema/002:7-11 |
| pom() default | 0 | HARDCODEJAT | capital.js:8-10, economia.js:89-91 |

**Eixides**: `projeccio{objectiu, caixa, falta, caixa_projectada, arriba, ingres_estimat, sense_dades_venda}` → ALR_TRAJECTORIA_INFLEXIO + vista economia.
**Discrepàncies**: (a) **objectiu manual (430k) ≠ objectiu estimat**: el manual = només el component `reconversio`; l'estimat suma reconversio+fitxatges+coixiSou (molt superior). (b) `reserva_operativa` (50000) **no es descompta** de l'objectiu ni de la projecció (només §16). (c) `capital.js` fa `parseFloat`, `economia.js` fa `parseInt`, dels **mateixos poms**. (d) `nomina` ve de la instantània mentre `personalSetmanal` ve de `personal_membres` — dues fonts de "cost de sous".

---

## 18. Personal (staff esperat, cost, desquadres)

`lib/personal.js` + `functions/api/personal.js` + `orquestra_alertes.js:154-166`.
```
compteEspecialistes = COMPTA per tipus DE personal_membres ON rol='especialista' I tipus≠NUL   // entrenador NO compta
esperat      = fases_config[plantilla, fase_actual].config.personal
desquadres   = PER (clau,val)∈esperat: SI((compte[clau]??0)≠val) → {clau, esperat:val, declarat}
checklist(f) = {personal: comparaPersonal(f.personal, compte), canvis: f.canvis, cost_total: Σ canvi.cost}
```

| símbol | valor | origen | referència |
|---|---|---|---|
| esperat fàbrica / inflexió / competitiu | `{assistents:2,metge:1,psicoleg:0}` / `…psicoleg:1` / `…psicoleg:1` | pom (fases_config) | schema/013:10-15 |
| canvis inflexió (cost_total) | 430000 | pom | schema/013:13 |
| declarat per defecte | 0 | HARDCODEJAT | personal.js:6 |
| ROLS vàlids | `['entrenador','especialista']` | HARDCODEJAT | functions/api/personal.js:9 |
| setmanes_avis contracte | 2 | pom (regla) | schema/023:18 |

**Eixides**: `desquadres, checklists[].cost_total, entrenament` → ALR_PERSONAL_FASE, ALR_CONTRACTE_PERSONAL, ALR_ENTRENAMENT_DESQUADRE. `cost_total` → §19.
**Discrepàncies**: (a) el **cost dels sous reals** (personal_membres.sou) i el **cost del canvi de fase** (fases_config.canvis[].cost) són universos separats. (b) el desquadre es calcula **dues vegades** (functions/api/personal.js:42 per a la vista + orquestra_alertes.js:161-163 per a l'alerta), amb el compte reimplementat inline. (c) l'`entrenador` mai entra al desquadre (només especialistes amb `tipus`).

---

## 19. Transicions del pla (fases)

`lib/pla.js:4-49` (estat) + `functions/api/pla.js` (mutació) + `regles.js:285-289` (avís).
```
temporadaActual = inst.temporada + SI(inst.setmana_temporada ≥ temporada_setmanes; 1; 0)
estat(fila)     = SI(temporadaActual=NUL;'futura'; fila.temporada<temporadaActual;'passada'; =;'actual'; 'futura')
ALR_CANVI_FASE  = SI(0 < (temporada_inflexio − temporadaActual) ≤ temporades_avis) → alerta
```
**La transició de fase és 100% MANUAL**: `plans.fase_actual` només canvia via `POST /api/pla` amb `cos.fase_actual`. `accions_previstes.canvi_fase:"inflexio"` a T88 és **dada mostrada, mai llegida per avançar la fase** (cap codi llig `canvi_fase`).

| símbol | valor | origen | referència |
|---|---|---|---|
| fase_actual (inicial) | 'fabrica' | pom (plans) | schema/009:4 |
| mode per temporada | fabrica/inflexio/competitiu | pom (plans_temporades) | schema/009:8-25 |
| temporada_inflexio | 88 | pom (plans) | schema/009:6 |
| temporada_setmanes | 16 | constant_joc | schema/002:8 (default '16' pla.js:8) |
| temporades_avis / urgencia (canvi fase) | 1 / 85 | pom (regla) | schema/009:34-35 |
| MERGE params permesos | 7 claus fixes | HARDCODEJAT | functions/api/pla.js:25 |
| categoria 'entrenable' (retard) | 'entrenable' | HARDCODEJAT | pla.js:25 |

**Eixides**: `estatPla{fase_actual, temporadaActual, temporades[]{estat,retard}}` + ALR_CANVI_FASE. `fase_actual` és **entrada de TOTS** els altres punts (personal esperat, entrenament prescrit).
**Discrepàncies**: (a) **`mode` de la fila ≠ `plans.fase_actual`**: T88 té `mode='inflexio'` però `fase_actual` roman `'fabrica'` fins que l'usuari el canvie a mà → dos indicadors de fase que poden divergir indefinidament. (b) `temporada_inflexio` (88, en params) ≠ la fila amb `mode='inflexio'` (també 88, en plans_temporades): mateixa fita en dos llocs sense garantia de coincidir. (c) `temporadaActual` es recalcula en **3 llocs** (pla.js:11, orquestra_alertes.js:79, calendari.js via economia.js:87).

---

# (a) HARDCODEJAT i IMPLÍCIT — per gravetat

## HARDCODEJAT

**ALTA**
- Filtre de visibilitat `estat='nova'` al GET d'alertes: vista/ignorada/resolta/agenda **no ixen** → `functions/api/alertes.js:10`

**MITJA**
- `posicio_porter='PO'` sense seed a plantilles_parametres per 'fabrica'; sempre cau al literal → orquestra_classificacio.js:25, cobertura.js:39,57, vendes.js:103
- `HABILITATS` (7 skills) cablejat al motor universal → classificador.js:10
- `COIXI={alliberament,despatx,despatxat}` literal → cobertura.js:22
- `resta_ocupacio_exclou=['entrenable']` injectat en codi, no pom → orquestra_classificacio.js:29
- Llista blanca override manual (7 categories) ha de coincidir amb el seed → functions/api/categoria.js:4
- Llindar pct 100 (separa buckets 50/100) → alineacio.js:56-57
- Bucket 'davanter' del futur entrenador / 'porter' de farciment cablejats → alineacio.js:82 / 94,96
- Valors 100/50 d'efecte d'entrenament → entrenament_places.js:15-16
- Defaults numèrics duplicats dels poms (pes_a=1, pes_b=0.66, f_marge=0.5, marge_esperat=3, VE=5; minim=9, potencial_esperat=6) → ranquing_juvenil.js:59, alineacio_juvenil.js:15-17
- Fallback `crida_reinici_dia='5'` ≠ valor BD 6 → crida.js:8
- `ROLS=['entrenador','especialista']` validador POST → functions/api/personal.js:9
- `MERGE`=7 claus fixes de params del pla editables → functions/api/pla.js:25
- Ordre del motor per urgència DESC / ordre SQL de l'API → regles.js:400 / alertes.js:11,18
- Clau de dedup `codi|jugador|data_accio` → orquestra_alertes.js:230

**BAIXA**
- rangValor `{ab:3,a:2,b:1,cap:0}` / ordreBucket visual / EPS=1e-9 → valor_placa.js:19, alineacio_juvenil.js:95,12
- fornada per defecte 99 / pct per defecte 100 / fallback suspensio '3' / llindar cobertura 100 → alineacio.js:67,71,56-57,152, orquestra_alineacio.js:37
- ESTATS venda literals / valVenda fallback / fallbacks econòmics 1000/0/3 → vendes.js:11,51,56-58
- CAMPS_JUSTIF='classif' / missatge_clau='agenda.llistar' / moviment_caducitat '7' → orquestra_classificacio.js:32, vendes.js:63, intercanvis.js:17
- defaults compra 18/6/["MC"] → functions/api/mercat.js:26-28
- farciment pressupost = caixa·0.1 (10%) fix → lib/mercat_cerca.js:53
- `pom()`→0 defaults (emmascaren poms absents) → capital.js:8-10, economia.js:89-91
- MAX(0,floor) sòl de pressupost / declarat=0 desquadre → regles.js:300, personal.js:6
- TIPUS transacció (9) + INGRESSOS (3) / categoria literals pla → transaccions.js:5, economia.js:8, pla.js:25
- default temporada_setmanes '16' repetit → pla.js:8, economia.js:87
- informatiu=ROUND(urgencia/2) (traj. i junta porter) → regles.js:327,147
- llista camps desquadre {tipus,intensitat,resistencia} → regles.js:345
- finestra "subhasta tanca" dies≤1 → regles.js:124
- constants fallback (any_dies 112, temp_setmanes 16, porter_notable_min 7, dies_subhasta 3) → orquestra_alertes.js:22,23,26,122

## IMPLÍCIT

**ALTA**
- Prioritat entre categories = ORDENA per 'ordre'; cap número explícit de prioritat → classificador.js:66
- Els `entrena/pct` de la llavor 'formacio' són **morts**: sempre sobreescrits per aplicaEntrenament → orquestra_alineacio.js:21 (vs schema/008:12-16)
- Farciment: el `requisit` per bucket **desapareix** perquè farcimentDerivat torna només {n} → cobertura.js:64-68 via orquestra_classificacio.js:26
- "1 promoció/setmana" = únic `millor`; `promocio_max_setmana` no llegit → ranquing_juvenil.js:53
- `crida_reinici_hora` **sense efecte**: finestra per dia sencer UTC → calendari.js:38-45
- `disposicioVenda` + `preu_esperat_min` **morts**: "vendre vs despatxar" no s'executa → juvenil.js:60-64
- Modificador de calendari de mercat **MAI aplicat** al preu (només senyal de timing) → lib/mercat.js + functions/api/vendes.js (absència)
- Branca "depressió profunda" **inassolible**: −20 (enter) vs mín −0.15 (fracció) → ajornament mort → regles.js:84, schema/049:12, schema/007
- Transició de fase **MAI automàtica**; `accions_previstes.canvi_fase` dada morta → schema/009:19 vs functions/api/pla.js:36
- Objectiu real d'ALR_NUCLI_INCOMPLET derivat de `ctx.cobertura.entrenables_objectiu`, no del pom(8) → regles.js:156

**MITJA**
- `resta_ocupacio`: ocupació d'altres categories emergix de l'ordre d'iteració → classificador.js:89
- `futur_entrenador` 0/1 emergix de l'EXISTÈNCIA d'una fila categoria aforament≥1 → vendes.js:98,101
- `skill=null` → cap entrenament ni avís "no configurat" → entrenament_places.js:33-35
- 'competitiu' = primer rol si cap té competitiu=true → alineacio.js:26
- VE del component B calculat amb actuals de A dins el NIVELL → ranquing_juvenil.js:33,60
- `bonus_club_mare`=1.5 declarat però **mai aplicat** → schema/044:11
- Objectiu manual (430k) = només component 'reconversio'; l'estimat és molt major → economia.js:55 vs capital.js:27
- 'temporada actual' calculada en 3 llocs → pla.js:11, orquestra_alertes.js:79, calendari.js:51
- `reserva_operativa` només afecta pressupost de compra, no objectiu ni projecció → orquestra_alertes.js:182 vs economia.js:55-58
- 'cost de sous' de dues fonts barrejades (instantània vs personal_membres) → economia.js:44
- `valor` de retenció = punts ?? preu_proposat: barreja puntuació i preu → vendes.js:84
- Entrenament A/B cau a pipeline.principal/secundari quan no hi ha pom → functions/api/fotrem.js:35-36
- Conjunt llistable/lesionats derivat per `conjuntLiquidacio` (font única amb Vendes) → regles.js:72
- `ranquingEixida`/`freSuplents` decidixen sobrants/suplents → regles.js:246,265
- Revelacions detectades comparant 2 últimes instantànies juvenils → orquestra_alertes.js:59
- `situacioMercat` / `economia.projeccio` derivats → orquestra_alertes.js:87,119

**BAIXA**
- Categoria terminal captura qui no ha agafat plaça (sense número) → classificador.js:130
- Divisió d'estimació = cadena plans_temporades → divisio_defecte → vendes.js:41-42
- `cos_camp`/`cos_porter` derivats per COUNT SQL, separat del 'total' de cobertura → vendes.js:105-115
- `avaluaCrida` s'executa també per juvenils de casa malgrat el comentari → functions/api/fotrem.js:74
- `parseFloat` (capital.js) vs `parseInt` (economia.js) per als mateixos poms → capital.js:8 vs economia.js:89
- Caixa real declarada té prioritat silenciosa sobre SUM(transaccions) → economia.js:22-23
- Desquadre de personal calculat 2 vegades (API + orquestrador) → personal.js:42, orquestra_alertes.js:163
- `config.params.valor_estimat_defecte` (150000) mort al camí de Vendes → vendes.js:44
- `maxims_posicio` mai mossega (cap() limita per formació) → alineacio_juvenil.js
- Repartiment de `simples` per i/n100 assumeix ordreRols cobreix índexs (partit pot ser null) → alineacio.js:75-77

---

# (b) Graf de dependències (arestes)

```
# Sènior
entrenament_senior -> alineacio_senior : places{bucket→pct} (config.slots)         [orquestra_alineacio.js:20-21]
entrenament_senior -> alineacio_senior : buckets50/100, n50/n100 (doblatge)         [alineacio.js:56-59]
entrenament_senior -> cobertura        : slots/pct (entrenables_objectiu)           [cobertura.js:85]
tipus_setmana(pla) -> alineacio_senior : rols_actius/copa                           [orquestra_alineacio.js:26-31]
vendes/transferible -> alineacio_senior: llistat (exclou de disp)                   [orquestra_alineacio.js:53,61]
alineacio_senior   -> cobertura_entren : comptabilitat + avisos                     [alineacio.js:119-164]

# Nucli classificació
classificacio -> reconciliacio : ideal[{id,categoria,puntuacio}] + fixats manuals   [orquestra_classificacio.js:82]
cobertura     -> classificacio : places de farciment derivades (farcimentDerivat)   [orquestra_classificacio.js:26]
cobertura     -> retencio      : camp_minim, porters_minims                         [vendes.js:99-117]
classificacio -> liquidacio    : pertinença a categoria 'venda'
retencio      -> liquidacio    : ids retinguts (retencioCobertura.ids)              [liquidacio.js:20]
cobertura     -> liquidacio    : retinguts_camp/porters, sou_total                  [vendes.js]
reconciliacio -> liquidacio    : desplaçats caiguts a 'venda'/'alliberament'

# Preu / mercat
estimacio_preu -> liquidacio/calendari : valor (punts??preu_proposat) → conjuntLiquidacio  [vendes.js:84]
estimacio_preu -> calendari            : tancament_previst = data_llistada + dies_subhasta  [vendes.js:52]
calendari      -> compra               : mercat.depressio + pla.proxima_eixida → finestra   [regles.js:366-386]
valor_placa    -> onze_juvenil         : valor_placa/valorEntrenable                        [functions/api/fotrem.js:53]
valor_placa    -> personal             : comptador                                          [functions/api/personal.js:26]

# Juvenils
NIVELL   -> promocio : rang (nivell/posicio_rang)
NIVELL   -> onze     : nivell per jugador
NIVELL   -> eixida   : posicio_rang alimenta cua
promocio -> eixida   : flag cua
crida    -> eixida   : crida.disponible gateja ALR_JOVE_FORA_PIPELINE
crida    -> extern   : avaluaCrida → /api/oferta (veredicte oferta nova)

# Econòmica / pla
transicions_pla -> personal   : fase_actual (esperat de personal + entrenament prescrit)    [pla.js:5 → personal API:20-23]
transicions_pla -> projeccio  : temporada_inflexio + eixides_fornada                        [economia.js:107-120]
personal        -> projeccio  : personal_membres.sou (personalSetmanal) + nomina            [economia.js:41,44]
personal        -> transicions_pla : checklistCanviFase.cost_total                          [personal.js:16-18]
projeccio       -> pressupost : caixa (mateixa font eco.caixa)                              [economia.js:23 → orquestra_alertes.js:182]
pressupost      -> alerta_compra : reserva_operativa + caixa → pressupost per gap           [regles.js:300]
projeccio       -> alerta_traj : projeccio.arriba/caixa_projectada → ALR_TRAJECTORIA_INFLEXIO
transicions_pla -> alerta_fase : temporada_inflexio − temporadaActual → ALR_CANVI_FASE

# Agenda (consumidor final de gairebé tot)
cobertura     -> agenda : entrenables_objectiu, cos_camp/porter, posicio_porter
liquidacio    -> agenda : conjunt llistables/lesionats (ALR_LLISTAR_VENDA)
mercat        -> agenda : depressio/modificador/finsRecuperacio
economia      -> agenda : projeccio.arriba, caixa, sense_dades_venda
mercat_cerca  -> agenda : filtres de compra + falten (ALR_COMPRA_ENTRENABLE)
fotrem        -> agenda : pipeline.fora (ALR_JOVE_FORA_PIPELINE/ESPECIALITAT)
juvenil       -> agenda : revelacions, ranquingEixida, freSuplents
crida         -> agenda : disponible/caducitat (ALR_CRIDA_*)
personal      -> agenda : desquadres, setmanes_contracte
entrenament   -> agenda : prescrit vs confirmat vs juvenil (ALR_ENTRENAMENT_*)
pla           -> agenda : fornades, temporadaInflexio, supporterCaducitat
classificador -> agenda : categoria i puntuacio
agenda        -> parte_UI : taula alertes (estat='nova') + subsecció Agenda (estat='agenda')
agenda        -> economia : ALR_TRANSACCIO_PENDENT resolta via /api/motius (crea transacció)
```

---

# (c) Recompte: fórmula pura sobre poms vs codi amb números

| # | Punt | Classificació |
|---|---|---|
| 1 | Classificació de categories | **mixt** — motor pur config-driven, però HABILITATS + resta_ocupacio_exclou injectats en codi i prioritat implícita per `ordre` |
| 2 | Cobertura mínima | **fórmula pura sobre poms** (amb defaults hardcodats idèntics: porters_minims=2, bucket_porter) |
| 3 | Retenció / farciment | **codi amb números** — COIXI, posicio_porter, resta_ocupacio_exclou hardcodats |
| 4 | Liquidació / despatx | **mixt** — llindars = constant_joc; ESTATS + doble valor-defecte hardcodats |
| 5 | Alineació sènior | **codi amb números** — pct100, buckets futur/porter, fornada99, competitiu implícit |
| 6 | Entrenament sènior | **codi amb números** — taules = constant_joc però 100/50 i skill=null hardcodats |
| 7 | NIVELL juvenil | **fórmula pura sobre poms** (defaults = poms) |
| 8 | Onze juvenil | **codi amb números** — rangValor, EPS, ordreBucket, defaults hardcodats |
| 9 | Promoció | **mixt** — edat/dies = constant_joc; límit "1" implícit |
| 10 | Eixida juvenil | **codi amb números** — criteri desempat hardcodat + 2 mecanismes morts |
| 11 | Crida | **mixt** — llindars = pom; HAB + hora morta + fallback dia divergent hardcodats |
| 12 | Estimació de preu | **mixt** — constant_joc + fórmula d'escalat hardcodada; modificador de mercat ignorat |
| 13 | Calendari de mercat | **codi amb números** — poms + finestres hardcodades + branca depressió morta |
| 14 | Valor de plaça | **mixt** — taula = constant_joc; rangValor hardcodat |
| 15 | Agenda / alertes | **mixt** — mecanisme = codi (25 regles), llindars = poms; ordenació/dedup hardcodats |
| 16 | Pressupost | **mixt** — reserva = pom; FLOOR + repartiment hardcodats |
| 17 | Projecció econòmica | **mixt** — components = poms; parse/defaults hardcodats + doble objectiu |
| 18 | Personal | **mixt** — esperat = pom (fases_config JSON); ROLS + doble càlcul hardcodats |
| 19 | Transicions del pla | **codi amb números** — 100% manual; MERGE 7 claus + params list hardcodats; canvi_fase mort |

**Resum:**
- **Fórmula pura sobre poms: 2** (§2 Cobertura mínima, §7 NIVELL juvenil) — i tots dos amb defaults hardcodats que **dupliquen** els poms.
- **Mixt (fórmula sobre poms/constants amb números o llistes cablejades en codi): 11** (§1, §4, §9, §11, §12, §14, §15, §16, §17, §18).
- **Codi amb números dins (la lògica o els llindars clau viuen en codi): 6** (§3, §5, §6, §8, §10, §13, §19).

> Cap punt és 100% "full de càlcul sobre poms": fins i tot els dos purs porten defaults duplicats en codi, i el nucli sencer depén de la doctrina IMPLÍCITA de l'`ordre` de categories (§1) i de la sobreescriptura de la formació per l'entrenament (§5/§6). **Codi mort/inassolible detectat**: `disposicioVenda`, `preu_esperat_min`, `promocio_max_setmana`, `bonus_club_mare`, `crida_reinici_hora`, `juvenil_crida_15/16`, la branca de "depressió profunda" (mismatch d'unitats −20 vs −0.15), `accions_previstes.canvi_fase`, i els poms `objectiu`(nucli 8) / `setmanes_avis`(finestra mercat) / `porteria_deprecia`(6).
