// Tonico — EINA D'ADMINISTRADOR (emergència), fora del flux normal.
// El registre d'usuaris es fa per la web (/registre). Açò només serveix per
// crear un usuari + equips a mà (recuperació, proves, seed puntual).
// La contrasenya es passa com a argument i mai s'escriu enlloc: només ix el
// seu hash PBKDF2. Redirigix l'eixida cap a wrangler d1.
//
//   node scripts/crea-usuari.mjs <correu> <contrasenya> [nomSenior] [nomJuvenil]
//
// Exemple:
//   node scripts/crea-usuari.mjs jo@exemple.cat 'la-meua-clau' Benifotrem Fotrem \
//     | wrangler d1 execute tonico --remote
import { hashContrasenya } from '../lib/auth.js';

const [correu, contrasenya, senior = 'Benifotrem', juvenil = 'Fotrem'] = process.argv.slice(2);
if (!correu || !contrasenya) {
  console.error('Ús: node scripts/crea-usuari.mjs <correu> <contrasenya> [nomSenior] [nomJuvenil]');
  process.exit(1);
}
const hash = await hashContrasenya(contrasenya);
const q = (s) => s.replaceAll("'", "''");
process.stdout.write(
`INSERT INTO usuaris (correu, contrasenya) VALUES ('${q(correu)}', '${hash}');
INSERT INTO equips (usuari_id, nom, tipus) VALUES
  ((SELECT id FROM usuaris WHERE correu='${q(correu)}'), '${q(senior)}', 'senior'),
  ((SELECT id FROM usuaris WHERE correu='${q(correu)}'), '${q(juvenil)}', 'juvenil');
`);
