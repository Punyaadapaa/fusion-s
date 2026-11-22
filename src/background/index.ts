import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { CryptoService } from "./services/crypto.service";
import { MessageService } from "./services/message.service";
import { TTLCleanupService } from "./services/ttlCleanup.service";

const messageService = new MessageService();
const cryptoService = new CryptoService();
const ttlCleanupService = new TTLCleanupService();

// Extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Session Switcher extension started");
  await ttlCleanupService.initialize();
  await cryptoService.initialize();
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

  // Initialize TTL cleanup and crypto on update too
  await ttlCleanupService.initialize();
  await cryptoService.initialize();
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return messageService.handleMessage(message, sender, sendResponse);
});
