<h1 align="center">fusion-s</h1>

<p align="center"><b>Session management extension with theme customizer and keyboard shortcuts</b><br>
Fusion of <a href="https://github.com/fanesz/session-switcher">fanesz/session-switcher</a> and <a href="https://github.com/kuronekony4n/session-switcher2">kuronekony4n/session-switcher2</a><br>
Vanilla TypeScript + CSS • Manifest V3 • Chrome/Brave/Edge compatible</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest_v3-ready-4285F4?logo=google-chrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript" alt="TypeScript 100%">
  <img src="https://img.shields.io/badge/Vanilla_CSS-0%25_JS_frameworks-1572B6?logo=css3" alt="Vanilla CSS">
  <img src="https://img.shields.io/badge/Keyboard_Shortcuts-4_Global-E2862A" alt="Keyboard Shortcuts">
  <img src="https://img.shields.io/badge/Theme_Customizer-Light_Dark-2563EB" alt="Theme Customizer">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-555" alt="MIT license"></a>
  <a href="https://github.com/workplus/fusion-s/issues"><img src="https://img.shields.io/badge/Welcome-Issues-38A169" alt="Issues welcome"></a>
</p>

---

## 🎯 Overview

**fusion-s** is a lightweight browser extension for managing multiple login sessions. Built with **vanilla TypeScript** and **pure CSS** (no React, no Tailwind), it offers:

- **4 Global Keyboard Shortcuts** — Save, New, Next, Previous (configurable in manifest)
- **Monochrome Theme System** — Light/Dark with CSS variables, 4px grid
- **Theme Customizer** — Persisted preferences, real-time preview
- **Export/Import Sessions** — JSON format with merge/replace modes, schema validation
- **Drag & Drop Reorder** — Sessions reorder naturally in popup UI
- **Manifest V3** — Service worker background, `chrome.scripting` for secure storage injection

---

## 🛠️ Quick Start

### Install (Prebuilt)

1. Download latest release from [Releases](https://github.com/workplus/fusion-s/releases)
2. Extract ZIP
3. Load unpacked in browser:
   - **Chrome/Edge**: `chrome://extensions/` → **Developer mode** → **Load unpacked**
   - **Brave**: `brave://extensions/` → **Developer mode** → **Load unpacked**
   - **Firefox**: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on**

### Build from Source

```bash
# Install dependencies (requires Bun)
bun install

# Build for Chrome
bun run build:chrome

# Build for Firefox
bun run build:firefox

# Development mode (auto-reload)
bun run dev:chrome   # or dev:firefox
```

### Manual Installation (Unpacked)

```bash
# 1. Build the extension
bun run build:chrome

# 2. Load in browser
# Chrome/Edge: chrome://extensions/ → Load unpacked → ./dist/
# Brave: brave://extensions/ → Load unpacked → ./dist/
# Firefox: about:debugging → Load Temporary Add-on → ./dist/manifest.json
```

---

## 🚀 Features

### Core Session Management

- **Save Sessions** — Captures cookies + localStorage + sessionStorage for current domain
- **Switch Sessions** — Instantly restore cookies + storage, then reload tab
- **New Session** — Clears current domain's cookies + storage (fresh start)
- **Multi-Domain** — Each website gets independent session storage
- **Persistent** — Data stored in `chrome.storage.local` (encrypted at rest in Phase 2)

### Keyboard Shortcuts (Global)

| Action           | Default Shortcut | macOS       |
| ---------------- | ---------------- | ----------- |
| Save Session     | `Ctrl+Shift+S`   | `⌘+Shift+S` |
| New Session      | `Ctrl+Shift+N`   | `⌘+Shift+N` |
| Next Session     | `Ctrl+Shift+→`   | `⌘+Shift+→` |
| Previous Session | `Ctrl+Shift+←`   | `⌘+Shift+←` |

> Shortcuts work anywhere — only disabled when focus is in a text field.

### Theme Customizer

- **Light/Dark** modes with auto-detection (`prefers-color-scheme`)
- **Persisted** in `localStorage` (`fusion-s-theme`)
- **Real-time preview** with theme cards
- **Accessible** — keyboard navigable, ARIA labels, focus management

### Export / Import

- **Export** — Download JSON with version, timestamp, and sessions array
- **Import** — File picker with merge/replace modes
- **Schema Validation** — Zod validation prevents malformed JSON corruption
- **Merge Logic** — Skip duplicates by `name|domain`, auto-increment order

### Drag & Drop Reorder

- Reorder sessions within each domain
- Visual feedback during drag
- Persisted immediately on drop

---

## 🔒 Security Hardening (Phase 1)

All security fixes implemented with **zero UX impact**:

| Fix                    | Description                                                                  | Status      |
| ---------------------- | ---------------------------------------------------------------------------- | ----------- |
| **CSP**                | `script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'`     | ✅ Enforced |
| **Message Validation** | Verify `sender.id === chrome.runtime.id` on all runtime messages             | ✅ Enforced |
| **Tab Validation**     | Validate `tabId` belongs to HTTP/HTTPS page before `scripting.executeScript` | ✅ Enforced |
| **Import Schema**      | Zod schema validation for imported JSON (structure, types, limits)           | ✅ Enforced |
| **Debounce**           | 200ms debounce on save/switch operations to prevent storage thrashing        | ✅ Enforced |

> **Phase 2** (deferred): Session encryption at rest with master password UX.

---

## 📦 Build Output

```text
dist/
├── background/
│   ├── index.js          # Service worker
│   ├── handlers/         # Session, Cookie, Storage logic
│   └── services/         # Message handling, storage data extraction
├── popup/
│   ├── index.html
│   ├── index.js          # Popup controller, Theme/Shortcuts managers
│   ├── services/         # Popup service (debounced, validated)
│   ├── components/       # ModalManager, LoadingManager, SessionList
│   ├── style.css         # Monochrome design system
│   └── utils/            # DOM helpers, domain parsing
├── shared/
│   ├── constants/        # Messages, storage keys, permissions
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Error handling, ID generation, validation, debounce, import validation
├── assets/
│   └── icons/            # 16, 32, 48, 128px PNGs
└── manifest.chrome.json  # Manifest V3 + CSP
```

---

## 🧪 Testing

```bash
# Run all tests (Jest)
bun run test

# Lint + format check
bun run lint:check
bun run format:check

# Auto-fix
bun run lint:fix
bun run format
```

### Test Coverage

- **PopupService** — save, switch, import, export, reorder, migrate, delete, rename
- **MessageService** — sender validation, permission checking
- **SessionHandler** — tab validation, cookie/storage extraction/injection
- **Utilities** — debounce, domain parsing, import validation

---

## 📱 Browser Support

| Browser | Status     | Notes                                     |
| ------- | ---------- | ----------------------------------------- |
| Chrome  | ✅ Full    | Manifest V3, CSP enforced                 |
| Brave   | ✅ Full    | Chrome Web Store compatible               |
| Edge    | ✅ Full    | Same as Chrome                            |
| Firefox | ⚠️ Partial | Requires `web-ext` build, CSP unsupported |
| Safari  | ❌ No      | Manifest V3 unsupported                   |

---

## 📜 License

MIT © 2026 WorkPlus

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Development setup:**

```bash
bun install
bun run dev:chrome    # Hot-reload development
bun run lint:fix      # Auto-fix lint issues
bun run format        # Auto-format code
```

---

## 🙏 Acknowledgements

- **fanesz/session-switcher** — Base implementation, Jest/Husky/CI, drag-drop reorder
- **kuronekony4n/session-switcher2** — Monochrome UI, theme customizer, keyboard shortcuts
- **TypeScript + ESBuild** — Zero-runtime, fast builds
- **Zod** — Runtime schema validation
- **WebExt Types** — Complete Chrome/Firefox type definitions

---

<p align="center">
  Made with ❤️ for developers who switch contexts often.<br>
  <b>fusion-s</b> — Session management, fused.
</p>
