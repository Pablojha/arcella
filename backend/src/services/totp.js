import crypto from 'node:crypto';

// Time-based one-time passwords (RFC 6238) as authenticator apps make them: SHA-1, 30-second steps, 6 digits.
const STEP_SECONDS = 30;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const toBase32 = (buffer) => {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  return bits.match(/.{1,5}/g).map((chunk) => ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)]).join('');
};

const fromBase32 = (text) => {
  const bits = [...text.replace(/=+$/, '').toUpperCase()].map((char) => ALPHABET.indexOf(char).toString(2).padStart(5, '0')).join('');
  return Buffer.from(bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)));
};

/** A new random secret (160 bits, as RFC 4226 recommends), in the base32 form apps accept. */
export const newSecret = () => toBase32(crypto.randomBytes(20));

const step = (time = Date.now()) => Math.floor(time / 1000 / STEP_SECONDS);

function codeAt(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hash = crypto.createHmac('sha1', fromBase32(secret)).update(message).digest();
  const offset = hash[hash.length - 1] & 0xf;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/**
 * The time step a code belongs to (one step either side allows for clock drift), or null. Callers refuse steps at
 * or before the last one used, so a code can't be replayed.
 */
export function matchStep(secret, code, time = Date.now()) {
  for (const drift of [0, -1, 1]) {
    const counter = step(time) + drift;
    if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, counter)), Buffer.from(String(code).padStart(6, '0').slice(0, 6)))) return counter;
  }
  return null;
}

/** The link authenticator apps open (and QR codes carry) to add the account. */
export const otpauthUrl = (secret, account, issuer = 'Arcella') =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;

export { codeAt as _codeAt };
