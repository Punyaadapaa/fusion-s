import { SessionHandler } from "@background/handlers/session.handler";
import { MESSAGE_ACTIONS } from "@shared/constants/messages";
import { REQUIRED_PERMISSIONS } from "@shared/constants/requiredPermission";
import { MessageType, SendResponseType, StoredSession } from "@shared/types";
import { handleError } from "@shared/utils/errorHandling";
import { CryptoService } from "./crypto.service";

export class MessageService {
  private sessionHandler = new SessionHandler();
  private cryptoService = new CryptoService();

  handleMessage(message: MessageType, sender: chrome.runtime.MessageSender, sendResponse: SendResponseType): boolean {
    if (!this.validateSender(sender)) {
      sendResponse({ success: false, error: "Invalid message sender" });
      return true;
    }

    this.checkPermissions()
      .then(() => {
        return this.processMessage(message, sendResponse);
      })
      .catch((error) => {
        const errorMessage = handleError(error, "MessageService.handleMessage");
        sendResponse({ success: false, error: errorMessage });
      });

    return true;
  }

  private validateSender(sender: chrome.runtime.MessageSender): boolean {
    return sender.id === chrome.runtime.id;
  }

  private async checkPermissions(): Promise<void> {
    try {
      const permissions = await chrome.permissions.getAll();

      this.validateRequiredPermissions(permissions);
      this.validateOriginPermissions(permissions);
    } catch (error) {
      throw error;
    }
  }

  private validateRequiredPermissions(permissions: chrome.permissions.Permissions): void {
    for (const permission of REQUIRED_PERMISSIONS) {
      if (!permissions.permissions?.includes(permission)) {
        throw new Error("Data access permission is required.");
      }
    }
  }

  private validateOriginPermissions(permissions: chrome.permissions.Permissions): void {
    const origins = permissions.origins || [];

    if (origins.length === 0) {
      throw new Error("Data access permission is required.");
    }

    const hasBroadAccess = origins.some(
      (origin) => origin === "<all_urls>" || origin === "*://*/*" || origin === "http://*/*" || origin === "https://*/*"
    );

    if (!hasBroadAccess) {
      throw new Error("Data access permission is required.");
    }
  }

  private async processMessage(message: MessageType, sendResponse: SendResponseType): Promise<void> {
    switch (message.action) {
      case MESSAGE_ACTIONS.GET_CURRENT_SESSION:
        await this.handleGetCurrentSession(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.SWITCH_SESSION:
        await this.handleSwitchSession(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.CLEAR_SESSION:
        await this.handleClearSession(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.UNLOCK_ENCRYPTION:
        await this.handleUnlockEncryption(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.LOCK_ENCRYPTION:
        await this.handleLockEncryption(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.SET_ENCRYPTION_SETTINGS:
        await this.handleSetEncryptionSettings(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.GET_ENCRYPTION_SETTINGS:
        await this.handleGetEncryptionSettings(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.SET_TTL_SETTINGS:
        await this.handleSetTTLSettings(message, sendResponse);
        break;

      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
  }

  private async handleGetCurrentSession(
    message: Extract<MessageType, { action: "getCurrentSession" }>,
    sendResponse: SendResponseType<StoredSession | null>
  ): Promise<void> {
    const sessionData = await this.sessionHandler.getCurrentSession(message.domain, message.tabId);
    sendResponse({ success: true, data: sessionData });
  }

  private async handleSwitchSession(
    message: Extract<MessageType, { action: "switchSession" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    await this.sessionHandler.switchToSession(message.sessionData, message.tabId);
    sendResponse({ success: true });
  }

  private async handleSetTTLSettings(
    message: Extract<MessageType, { action: "setTTLSettings" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { TTLCleanupService } = await import("@background/services/ttlCleanup.service");
      const ttlCleanupService = new TTLCleanupService();
      await ttlCleanupService.setTTLSettings(message.settings);
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = handleError(error, "MessageService.handleSetTTLSettings");
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleClearSession(
    message: Extract<MessageType, { action: "clearSession" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    await this.sessionHandler.clearSession(message.domain, message.tabId);
    sendResponse({ success: true });
  }

  private async handleUnlockEncryption(
    message: Extract<MessageType, { action: "unlockEncryption" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      await this.cryptoService.unlock(message.password);
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = handleError(error, "MessageService.handleUnlockEncryption");
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleLockEncryption(
    _: Extract<MessageType, { action: "lockEncryption" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      await this.cryptoService.lock();
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = handleError(error, "MessageService.handleLockEncryption");
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleSetEncryptionSettings(
    message: Extract<MessageType, { action: "setEncryptionSettings" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      await this.cryptoService.setEncryptionSettings(message.settings);
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = handleError(error, "MessageService.handleSetEncryptionSettings");
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleGetEncryptionSettings(
    _: Extract<MessageType, { action: "getEncryptionSettings" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      const settings = await this.cryptoService.getEncryptionSettings();
      sendResponse({ success: true, data: settings });
    } catch (error) {
      const errorMessage = handleError(error, "MessageService.handleGetEncryptionSettings");
      sendResponse({ success: false, error: errorMessage });
    }
  }
}
