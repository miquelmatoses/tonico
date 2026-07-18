// Tonico — auth mínima i nativa (WebCrypto). Sense dependències: funciona
// igual als Cloudflare Workers i a Node. Hash de contrasenya PBKDF2 i sessió
// en cookie signada amb HMAC-SHA256. Cap secret ací: el secret de sessió ve
// d'env (wrangler secret / .dev.vars).
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (u8) => b64(u8).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

function igualConstant(a, b) {                 // comparació en temps constant
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

async function pbkdf2(contrasenya, salt, iteracions) {
  const clau = await crypto.subtle.importKey('raw', enc.encode(contrasenya), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iteracions, hash: 'SHA-256' }, clau, 256);
  return new Uint8Array(bits);
}

const ITER = 100000;

export async function hashContrasenya(contrasenya) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(contrasenya, salt, ITER);
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(h)}`;   // format autodescriptiu
}

export async function verificaContrasenya(contrasenya, guardat) {
  const [alg, iter, saltB, hB] = String(guardat).split('$');
  if (alg !== 'pbkdf2') return false;
  const h = await pbkdf2(contrasenya, deB64(saltB), parseInt(iter, 10));
  return igualConstant(h, deB64(hB));
}

// ── Sessió en cookie: "usuariId.exp.hmac(usuariId.exp)" ──
async function hmac(secret, msg) {
  const clau = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', clau, enc.encode(msg));
  return b64url(new Uint8Array(sig));
}

export async function signaSessio(usuariId, secret, expEpochSeg) {
  const cos = `${usuariId}.${expEpochSeg}`;
  return `${cos}.${await hmac(secret, cos)}`;
}

export async function verificaSessio(token, secret, araEpochSeg) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const esperat = await hmac(secret, `${id}.${exp}`);
  if (!igualConstant(enc.encode(sig), enc.encode(esperat))) return null;
  if (parseInt(exp, 10) <= araEpochSeg) return null;   // caducada
  return parseInt(id, 10);
}
