export interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedSession {
  id: string;
  name: string;
  domain: string;
  createdAt: number;
  lastUsed: number;
  order: number;
  ttl?: number;
  encryptedData: string; // Base64 encoded encrypted session data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt for key derivation
}

export interface EncryptionSettings {
  enabled: boolean;
  keyDerivationIterations: number;
}