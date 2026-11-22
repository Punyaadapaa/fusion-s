import { getDomainFromUrl } from "@shared/utils/domain";
import { handleError } from "@shared/utils/errorHandling";
import { LoadingManager } from "./components/loadingManager";
import { ModalManager } from "./components/modalManager";
import { SessionList } from "./components/sessionList";
import { PopupService } from "./services/popup.service";
import { getElementByIdSafe } from "./utils/dom";

/**
 * Theme Customizer Feature
 */
class ThemeCustomizer {
  private currentTheme: "light" | "dark" = "light";

  constructor() {
    this.loadTheme();
    this.applyTheme();
  }

  private loadTheme(): void {
    const saved = localStorage.getItem("fusion-s-theme");
    if (saved === "dark" || saved === "light") {
      this.currentTheme = saved;
    } else {
      this.currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  }

  private saveTheme(): void {
    localStorage.setItem("fusion-s-theme", this.currentTheme);
  }

  private applyTheme(): void {
    document.documentElement.setAttribute("data-theme", this.currentTheme);
  }

  getTheme(): "light" | "dark" {
    return this.currentTheme;
  }

  toggleTheme(): "light" | "dark" {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
    this.saveTheme();
    this.applyTheme();
    return this.currentTheme;
  }

  setTheme(theme: "light" | "dark"): void {
    this.currentTheme = theme;
    this.saveTheme();
    this.applyTheme();
  }

  renderOptions(container: HTMLElement): void {
    const themes = [
      { id: "light", name: "Light", desc: "Clean light interface" },
      { id: "dark", name: "Dark", desc: "Easy on the eyes" },
    ];

    container.innerHTML = themes
      .map(
        (theme) => `
      <label class="theme-option ${theme.id === this.currentTheme ? "selected" : ""}" data-theme="${theme.id}">
        <input type="radio" name="theme" value="${theme.id}" ${theme.id === this.currentTheme ? "checked" : ""}>
        <span class="theme-preview" style="background: ${theme.id === "light" ? "#f7f7f8" : "#141414"};"></span>
        <div class="theme-info">
          <div class="theme-name">${theme.name}</div>
          <div class="theme-desc">${theme.desc}</div>
        </div>
      </label>
    `
      )
      .join("");

    container.querySelectorAll(".theme-option").forEach((option) => {
      option.addEventListener("click", () => {
        const theme = option.getAttribute("data-theme") as "light" | "dark";
        this.setTheme(theme);
        this.renderOptions(container);
      });
    });
  }
}

/**
 * Keyboard Shortcuts Feature
 */
class KeyboardShortcuts {
  private shortcuts: Array<{
    action: string;
    description: string;
    keys: Array<{ key: string; isMod: boolean }>;
  }> = [
      {
        action: "Save Session",
        description: "Save current login session",
        keys: [
          { key: "Ctrl", isMod: true },
          { key: "Shift", isMod: true },
          { key: "S", isMod: false },
        ],
      },
      {
        action: "New Session",
        description: "Clear session and start fresh",
        keys: [
          { key: "Ctrl", isMod: true },
          { key: "Shift", isMod: true },
          { key: "N", isMod: false },
        ],
      },
      {
        action: "Next Session",
        description: "Cycle to next session",
        keys: [
          { key: "Ctrl", isMod: true },
          { key: "Shift", isMod: true },
          { key: "→", isMod: false },
        ],
      },
      {
        action: "Previous Session",
        description: "Cycle to previous session",
        keys: [
          { key: "Ctrl", isMod: true },
          { key: "Shift", isMod: true },
          { key: "←", isMod: false },
        ],
      },
    ];

  renderList(container: HTMLElement): void {
    container.innerHTML = this.shortcuts
      .map(
        (shortcut) => `
      <div class="shortcut-row" role="listitem">
        <div class="shortcut-label">
          <div class="shortcut-action">${shortcut.action}</div>
          <div class="shortcut-desc">${shortcut.description}</div>
        </div>
        <div class="shortcut-keys">
          ${shortcut.keys
    .map(
      (k) => `
            <span class="keycap ${k.isMod ? "mod" : "kbd"}">${k.key}</span>
          `
    )
    .join("")}
        </div>
      </div>
    `
      )
      .join("");
  }

  registerGlobalShortcuts(callback: (action: string) => void): void {
    document.addEventListener("keydown", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const pressedKeys: string[] = [];
      if (e.ctrlKey) pressedKeys.push("Ctrl");
      if (e.shiftKey) pressedKeys.push("Shift");
      if (e.altKey) pressedKeys.push("Alt");
      if (e.metaKey) pressedKeys.push("Meta");
      if (e.key && !["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        const key = e.key === "ArrowRight" ? "→" : e.key === "ArrowLeft" ? "←" : e.key.toUpperCase();
        pressedKeys.push(key);
      }

      const shortcut = this.shortcuts.find(
        (s) => s.keys.length === pressedKeys.length && s.keys.every((k, i) => k.key === pressedKeys[i])
      );

      if (shortcut) {
        e.preventDefault();
        callback(shortcut.action);
      }
    });
  }
}

class PopupController {
  private loadingManager = new LoadingManager();
  private modalManager = new ModalManager();
  private sessionList: SessionList;
  private popupService = new PopupService();
  private themeCustomizer = new ThemeCustomizer();
  private keyboardShortcuts = new KeyboardShortcuts();

  private currentSiteElement: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private newSessionBtn: HTMLButtonElement;
  private sessionCountElement: HTMLElement;

  // Menu elements
  private menuBtn: HTMLButtonElement;
  private menuDropdown: HTMLElement;
  private themeMenuItem: HTMLButtonElement;
  private shortcutsMenuItem: HTMLButtonElement;
  private helpMenuItem: HTMLButtonElement;

  // Modal elements
  private themeModal: HTMLElement;
  private shortcutsModal: HTMLElement;
  private helpModal: HTMLElement;
  private importModal: HTMLElement;
  private closeThemeModal: HTMLButtonElement;
  private closeThemeModalBtn: HTMLButtonElement;
  private closeShortcutsModal: HTMLButtonElement;
  private closeShortcutsModalBtn: HTMLButtonElement;
  private closeHelpModal: HTMLButtonElement;
  private closeHelpModalBtn: HTMLButtonElement;
  private closeImportModal: HTMLButtonElement;
  private cancelImport: HTMLButtonElement;
  private confirmImport: HTMLButtonElement;
  private importFileInput: HTMLInputElement;

  constructor() {
    this.currentSiteElement = getElementByIdSafe("currentSite");
    this.saveBtn = getElementByIdSafe("saveBtn");
    this.newSessionBtn = getElementByIdSafe("newSessionBtn");
    this.sessionCountElement = getElementByIdSafe("sessionCount");

    this.menuBtn = getElementByIdSafe("menuBtn");
    this.menuDropdown = getElementByIdSafe("menuDropdown");
    this.themeMenuItem = getElementByIdSafe("themeMenuItem");
    this.shortcutsMenuItem = getElementByIdSafe("shortcutsMenuItem");
    this.helpMenuItem = getElementByIdSafe("helpMenuItem");
    this.exportMenuItem = getElementByIdSafe("exportMenuItem");
    this.importMenuItem = getElementByIdSafe("importMenuItem");

    this.themeModal = getElementByIdSafe("themeModal");
    this.shortcutsModal = getElementByIdSafe("shortcutsModal");
    this.helpModal = getElementByIdSafe("helpModal");
    this.importModal = getElementByIdSafe("importModal");
    this.closeThemeModal = getElementByIdSafe("closeThemeModal");
    this.closeThemeModalBtn = getElementByIdSafe("closeThemeModalBtn");
    this.closeShortcutsModal = getElementByIdSafe("closeShortcutsModal");
    this.closeShortcutsModalBtn = getElementByIdSafe("closeShortcutsModalBtn");
    this.closeHelpModal = getElementByIdSafe("closeHelpModal");
    this.closeHelpModalBtn = getElementByIdSafe("closeHelpModalBtn");
    this.closeImportModal = getElementByIdSafe("closeImportModal");
    this.cancelImport = getElementByIdSafe("cancelImport");
    this.confirmImport = getElementByIdSafe("confirmImport");
    this.importFileInput = getElementByIdSafe("importFile") as HTMLInputElement;

    this.sessionList = new SessionList(getElementByIdSafe("sessionsList"));
    this.setupSessionListHandlers();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      this.modalManager.hideAllModals();
      const state = await this.loadingManager.withLoading(async () => {
        return await this.popupService.initialize();
      });

      this.currentSiteElement.textContent = state.currentDomain;
      this.updateSessionCount(state.sessions.filter((s) => s.domain === state.currentDomain).length);
      this.renderSessionsList();

      this.keyboardShortcuts.registerGlobalShortcuts((action) => {
        this.handleKeyboardShortcut(action);
      });
    } catch (error) {
      this.showError(handleError(error, "PopupController.initialize"));
    }
  }

  getServiceInstance(): PopupService {
    return this.popupService;
  }

  private setupEventListeners(): void {
    this.saveBtn.addEventListener("click", () => this.handleSaveClick());
    this.newSessionBtn.addEventListener("click", () => this.handleNewSessionClick());

    // Menu dropdown
    this.menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = this.menuDropdown.classList.toggle("show");
      this.menuBtn.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", () => {
      this.menuDropdown.classList.remove("show");
      this.menuBtn.setAttribute("aria-expanded", "false");
    });

    this.themeMenuItem.addEventListener("click", () => {
      this.menuDropdown.classList.remove("show");
      this.menuBtn.setAttribute("aria-expanded", "false");
      this.openThemeModal();
    });

    this.shortcutsMenuItem.addEventListener("click", () => {
      this.menuDropdown.classList.remove("show");
      this.menuBtn.setAttribute("aria-expanded", "false");
      this.openShortcutsModal();
    });

    this.helpMenuItem.addEventListener("click", () => {
      this.menuDropdown.classList.remove("show");
      this.menuBtn.setAttribute("aria-expanded", "false");
      this.openHelpModal();
    });

    this.exportMenuItem.addEventListener("click", () => {
      this.menuDropdown.classList.remove("show");
      this.menuBtn.setAttribute("aria-expanded", "false");
      this.handleExportClick();
    });

    this.importMenuItem.addEventListener("click", () => {
      this.menuDropdown.classList.remove("show");
      this.menuBtn.setAttribute("aria-expanded", "false");
      this.openImportModal();
    });

    // Theme modal
    this.closeThemeModal.addEventListener("click", () => this.closeThemeModalFn());
    this.closeThemeModalBtn.addEventListener("click", () => this.closeThemeModalFn());

    // Shortcuts modal
    this.closeShortcutsModal.addEventListener("click", () => this.closeShortcutsModalFn());
    this.closeShortcutsModalBtn.addEventListener("click", () => this.closeShortcutsModalFn());

    // Help modal
    this.closeHelpModal.addEventListener("click", () => this.closeHelpModalFn());
    this.closeHelpModalBtn.addEventListener("click", () => this.closeHelpModalFn());

    // Import modal
    this.closeImportModal.addEventListener("click", () => this.closeImportModalFn());
    this.cancelImport.addEventListener("click", () => this.closeImportModalFn());
    this.confirmImport.addEventListener("click", () => this.handleConfirmImport());
    this.importFileInput.addEventListener("change", () => this.handleImportFileChange());

    // Original modals
    getElementByIdSafe("confirmSave").addEventListener("click", () => this.handleConfirmSave());
    getElementByIdSafe("confirmRename").addEventListener("click", () => this.handleConfirmRename());
    getElementByIdSafe("confirmDelete").addEventListener("click", () => this.handleConfirmDelete());

    // Close modals on backdrop click
    [this.themeModal, this.shortcutsModal, this.helpModal].forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("show");
        }
      });
    });

    // ESC to close modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        [this.themeModal, this.shortcutsModal, this.helpModal].forEach((m) => m.classList.remove("show"));
        this.modalManager.hideAllModals();
      }
    });
  }

  private setupSessionListHandlers(): void {
    this.sessionList.setEventHandlers({
      onSessionClick: (sessionId) => this.handleSessionSwitch(sessionId),
      onRenameClick: (sessionId) => this.handleRenameClick(sessionId),
      onDeleteClick: (sessionId) => this.handleDeleteClick(sessionId),
      onReorder: (sessionIds) => this.handleReorder(sessionIds),
    });
  }

  private openThemeModal(): void {
    const container = getElementByIdSafe("themeOptions");
    this.themeCustomizer.renderOptions(container);
    this.themeModal.classList.add("show");
  }

  private closeThemeModalFn(): void {
    this.themeModal.classList.remove("show");
  }

  private openShortcutsModal(): void {
    const container = getElementByIdSafe("shortcutsList");
    this.keyboardShortcuts.renderList(container);
    this.shortcutsModal.classList.add("show");
  }

  private closeShortcutsModalFn(): void {
    this.shortcutsModal.classList.remove("show");
  }

  private openHelpModal(): void {
    this.helpModal.classList.add("show");
  }

  private closeHelpModalFn(): void {
    this.helpModal.classList.remove("show");
  }

  private handleKeyboardShortcut(action: string): void {
    switch (action) {
      case "Save Session":
        this.handleSaveClick();
        break;
      case "New Session":
        this.handleNewSessionClick();
        break;
      case "Next Session":
        this.handleSwitchDirection("next");
        break;
      case "Previous Session":
        this.handleSwitchDirection("prev");
        break;
    }
  }

  private async handleSwitchDirection(direction: "next" | "prev"): Promise<void> {
    const state = this.popupService.getState();
    const domainSessions = state.sessions
      .filter((s) => s.domain === state.currentDomain)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (domainSessions.length === 0) return;

    const activeId = state.activeSessions[state.currentDomain];
    const activeIndex = domainSessions.findIndex((s) => s.id === activeId);
    const nextIndex =
      direction === "next"
        ? (activeIndex + 1) % domainSessions.length
        : (activeIndex - 1 + domainSessions.length) % domainSessions.length;

    await this.handleSessionSwitch(domainSessions[nextIndex].id);
  }

  private async handleSaveClick(): Promise<void> {
    this.modalManager.showSaveModal();
  }

  private async handleConfirmSave(): Promise<void> {
    try {
      const name = this.modalManager.getSaveModalInput();

      await this.loadingManager.withLoading(async () => {
        await this.popupService.saveCurrentSession(name);
      });

      this.modalManager.hideSaveModal();
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "save session"));
    }
  }

  private async handleNewSessionClick(): Promise<void> {
    try {
      await this.loadingManager.withLoading(async () => {
        await this.popupService.createNewSession();
      });

      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "create new session"));
    }
  }

  private async handleSessionSwitch(sessionId: string): Promise<void> {
    try {
      await this.loadingManager.withLoading(async () => {
        await this.popupService.switchToSession(sessionId);
      });

      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "switch session"));
    }
  }

  private handleRenameClick(sessionId: string): void {
    const session = this.popupService.getSession(sessionId);
    if (session) {
      this.popupService.setState({ currentRenameSessionId: sessionId });
      this.modalManager.showRenameModal(session.name);
    }
  }

  private async handleConfirmRename(): Promise<void> {
    try {
      const newName = this.modalManager.getRenameModalInput();
      const sessionId = this.popupService.getState().currentRenameSessionId;

      if (newName && sessionId) {
        await this.popupService.renameSession(sessionId, newName);
        this.renderSessionsList();
      }

      this.modalManager.hideRenameModal();
    } catch (error) {
      this.showError(handleError(error, "rename session"));
    }
  }

  private handleDeleteClick(sessionId: string): void {
    const session = this.popupService.getSession(sessionId);
    if (session) {
      this.popupService.setState({ currentDeleteSessionId: sessionId });
      this.modalManager.showDeleteModal(session.name);
    }
  }

  private async handleConfirmDelete(): Promise<void> {
    try {
      const sessionId = this.popupService.getState().currentDeleteSessionId;

      if (sessionId) {
        await this.popupService.deleteSession(sessionId);
        this.renderSessionsList();
      }

      this.modalManager.hideDeleteModal();
    } catch (error) {
      this.showError(handleError(error, "delete session"));
    }
  }

  private async handleReorder(sessionIds: string[]): Promise<void> {
    try {
      await this.popupService.reorderSessions(sessionIds);
    } catch (error) {
      this.showError(handleError(error, "reorder sessions"));
    }
  }

  private renderSessionsList(): void {
    const state = this.popupService.getState();
    this.sessionList.render(state.sessions, state.activeSessions, state.currentDomain);
    this.updateSessionCount(state.sessions.filter((s) => s.domain === state.currentDomain).length);
  }

  private updateSessionCount(count: number): void {
    this.sessionCountElement.textContent = String(count);
  }

  private showError(message: string): void {
    console.error("Popup error:", message);
    this.modalManager.showErrorModal(message);
  }

  // Export / Import
  private async handleExportClick(): Promise<void> {
    try {
      const state = this.popupService.getState();
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        sessions: state.sessions,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fusion-s-sessions-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      this.showError(handleError(error, "export sessions"));
    }
  }

  private openImportModal(): void {
    this.importFileInput.value = "";
    this.confirmImport.disabled = true;
    this.importModal.classList.add("show");
  }

  private closeImportModalFn(): void {
    this.importModal.classList.remove("show");
    this.importFileInput.value = "";
    this.confirmImport.disabled = true;
  }

  private handleImportFileChange(): void {
    this.confirmImport.disabled = !this.importFileInput.files?.length;
  }

  private async handleConfirmImport(): Promise<void> {
    const file = this.importFileInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.sessions || !Array.isArray(data.sessions)) {
        throw new Error("Invalid file format: missing sessions array");
      }

      const mode = (document.querySelector("input[name=\"importMode\"]:checked") as HTMLInputElement)?.value || "merge";

      await this.loadingManager.withLoading(async () => {
        await this.popupService.importSessions(data.sessions, mode);
      });

      this.closeImportModalFn();
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "import sessions"));
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Session Switcher Fusion-s popup loaded");
  const controller = new PopupController();
  await controller.initialize();

  const service = controller.getServiceInstance();
  const state = service.getState();

  let currentDomain = state.currentDomain;

  const tabActivatedListener = async (activeInfo: { tabId: number }) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const newDomain = getDomainFromUrl(tab.url);
      if (newDomain !== currentDomain) {
        currentDomain = newDomain;
        await controller.initialize();
      }
    }
  };

  const tabUpdatedListener = async (_: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      const newDomain = getDomainFromUrl(tab.url);
      if (newDomain !== currentDomain) {
        currentDomain = newDomain;
        await controller.initialize();
      }
    }
  };

  chrome.tabs.onActivated.addListener(tabActivatedListener);
  chrome.tabs.onUpdated.addListener(tabUpdatedListener);

  const cleanup = () => {
    chrome.tabs.onActivated.removeListener(tabActivatedListener);
    chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
  };

  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("unload", cleanup);
});
