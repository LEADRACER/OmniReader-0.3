# OmniReader 🌌

A premium, universal document reader with AI-powered summaries, interactive Q&A, real-time translation, and voice playback — all running 100% client-side.

**Native app + Web app + PWA** — one codebase, runs everywhere.

---

## ⚡ Quick Start

### Native App (Recommended)
```bash
# Download the binary for your platform from Releases
# Linux/macOS:
chmod +x omnireader && ./omnireader

# Windows:
omnireader.exe
```

Opens your browser automatically at `http://localhost:<random-port>`. Zero config, zero setup.

### Web / PWA
```bash
# Unzip dist/ and open index.html
# Or serve it:
npx serve dist
```
Installable as PWA — works offline.

---

## ✨ Features

### 📄 Multi-Format Reader
- **PDF** — multi-page rendering via pdfjs-dist with error recovery, WebGPU acceleration
- **Markdown** — full GFM support via marked
- **Plain Text** — clean monospace rendering

### 🧠 AI-Powered Reading (OpenRouter)
- **Summary Mode** — one-click LLM summarization
- **Q&A Mode** — interactive chat with your document as context, conversation history persisted
- **6+ Providers** — OpenRouter (default: 🦉 Owl Alpha), OpenAI, Groq (free Llama 3.3 70B!), DeepSeek, Together AI, GitHub Models (free GPT-4o-mini!), Ollama (local)
- **Bring Your Own Key** — stored locally, sent only to your chosen provider

### 🌍 Translation
- **Online** — Chrome Translation API (zero-setup), OpenRouter, Ollama
- **Offline** — Transformers.js NLLB-200-distilled-600M (~1.2GB, fully local, no API key)
- **6 Languages** — English, Spanish, French, Japanese, German, Chinese
- **Original/Translated toggle** — switch instantly without re-fetching

### 🔊 Voice (TTS)
- Browser-native speech synthesis, language-aware voice selection
- Controls: pause/resume, stop, speed selector (0.5x–2.0x)
- Keyboard: `Space` to pause/play, `s` to stop

### 📝 Annotations & Highlights
- Select text → floating menu with 6 highlight colors + 📝 note button
- Persisted per-document in localStorage, restored on reopen

### 📚 Reading History & Bookmarks
- Auto-saves scroll position, page, time spent
- Sessions tracked with duration, auto-resume on reopen
- Page/position bookmarks with labels

### 🔍 Search
- **In-document** — `⌘F` / `/` floating search bar, match highlights, prev/next nav
- **Global** — full-text search across all uploaded documents

### 📄 PDF Power Tools
- **Outline/TOC** — extracted bookmarks rendered as sidebar tree, click to jump
- **Split View** — Original ↔ Translated side-by-side with synced scrolling
- **WebGPU** — accelerated PDF rendering (auto-detected)

### 🎨 Themes
- **Dark** — deep glassmorphism with purple-cyan nebula
- **Libral Light** — lavender-white with frosted glass and purple accents
- Toggle with ☀️/🌙 button, persisted in localStorage

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘F` / `Ctrl+F` / `/` | Search in document |
| `⌘E` | Export current view |
| `Space` | Pause / resume TTS |
| `s` | Stop TTS |
| `Escape` | Stop TTS or close search/modals |
| `Enter` / `Shift+Enter` | Next / prev search match |
| `n` / `p` | Next / prev match (search active) |

---

## 🚀 Installation

### Native Binary (Best Experience)

| Platform | Download | Install |
|----------|----------|---------|
| Linux x86_64 | `omnireader-2.0.0-linux-amd64.tar.gz` | `tar -xzf ... && ./omnireader` |
| Linux ARM64 | `omnireader-2.0.0-linux-arm64.tar.gz` | `tar -xzf ... && ./omnireader` |
| macOS Intel | `omnireader-2.0.0-darwin-amd64.tar.gz` | `tar -xzf ... && ./omnireader` |
| macOS Apple Silicon | `omnireader-2.0.0-darwin-arm64.tar.gz` | `tar -xzf ... && ./omnireader` |
| Windows x86_64 | `omnireader-2.0.0-windows-amd64.zip` | Unzip → `omnireader.exe` |
| Windows ARM64 | `omnireader-2.0.0-windows-arm64.zip` | Unzip → `omnireader.exe` |

**Run:**
```bash
./omnireader              # Auto-opens browser on random port
./omnireader -port 8080   # Specific port
./omnireader -headless -port 0  # Headless server (CI)
```

### Web / PWA
```bash
# Download dist.zip from Releases, unzip → open index.html
# Or serve:
npx serve dist
```
Works offline via Service Worker. Installable as standalone app.

---

## 🤝 Bring Your Own Key

OmniReader uses **OpenRouter** by default (🦉 Owl Alpha). Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys) ($1 free credit).

1. Open OmniReader → click ⚙️/🔑 in sidebar
2. Paste your API key
3. All AI features unlock instantly

**Alternative providers (no OpenRouter key needed):**
- **Groq** — Free Llama 3.3 70B at [console.groq.com](https://console.groq.com/keys)
- **GitHub Models** — Free GPT-4o-mini with GitHub PAT at [github.com/settings/tokens](https://github.com/settings/tokens)
- **Ollama** — Local, no key: `brew install ollama && ollama pull llama3.2:3b`

Your key is stored in `localStorage` and only sent to your chosen provider.

---

## 🏗️ Architecture

```
omnireader (single binary, ~11MB)
├── Embedded web assets (dist/)
│   ├── index-*.js (534KB) — main app
│   ├── translation-offline-*.js (807KB, lazy) — NLLB model
│   ├── mobile-gestures-*.js (3.7KB, lazy) — touch gestures
│   ├── index-*.css (18KB) — design system
│   └── pdf.worker.min-*.mjs (1.2MB) — PDF.js worker
├── HTTP server (auto port, opens browser)
├── API endpoints (/api/open, /api/save, /api/config)
└── Cross-platform: Linux/macOS/Windows, amd64/arm64
```

**Dynamic imports** keep main bundle lean — offline translation & mobile gestures load only when needed.

---

## 🛠️ Development

```bash
# Install deps
npm install

# Dev server (hot reload)
npm run dev

# Build web assets
npm run build

# Native runner
cd cmd/omnireader && go build -o omnireader .

# Cross-platform build
./build-native.sh
```

### Project Structure
```
├── cmd/omnireader/          # Go native runner
│   ├── main.go              # HTTP server + embed
│   ├── web/dist/            # Embedded web assets
│   └── go.mod
├── src/                     # Web app (vanilla JS + Vite)
│   ├── components/          # UI components
│   ├── readers/             # PDF/MD/TXT renderers
│   ├── services/            # AI, annotations, history, search, etc.
│   └── main.js              # Entry point
├── dist/                    # Web build output
├── build-native.sh          # Cross-platform build script
├── package.json
└── go.mod
```

---

## 📦 Build & Release

```bash
# Web only
npm run build

# Native runner (current platform)
cd cmd/omnireader && go build -o omnireader .

# All platforms
./build-native.sh

# Output: dist-native/omnireader-2.0.0-{os}-{arch}[.exe]
```

---

## 📄 License

MIT — Built with ❤️ by [LEADRACER](https://github.com/LEADRACER)