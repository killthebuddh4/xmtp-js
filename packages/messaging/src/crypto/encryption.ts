import Ciphertext, { AESGCMNonceSize, KDFSaltSize } from './Ciphertext';
import { crypto } from './utils';

const hkdfNoInfo = new ArrayBuffer(0);

export async function encrypt(
  plain: Uint8Array,
  secret: Uint8Array,
  additionalData?: Uint8Array
): Promise<Ciphertext> {
  const salt = crypto.getRandomValues(new Uint8Array(KDFSaltSize));
  const nonce = crypto.getRandomValues(new Uint8Array(AESGCMNonceSize));
  const key = await hkdf(secret, salt);
  const encrypted: ArrayBuffer = await crypto.subtle.encrypt(
    aesGcmParams(nonce, additionalData),
    key,
    plain
  );
  return new Ciphertext({
    payload: new Uint8Array(encrypted),
    hkdfSalt: salt,
    gcmNonce: nonce
  });
}

export async function decrypt(
  encrypted: Ciphertext,
  secret: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  const key = await hkdf(secret, encrypted.hkdfSalt);
  const decrypted: ArrayBuffer = await crypto.subtle.decrypt(
    aesGcmParams(encrypted.gcmNonce, additionalData),
    key,
    encrypted.payload
  );
  return new Uint8Array(decrypted);
}

function aesGcmParams(
  nonce: Uint8Array,
  additionalData?: Uint8Array
): AesGcmParams {
  const spec: AesGcmParams = {
    name: 'AES-GCM',
    iv: nonce
  };
  if (additionalData) {
    spec.additionalData = additionalData;
  }
  return spec;
}

// Derive AES-256-GCM key from a shared secret and salt.
// Returns crypto.CryptoKey suitable for the encrypt/decrypt API
async function hkdf(secret: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, [
    'deriveKey'
  ]);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: hkdfNoInfo },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
