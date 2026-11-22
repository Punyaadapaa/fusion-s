import { EncryptionSettings } from "@shared/types/crypto.types";
import { ActiveSessions, SessionData, SessionTTL, EncryptedSessionData } from "./session.types";

export interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface ExtensionStorage {
  sessions: (SessionData | EncryptedSessionData)[];
  activeSessions: ActiveSessions;
  ttlSettings: SessionTTL;
  encryptionSettings: EncryptionSettings;
}
