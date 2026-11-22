import { ActiveSessions, SessionData, SessionTTL } from "./session.types";

export interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface ExtensionStorage {
  sessions: SessionData[];
  activeSessions: ActiveSessions;
  ttlSettings: SessionTTL;
}
