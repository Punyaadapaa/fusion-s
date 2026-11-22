export interface SessionData extends StoredSession {
  id: string;
  name: string;
  domain: string;
  createdAt: number;
  lastUsed: number;
  order: number;
  ttl?: number; // Time to live in seconds (optional)
}

export interface StoredSession {
  cookies: chrome.cookies.Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface ActiveSessions {
  [domain: string]: string; // domain -> sessionId
}

export interface SessionTTL {
  defaultTTL: number; // Default TTL in seconds
  enabled: boolean;
}
