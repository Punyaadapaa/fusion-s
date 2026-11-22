import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { MessageService } from "./services/message.service";
import { TTLCleanupService } from "./services/ttlCleanup.service";

const messageService = new MessageService();
const ttlCleanupService = new TTLCleanupService();

// Extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Session Switcher extension started");
  await ttlCleanupService.initialize();
});

// Extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Session Switcher extension installed/updated", details);

  if (details.reason === "install") {
    chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: [],
      [STORAGE_KEYS.ACTIVE_SESSIONS]: {},
    });
  }

  // Initialize TTL cleanup on update too
  await ttlCleanupService.initialize();
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return messageService.handleMessage(message, sender, sendResponse);
});
