// Tonico — verificació de correu. ESTRUCTURA preparada, inactiva per defecte.
// L'interruptor viu a configuracio_app (registre_verificacio_activa). Amb
// 'false' tot funciona com si res. Amb 'true', el registre exigix verificar
// i el login bloqueja els no verificats.
//
// L'enviament real de correus NO està implementat: enviarCorreuVerificacio
// és un stub. DECISIÓ OBERTA: proveïdor extern (Resend o similar) — veure README.
const enc = new TextEncoder();
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return hex(new Uint8Array(d));
}

export async function verificacioActiva(db) {
  const r = await db.prepare(
    `SELECT valor FROM configuracio_app WHERE clau = 'registre_verificacio_activa'`
  ).first();
  return r?.valor === 'true';
}

// Crea i desa un token (hashejat) de verificació, torna el token en clar
// (per enviar-lo). Caducitat: 48 h. Només s'invoca si la verificació és activa.
export async function creaTokenVerificacio(db, usuariId, araEpochSeg) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const caducitat = new Date((araEpochSeg + 60 * 60 * 48) * 1000).toISOString();
  await db.prepare(
    `INSERT INTO tokens_verificacio (usuari_id, token_hash, caducitat) VALUES (?, ?, ?)`
  ).bind(usuariId, await sha256hex(token), caducitat).run();
  return token;
}

// ponytail: stub deliberat. Punt d'extensió únic per al proveïdor de correu.
// Quan s'integre (Resend...), ací es fa la crida real i es torna l'estat.
export async function enviarCorreuVerificacio(correu, token) {
  return { enviat: false, motiu: 'sense_proveidor' };
}
