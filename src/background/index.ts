import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { CryptoService } from "./services/crypto.service";
import { MessageService } from "./services/message.service";

const messageService = new MessageService();
const cryptoService = new CryptoService();

// Extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Session Switcher extension started");
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
  
  // Initialize crypto on update too
  await cryptoService.initialize();
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return messageService.handleMessage(message, sender, sendResponse);
});
