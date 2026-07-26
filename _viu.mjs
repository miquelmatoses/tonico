// Banc de proves amb l'ESTAT VIU: carrega les taules reals dins de l'esquema local i crida
// les mateixes API que la pantalla consumix, per a poder mirar totes les seccions alhora.
// No forma part de la suite: és una eina de diagnòstic. node _viu.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { nova } from './test/_d1shim.mjs';

const DIR = process.argv[2];
const { sqlite, db } = nova(new URL('./test/x.mjs', import.meta.url).href);
const cols = (t) => sqlite.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map((r) => r.name);
const ORDE = ['usuaris', 'equips', 'config_usuari', 'plans', 'jugadors', 'instantanies',
  'instantanies_jugadors', 'categories_jugador', 'finances', 'personal_membres', 'vendes', 'intercanvis'];
for (const t of ORDE) {
  if (!readdirSync(DIR).includes(`${t}.json`)) continue;
  const files = JSON.parse(readFileSync(`${DIR}/${t}.json`, 'utf8'))[0].results;
  if (!files.length) continue;
  const valides = new Set(cols(t));
  const claus = Object.keys(files[0]).filter((k) => valides.has(k));
  const st = sqlite.prepare(`INSERT OR REPLACE INTO ${t} (${claus.join(',')}) VALUES (${claus.map(() => '?').join(',')})`);
  for (const f of files) st.run(...claus.map((k) => (f[k] === undefined ? null : f[k])));
}
export { sqlite, db };
