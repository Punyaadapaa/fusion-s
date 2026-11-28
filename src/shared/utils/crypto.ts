import { EncryptionSettings } from "@shared/types/crypto.types";

// Key derivation constants
const KEY_DERIVATION_ALGORITHM = "PBKDF2";
const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const DIGEST = "SHA-256";

/**
 * Derives a crypto key from a password and salt
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt,
      iterations: iterations,
      hash: DIGEST,
    },
    passwordKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generates a random IV for AES-GCM
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypts session data using a derived key
 */
export async function encryptSessionData(
  sessionData: SessionData,
  key: CryptoKey
): Promise<{ encryptedData: string; iv: string }> {
  const enc = new TextEncoder();
  const dataJson = JSON.stringify(sessionData);
  const dataBytes = enc.encode(dataJson);

  const iv = generateIV();
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    dataBytes
  );

  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypts session data using a derived key
 */
export async function decryptSessionData(encryptedData: string, iv: string, key: CryptoKey): Promise<SessionData> {
  const encryptedBytes: Uint8Array = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const ivBytes: Uint8Array = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: ivBytes,
    },
    key,
    encryptedBytes
  );

  const dec = new TextDecoder();
  const dataJson = dec.decode(decrypted);
  return JSON.parse(dataJson) as SessionData;
}

/**
 * Default encryption settings
 */
export const defaultEncryptionSettings: EncryptionSettings = {
  enabled: false,
  keyDerivationIterations: 100000,
};
