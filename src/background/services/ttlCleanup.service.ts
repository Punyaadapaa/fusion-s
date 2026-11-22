import { ChromeApiService } from "@popup/services/chromeApi.service";
import { SessionTTL } from "@shared/types";
import { handleError } from "@shared/utils/errorHandling";

export class TTLCleanupService {
  private chromeApi = new ChromeApiService();
  private cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds

  async initialize(): Promise<void> {
    // Set up periodic cleanup
    chrome.alarms.create("ttlCleanup", {
      periodInMinutes: this.cleanupInterval / (60 * 1000),
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "ttlCleanup") {
        this.cleanupExpiredSessions().catch((error) => {
          console.error("TTL cleanup alarm error:", error);
        });
      }
    });

    // Run initial cleanup
    await this.cleanupExpiredSessions();
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const storage = await this.chromeApi.getStorageData<{
        sessions: SessionData[];
        activeSessions: Record<string, string>;
        ttlSettings: SessionTTL;
      }>(["sessions", "activeSessions", "ttlSettings"]);

      const sessions = storage.sessions || [];
      const activeSessions = storage.activeSessions || {};
      const ttlSettings = storage.ttlSettings || { defaultTTL: 7 * 24 * 60 * 60, enabled: false };

      const now = Date.now();
      const currentTime = Math.floor(now / 1000);

      // Filter out expired sessions
      const activeSessionIds = new Set(Object.values(activeSessions));
      const validSessions = sessions.filter((session) => {
        if (!ttlSettings.enabled || !session.ttl) {
          return true; // Keep if TTL is disabled or not set
        }

        const expirationTime = session.createdAt + session.ttl * 1000;
        return currentTime < expirationTime && activeSessionIds.has(session.id);
      });

      // Send update to all popup instances
      if (validSessions.length !== sessions.length) {
        await this.chromeApi.setStorageData({
          sessions: validSessions,
          activeSessions: activeSessions,
          ttlSettings: ttlSettings,
        });

        // Notify all popups of the cleanup
        chrome.tabs.query({}, async (tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  action: SESSION_DATA,
                  data: {
                    type: "ttlCleanup",
                    sessions: validSessions,
                    activeSessions: activeSessions,
                    ttlSettings: ttlSettings,
                  },
                });
              } catch (error) {
                // Tab might not have the extension or message service
                console.debug("Failed to notify tab of TTL cleanup:", error);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error("Error in TTL cleanup service:", handleError(error, "TTLCleanupService.cleanupExpiredSessions"));
    }
  }

  async setTTLSettings(settings: SessionTTL): Promise<void> {
    try {
      const storage = await this.chromeApi.getStorageData<{
        sessions: SessionData[];
        activeSessions: Record<string, string>;
        ttlSettings: SessionTTL;
      }>(["sessions", "activeSessions", "ttlSettings"]);

      await this.chromeApi.setStorageData({
        sessions: (storage.sessions || []) as SessionData[],
        activeSessions: (storage.activeSessions || {}) as Record<string, string>,
        ttlSettings: settings,
      });
    } catch (error) {
      throw new Error(handleError(error, "TTLCleanupService.setTTLSettings"));
    }
  }
}
