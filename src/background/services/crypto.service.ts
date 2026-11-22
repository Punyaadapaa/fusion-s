import { ChromeApiService } from "@popup/services/chromeApi.service";
import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { CryptoKeyPair, EncryptedSession, EncryptionSettings } from "@shared/types/crypto.types";
import { SessionData, EncryptedSessionData } from "@shared/types/session.types";
import { ExtensionStorage } from "@shared/types/storage.types";
import { deriveKeyFromPassword, encryptSessionData, decryptSessionData, defaultEncryptionSettings } from "@shared/utils/crypto";
import { ExtensionError } from "@shared/utils/errorHandling";

export class CryptoService {
  private chromeApi = new ChromeApiService();
  private encryptionSettings: EncryptionSettings = defaultEncryptionSettings;
  private derivedKey: CryptoKey | null = null;

  async initialize(): Promise<void> {
    try {
      const result = await this.chromeApi.getStorageData<ExtensionStorage>([
        STORAGE_KEYS.ENCRYPTION_SETTINGS,
      ]);

      this.encryptionSettings = result[STORAGE_KEYS.ENCRYPTION_SETTINGS] || defaultEncryptionSettings;
    } catch (error) {
      console.error("Error loading encryption settings:", error);
      this.encryptionSettings = defaultEncryptionSettings;
    }
  }

  async unlock(password: string): Promise<void> {
    try {
      // Get salt from storage or generate new one if not exists
      const storage = await this.chromeApi.getStorageData<Record<string, string>>([
        "encryptionSalt",
      ]);

      let salt: Uint8Array;
      if (storage.encryptionSalt) {
        // Decode base64 salt
        const saltBytes = Uint8Array.from(atob(storage.encryptionSalt), c => c.charCodeAt(0));
        salt = saltBytes;
      } else {
        // Generate new salt
        salt = crypto.getRandomValues(new Uint8Array(16));
        await this.chromeApi.setStorageData({
          encryptionSalt: btoa(String.fromCharCode(...salt))
        });
      }

      // Derive key from password
      this.derivedKey = await deriveKeyFromPassword(
        password,
        salt,
        this.encryptionSettings.keyDerivationIterations
      );
    } catch (error) {
      throw new ExtensionError(`Failed to unlock: ${error}`);
    }
  }

  async lock(): Promise<void> {
    this.derivedKey = null;
  }

  isUnlocked(): boolean {
    return this.derivedKey !== null;
  }

  async encryptSession(sessionData: SessionData): Promise<EncryptedSessionData> {
    if (!this.derivedKey) {
      throw new ExtensionError("Encryption not initialized. Call unlock() first.");
    }

    if (!this.encryptionSettings.enabled) {
      // If encryption is disabled, return the session data as-is
      return sessionData as EncryptedSessionData;
    }

    const { encryptedData, iv } = await encryptSessionData(sessionData, this.derivedKey);

    return {
      id: sessionData.id,
      name: sessionData.name,
      domain: sessionData.domain,
      createdAt: sessionData.createdAt,
      lastUsed: sessionData.lastUsed,
      order: sessionData.order,
      ttl: sessionData.ttl,
      encryptedData,
      iv,
      salt: "", // Salt is stored separately in storage
    };
  }

  async decryptSession(encryptedSession: EncryptedSessionData): Promise<SessionData> {
    if (!this.derivedKey) {
      throw new ExtensionError("Encryption not initialized. Call unlock() first.");
    }

    if (!this.encryptionSettings.enabled) {
      // If encryption is disabled, return the session data as-is
      return encryptedSession as SessionData;
    }

    const decrypted = await decryptSessionData(
      encryptedSession.encryptedData,
      encryptedSession.iv,
      this.derivedKey
    );

    return {
      ...decrypted,
      // StoredSession fields are empty - they would be fetched from storage if needed
      cookies: [],
      localStorage: {},
      sessionStorage: {},
    };
  }

  async encryptSessions(sessions: SessionData[]): Promise<EncryptedSessionData[]> {
    if (!this.isUnlocked()) {
      throw new ExtensionError("Encryption not unlocked");
    }

    return await Promise.all(sessions.map(session => this.encryptSession(session)));
  }

  async decryptSessions(encryptedSessions: EncryptedSessionData[]): Promise<SessionData[]> {
    if (!this.isUnlocked()) {
      throw new ExtensionError("Encryption not unlocked");
    }

    return await Promise.all(encryptedSessions.map(session => this.decryptSession(session)));
  }

  async setEncryptionSettings(settings: EncryptionSettings): Promise<void> {
    try {
      this.encryptionSettings = settings;
      await this.chromeApi.setStorageData({
        [STORAGE_KEYS.ENCRYPTION_SETTINGS]: settings,
      });
    } catch (error) {
      throw new ExtensionError(handleError(error, "CryptoService.setEncryptionSettings"));
    }
  }

  async getEncryptionSettings(): Promise<EncryptionSettings> {
    try {
      const result = await this.chromeApi.getStorageData<ExtensionStorage>([
        STORAGE_KEYS.ENCRYPTION_SETTINGS,
      ]);
      return result[STORAGE_KEYS.ENCRYPTION_SETTINGS] || defaultEncryptionSettings;
    } catch (error) {
      console.error("Error getting encryption settings:", error);
      return defaultEncryptionSettings;
    }
  }
}