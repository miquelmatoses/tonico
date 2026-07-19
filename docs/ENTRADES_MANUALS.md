# Tonico — inventari d'entrades manuals

Tot el que Tonico espera que l'usuari introduïsca a mà. Base per a la revisió
d'usabilitat (no s'ha tocat cap UI encara). Estat: ✅ té UI · ⚠️ buit (endpoint
sense pantalla o funció no construïda).

| # | Camp / dada | Pàgina | Per a què | Si està buit | Freqüència | Estat |
|---|---|---|---|---|---|---|
| 1 | Correu + contrasenya | `/registre` | Tindre compte | No es pot usar l'app | Una volta | ✅ |
| 2 | Nom sènior + juvenil (+id Hattrick opc.) | `/onboarding` | Crear els equips i el pla | No es pot pujar res | Una volta | ✅ |
| 3 | CSV sènior + juvenil | `/pujada` | Alimentar tot el sistema | Sense dades, sense parte | **Setmanal** | ✅ |
| 4 | Vist / Ignora alertes | `/esta-setmana` | Gestionar l'informe de Paco | Les alertes queden «noves» | Setmanal | ✅ |
| 5 | Fixar / Vetar alineació | `/alineacio` | Override de l'onze | S'usa la proposta auto | Setmanal (opc.) | ✅ |
| 6 | Fornada (lletra) per entrenable | `/plantilla` | Override de la fornada auto | S'usa l'auto per horitzó d'eixida | Quan toque | ✅ |
| 7 | Fase, temp. inflexió, capital objectiu, divisió/mode | `/pla` | Pla mestre i projeccions | Capital → projecció «per definir» | Ocasional | ✅ |
| 8 | Transaccions (tipus, import, jugador, data, nota) | `/economia` | Caixa, marges, projecció | Sense economia; ALR_TRANSACCIO_PENDENT | Setmanal | ✅ |
| 9 | Preus observats (posició, edat, habilitat, preu) | `/mercat` | Calibrar expectatives i sostre de pressupost | Sostre = pom manual | Quan toque | ✅ |
| 10 | Decisió juvenil (seguiment/elegit/cua d'eixida) | `/fotrem` | Gestió de l'acadèmia | Tots en «seguiment» | Quan toque | ✅ |
| 11 | Personal declarat (assistents, metge, psicòleg) | `/personal` | Quadrar amb la fase | No declarat = 0 → ALR_PERSONAL_FASE | Ocasional | ✅ |

## Buits detectats (per a la revisió d'usabilitat)

- ⚠️ **Override manual de CATEGORIA**: l'endpoint `/api/categoria` existix (fixa
  origen='manual'), però NO hi ha control a la pàgina de plantilla per fer-ho. Ara
  mateix només es pot corregir una categoria per API. **Cal afegir el selector a
  `/plantilla`.**
- ⚠️ **Motiu de baixa**: quan un jugador desapareix queda `estat='pendent_de_motiu'`,
  però NO hi ha formulari per declarar el motiu (venda/alliberament/promoció) ni per
  enllaçar una promoció amb la seua fila juvenil d'origen (`jugador_origen_juvenil_id`).
  Paco ho reclama (ALR_TRANSACCIO_PENDENT) però no hi ha on resoldre-ho a la UI.
  **Cal un formulari de motius de baixa.**
- ⚠️ **Reserva operativa i sostres de pressupost per perfil**: són poms de BD
  (`reserva_operativa`), sense pantalla d'edició; ara només es canvien per SQL.
- ⚠️ **Avaluador de crides d'ofertes noves**: la lògica existix (`avaluaCrida`) però
  no hi ha pantalla per avaluar un candidat a fitxar (només s'usava, mal, per als de
  casa; ja s'ha llevat d'allí). **Cal una pantalla d'ofertes.**
