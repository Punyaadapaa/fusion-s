import { clearStorage, extractStorageData, injectStorageData } from "@background/services/storageData.service";
import { StorageData } from "@shared/types";
import { ExtensionError } from "@shared/utils/errorHandling";

export class StorageHandler {
  private async ensureHostPermission(tabId: number): Promise<void> {
    try {
      // Check if we already have permission for this tab's host
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || !tab.url.startsWith("http")) {
        return;
      }

      const url = new URL(tab.url);
      const permissions = await chrome.permissions.getAll();

      // Check if we already have host permissions for this origin
      const hasHostPermission = permissions.origins.some((origin) => {
        try {
          const permUrl = new URL(origin);
          return permUrl.origin === url.origin;
        } catch {
          return false;
        }
      });

      if (!hasHostPermission) {
        // Request host permission for this origin
        await chrome.permissions.request({
          origins: [url.origin],
        });
      }
    } catch (error) {
      console.warn("Failed to ensure host permission:", error);
      // Continue anyway - the scripting.executeScript will fail with a clear error if permission is missing
    }
  }

  async getStorageData(tabId: number): Promise<StorageData> {
    try {
      await this.ensureHostPermission(tabId);
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractStorageData,
      });

      return results?.[0]?.result || { localStorage: {}, sessionStorage: {} };
    } catch (error) {
      console.error("Error getting storage data:", error);
      return { localStorage: {}, sessionStorage: {} };
    }
  }

  async restoreStorageData(tabId: number, data: StorageData): Promise<void> {
    try {
      await this.ensureHostPermission(tabId);
      await chrome.scripting.executeScript({
        target: { tabId },
        func: injectStorageData,
        args: [data.localStorage, data.sessionStorage],
      });
    } catch (error) {
      throw new ExtensionError(`Failed to restore storage data: ${error}`);
    }
  }

  async clearStorageData(tabId: number): Promise<void> {
    try {
      await this.ensureHostPermission(tabId);
      await chrome.scripting.executeScript({
        target: { tabId },
        func: clearStorage,
      });
    } catch (error) {
      throw new ExtensionError(`Failed to clear storage data: ${error}`);
    }
  }
}
