# OmniReader 🌌

A premium, universal document reader with AI-powered summaries, interactive Q&A, real-time translation, and voice playback — all running 100% client-side.

**Download & Play** — no server, no backend required. Unzip `dist/`, open `index.html`, done.

## ✨ Features

### 📄 Multi-Format Reader
- **PDF** — multi-page rendering via pdfjs-dist with error recovery
- **Markdown** — full GFM support via marked
- **Plain Text** — clean monospace rendering

### 🧠 AI-Powered Reading (OpenRouter)
- **Summary Mode** — one-click LLM summarization
- **Q&A Mode** — interactive chat with your document as context, conversation history persisted
- **6 Models** — 🦉 Owl Alpha (default), GPT-4o, GPT-4o Mini, Claude 3.5 Haiku/Sonnet, Gemini 2.0 Flash, Llama 3.3 70B
- **Bring Your Own Key** — [get a free OpenRouter key](https://openrouter.ai/keys), paste it once, done

### 🌍 Translation
- **6 Languages** — English, Spanish, French, Japanese, German, Chinese
- **One-click** — select language, document translates instantly
- **Original/Translated toggle** — switch back and forth without re-fetching
- **Cached** — translations persist per (doc, language) in localStorage

### 🔊 Voice (TTS)
- **Read Aloud** — browser-native speech synthesis, language-aware voice selection
- **Controls** — pause/resume, stop, speed selector (0.5x–2.0x)
- **Keyboard** — `Space` to pause/play, `s` to stop

### 🔍 Search
- **Find in Document** — `⌘F` or `/` to search
- **Match navigation** — prev/next with yellow highlights, match counter
- **Keyboard** — `Enter`/`Shift+Enter` or `n`/`p` to navigate matches

### 📥 Export
- **Download** current view as `.md` or `.txt`
- Respects current mode — export summaries, translations, or Q&A conversations
- `⌘E` shortcut

### 🎨 Themes
- **Dark** — deep glassmorphism with purple-cyan nebula
- **Libral Light** — lavender-white with frosted glass and purple accents
- Toggle with ☀️/🌙 button, persisted in localStorage

### ⚡ PWA
- Installable as standalone app
- Service worker caches assets for offline use
- Skip OpenRouter API calls from caching (always fresh)

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘F` / `/` | Search in document |
| `⌘E` | Export current view |
| `Space` | Pause / resume TTS |
| `s` | Stop TTS |
| `Escape` | Stop TTS or close search |
| `Enter` / `Shift+Enter` | Next / prev search match |
| `n` / `p` | Next / prev match (search active) |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/LEADRACER/OmniReader-0.3.git
cd OmniReader-0.3

# Install & build
npm install
npm run build

# Open
open dist/index.html
```

### Development

```bash
npm run dev    # Start Vite dev server
npm run build  # Production build → dist/
```

## 🏗️ Architecture

```
src/
├── main.js                 # Entry point + SW registration
├── app.js                  # App initialization
├── store.js                # State management (pub/sub + localStorage)
├── style.css               # Full design system (dark + light themes)
├── utils.js                # Helpers
├── components/
│   ├── sidebar.js          # Document library + settings + theme toggle
│   ├── toolbar.js          # Mode switcher, language, voice controls, export
│   ├── reader.js           # Reader viewport (doc rendering + AI modes)
│   ├── search.js           # ⌘F search overlay with highlights
│   └── upload-modal.js     # Drag & drop upload modal
├── readers/
│   ├── markdown.js         # Markdown → HTML (marked)
│   ├── text.js             # Plain text → HTML
│   └── pdf.js              # PDF → Canvas (pdfjs-dist, error recovery)
└── services/
    ├── ai.js               # OpenRouter API (summary, Q&A, translation)
    ├── voice.js             # Web Speech API (speak, pause, resume, speed)
    └── keyboard.js          # Global keyboard shortcuts
```

| Layer | Technology |
|-------|-----------|
| Build | Vite 8 (vanilla JS) |
| PDF | pdfjs-dist |
| Markdown | marked |
| AI | OpenRouter API (Owl Alpha default) |
| State | Custom pub/sub + localStorage |
| TTS | Web Speech API |
| Design | CSS custom properties, glassmorphism |
| PWA | Service Worker + Web Manifest |

## 🔑 API Key

OmniReader uses **OpenRouter** for all AI features. You bring your own key:

1. Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys) ($1 free credit)
2. Open OmniReader → click ⚙️ in sidebar → paste your key
3. All AI features unlock instantly

Your key is stored in `localStorage` and only sent to `openrouter.ai`. It never leaves your browser.

## 📋 Build Phases

| Phase | Status |
|-------|--------|
| 1 — Foundation (scaffold, upload, readers, glassmorphism) | ✅ |
| 2 — AI Reading (Summary, Q&A, OpenRouter) | ✅ |
| 3 — Translation (6 languages, caching, toggle) | ✅ |
| 4 — Voice & Search (TTS controls, ⌘F, shortcuts) | ✅ |
| 5 — Polish (light theme, export, error boundaries, PWA) | ✅ |

See [PLAN.md](PLAN.md) for detailed phase breakdown.

---

Built with ❤️ by [LEADRACER](https://github.com/LEADRACER)
