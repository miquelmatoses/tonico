// Shim mínim compatible amb D1 sobre node:sqlite, per a proves.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

class Stmt {
  constructor(sqlite, sql) { this.sqlite = sqlite; this.sql = sql; this.args = []; }
  bind(...a) { this.args = a; return this; }
  async first() { return this.sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.sqlite.prepare(this.sql).all(...this.args) }; }
  async run() { this.sqlite.prepare(this.sql).run(...this.args); return {}; }
}

export class D1 {
  constructor(sqlite) { this.sqlite = sqlite; }
  prepare(sql) { return new Stmt(this.sqlite, sql); }
  async batch(stmts) { for (const s of stmts) this.sqlite.prepare(s.sql).run(...s.args); }
}

// Crea una D1 en memòria amb l'esquema i la llavor aplicats.
export function nova(baseUrl) {
  const src = (p) => readFileSync(new URL(p, baseUrl), 'utf8');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec(src('../schema/001_esquema.sql'));
  sqlite.exec(src('../schema/002_llavor.sql'));
  sqlite.exec(src('../schema/003_classificacio.sql'));
  sqlite.exec(src('../schema/004_llavor_fabrica.sql'));
  sqlite.exec(src('../schema/005_fornada_eixida.sql'));
  sqlite.exec(src('../schema/006_regles.sql'));
  sqlite.exec(src('../schema/007_mercat_revisions.sql'));
  sqlite.exec(src('../schema/008_alineacio.sql'));
  sqlite.exec(src('../schema/009_pla_mestre.sql'));
  sqlite.exec(src('../schema/010_economia.sql'));
  sqlite.exec(src('../schema/011_mercat_cerca.sql'));
  sqlite.exec(src('../schema/012_fotrem.sql'));
  sqlite.exec(src('../schema/013_personal.sql'));
  sqlite.exec(src('../schema/014_entrenable_pla.sql'));
  sqlite.exec(src('../schema/015_polit.sql'));
  sqlite.exec(src('../schema/016_polit2.sql'));
  sqlite.exec(src('../schema/017_columnes_csv.sql'));
  sqlite.exec(src('../schema/018_moviments.sql'));
  sqlite.exec(src('../schema/019_capital.sql'));
  sqlite.exec(src('../schema/020_rols_partit.sql'));
  sqlite.exec(src('../schema/021_finances.sql'));
  sqlite.exec(src('../schema/022_taxa_llistat.sql'));
  sqlite.exec(src('../schema/023_personal_membres.sql'));
  sqlite.exec(src('../schema/024_estructura.sql'));
  sqlite.exec(src('../schema/025_entrenament.sql'));
  sqlite.exec(src('../schema/026_juvenil_pipeline.sql'));
  sqlite.exec(src('../schema/027_vendes.sql'));
  sqlite.exec(src('../schema/028_juvenil_v2.sql'));
  sqlite.exec(src('../schema/029_parte_academia.sql'));
  sqlite.exec(src('../schema/030_projeccio_vendes.sql'));
  sqlite.exec(src('../schema/031_moviments_caducitat.sql'));
  sqlite.exec(src('../schema/032_crida_rellotge.sql'));
  sqlite.exec(src('../schema/033_subhasta_onze.sql'));
  sqlite.exec(src('../schema/034_junta_porteria.sql'));
  sqlite.exec(src('../schema/035_alerta_data_accio.sql'));
  sqlite.exec(src('../schema/036_alertes_agenda.sql'));
  sqlite.exec(src('../schema/037_despatxar.sql'));
  sqlite.exec(src('../schema/038_lesio_venda.sql'));
  sqlite.exec(src('../schema/039_formacio_juvenil.sql'));
  sqlite.exec(src('../schema/040_depreciacio.sql'));
  sqlite.exec(src('../schema/041_estimacio_divisio.sql'));
  sqlite.exec(src('../schema/042_dolorit.sql'));
  sqlite.exec(src('../schema/043_mc_entrenament.sql'));
  sqlite.exec(src('../schema/044_constants_juvenil_v3.sql'));
  sqlite.exec(src('../schema/045_nivell_juvenil.sql'));
  sqlite.exec(src('../schema/046_retira_dolorit.sql'));
  sqlite.exec(src('../schema/047_potencial_esperat.sql'));
  sqlite.exec(src('../schema/048_llistat_derivat.sql'));
  sqlite.exec(src('../schema/049_liquidacio.sql'));
  sqlite.exec(src('../schema/050_correccio_auditoria.sql'));
  sqlite.exec(src('../schema/051_cobertura_v2.sql'));
  sqlite.exec(src('../schema/052_alliberament_puntua.sql'));
  sqlite.exec(src('../schema/053_entrenament_baix.sql'));
  sqlite.exec(src('../schema/054_fora_subhasta_tanca.sql'));
  sqlite.exec(src('../schema/055_cobertura_lean.sql'));
  sqlite.exec(src('../schema/056_retirada_fabrica.sql'));
  sqlite.exec(src('../schema/057_config_v3.sql'));
  sqlite.exec(src('../schema/058_economia_v3.sql'));
  sqlite.exec(src('../schema/059_pesos_salaris.sql'));
  sqlite.exec(src('../schema/060_rols_v3.sql'));
  sqlite.exec(src('../schema/061_preu_v3.sql'));
  sqlite.exec(src('../schema/062_onze_v3.sql'));
  sqlite.exec(src('../schema/063_juvenil_v3.sql'));
  sqlite.exec(src('../schema/064_personal_v3.sql'));
  sqlite.exec(src('../schema/065_estoc_v3.sql'));
  sqlite.exec(src('../schema/066_informe_v3.sql'));
  sqlite.exec(src('../schema/067_prescripcio_v3.sql'));
  sqlite.exec(src('../schema/068_alerta_diners.sql'));
  sqlite.exec(src('../schema/069_personal_vocabulari.sql'));
  sqlite.exec(src('../schema/070_alerta_compte.sql'));
  sqlite.exec(src('../schema/071_v31_economia_personal.sql'));
  sqlite.exec(src('../schema/072_economia_quatre_camps.sql'));
  sqlite.exec(src('../schema/073_caixa_i_dies.sql'));
  sqlite.exec(src('../schema/074_taula_salaris_divi.sql'));
  sqlite.exec(src('../schema/075_historic_setmanes.sql'));
  sqlite.exec(src('../schema/076_contracte_data.sql'));
  sqlite.exec(src('../schema/077_personal_guia.sql'));
  sqlite.exec(src('../schema/078_alertes_estructura.sql'));
  sqlite.exec(src('../schema/079_obra_i_contracte_dies.sql'));
  sqlite.exec(src('../schema/080_obra_estats.sql'));
  sqlite.exec(src('../schema/081_fora_desquadre_entrenament.sql'));
  sqlite.exec(src('../schema/082_formacio_253.sql'));
  sqlite.exec(src('../schema/083_escala_habilitats.sql'));
  sqlite.exec(src('../schema/084_grups_derivats.sql'));
  sqlite.exec(src('../schema/085_velocitat_entrenament.sql'));
  sqlite.exec(src('../schema/086_seccio_entrenament.sql'));
  sqlite.exec(src('../schema/087_finestra_entrenable.sql'));
  sqlite.exec(src('../schema/088_preus_referencia.sql'));
  sqlite.exec(src('../schema/089_fora_poms_fabrica.sql'));
  sqlite.exec(src('../schema/090_fora_categories.sql'));
  sqlite.exec(src('../schema/091_fora_sense_categoria.sql'));
  sqlite.exec(src('../schema/092_neteja_config.sql'));
  sqlite.exec(src('../schema/093_futur_entrenador_pom.sql'));
  sqlite.exec(src('../schema/094_fora_regles_apagades.sql'));
  sqlite.exec(src('../schema/095_taules_orfes.sql'));
  sqlite.exec(src('../schema/096_porter_suplent_llindar.sql'));
  sqlite.exec(src('../schema/097_columnes_mortes.sql'));
  sqlite.exec(src('../schema/098_entrenament_juvenil.sql'));
  sqlite.exec(src('../schema/099_velocitat_juvenil.sql'));
  sqlite.exec(src('../schema/100_pas10_juvenils.sql'));
  sqlite.exec(src('../schema/101_fora_crida.sql'));
  sqlite.exec(src('../schema/102_dos_entrenaments.sql'));
  sqlite.exec(src('../schema/103_alineacio_residual.sql'));
  sqlite.exec(src('../schema/104_ancora_diumenge.sql'));
  sqlite.exec(src('../schema/105_setmanes_reestampades.sql'));
  sqlite.exec(src('../schema/106_entrenador_quota.sql'));
  sqlite.exec(src('../schema/107_gasta_mes.sql'));
  sqlite.exec(src('../schema/108_fora_hores_pais.sql'));
  sqlite.exec(src('../schema/109_motor_v2.sql'));
  sqlite.exec(src('../schema/110_pesos_sector_mesurats.sql'));
  sqlite.exec(src('../schema/111_dues_capes.sql'));
  sqlite.exec(src('../schema/112_matriu_wiki.sql'));
  sqlite.exec(src('../schema/113_distancia_min.sql'));
  sqlite.exec(src('../schema/114_edat_fitxatge.sql'));
  return { sqlite, db: new D1(sqlite) };
}
