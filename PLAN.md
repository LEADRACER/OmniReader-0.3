# OmniReader v2 — Rebuild Plan

## Vision
A premium, download-and-play universal document reader. No server, no build step required to use — just open `index.html` or unzip `dist/`.

## Architecture
- **Build Tool**: Vite (vanilla JS — dev server for development, `dist/` for deployment)
- **Runtime**: 100% client-side (browser only, zero backend)
- **Persistence**: localStorage / IndexedDB
- **PDF**: `pdfjs-dist` (npm, bundled by Vite)
- **Markdown**: `marked` (npm, bundled by Vite)
- **State**: Custom pub/sub store with auto-save to localStorage
- **Design**: Dark glassmorphism (ported from v1, refined)

---

## Phases

### ✅ Phase 1: Foundation (DONE)
- [x] Scaffold Vite + vanilla JS
- [x] Pub/sub store with localStorage persistence
- [x] App shell: sidebar, toolbar, reader viewport
- [x] Drag & drop upload (PDF, MD, TXT)
- [x] Markdown renderer (marked)
- [x] Plain text renderer
- [x] PDF renderer (pdfjs-dist, multi-page)
- [x] Document library sidebar (select, delete)
- [x] Glassmorphism design system
- [x] Responsive layout (desktop, tablet collapse, mobile)
- [x] Build verification (18 modules, 0 errors)

### ✅ Phase 2: Reading Modes (Real AI) (DONE)
- [x] Summary mode — real LLM summarization via OpenRouter API
- [x] Q&A mode — interactive chat with document as context
- [x] Cache summaries in localStorage to avoid re-querying
- [x] Chat history per document (persisted in localStorage)
- [x] API key settings panel (OpenRouter key + model selection)
- [x] 6 supported AI models (GPT-4o Mini, GPT-4o, Claude Haiku, Claude Sonnet, Gemini 2.0 Flash, Llama 3.3 70B)

### ✅ Phase 3: Translation (DONE)
- [x] OpenRouter translation API — `getTranslation()` via Owl Alpha
- [x] Language selector dropdown (English / Spanish / French / Japanese / German / Chinese)
- [x] One-click translate — select language → auto-fetch from OpenRouter
- [x] "Show Original / Show Translated" toggle without re-fetching
- [x] Translate cache per (doc, language) in localStorage
- [x] Caches cleaned on document delete

### ✅ Phase 4: Voice & Accessibility (DONE)
- [x] Voice service: dedicated module with pause/resume/stop/speed control
- [x] Voice control bar: appears in the toolbar when TTS is active — ⏸ play/pause, ⏹ stop, speed selector (0.5x–2.0x)
- [x] Search in document: ⌘F / Ctrl+F or `/` — floating search bar with match counter, prev/next navigation, yellow highlights
- [x] Keyboard shortcuts:
  - `Space` → pause/resume TTS
  - `s` → stop TTS
  - `Escape` → stop TTS or close search
  - `Ctrl+F`/`Cmd+F` or `/` → toggle search
  - `Enter`/`Shift+Enter` → next/prev match
  - `n`/`p` → next/prev match (when search active)

### ✅ Phase 5: Polish & Ship (DONE)
- [x] **Libral light theme** — full `[data-theme="light"]` override (170+ lines): lavender-white bg, frosted glass, purple accent, light nebula, inverted text, dark-mode components all reskinned
- [x] **Theme toggle** — ☀️/🌙 button in sidebar footer, persisted in localStorage, applied on init (no flash)
- [x] **Export** — 📥 button in toolbar → downloads current view as .md or .txt (respects current mode: summary, translated, etc). ⌘E shortcut
- [x] **PDF error boundaries** — per-page failover (skips bad pages, shows inline error), friendly messages for encrypted/corrupted/invalid PDFs, retry button
- [x] **Skeleton loaders** — shimmer animation during doc load and PDF rendering, themed for dark + light
- [x] **PWA** — manifest.json with standalone mode + SVG icon, service worker with cache-first (assets) + network-first (HTML), skips OpenRouter API

---

## Build & Run
```bash
# Development
npm install
npm run dev

# Production build
npm run build   # → dist/

# Serve the build
npx serve dist  # or open dist/index.html directly
```

## File Structure
```
src/
├── main.js                 # Entry point
├── app.js                  # App initialization
├── store.js                # State management + localStorage
├── style.css               # All styles (glassmorphism design system)
├── utils.js                # Helpers
├── components/
│   ├── sidebar.js          # Document library sidebar
│   ├── toolbar.js          # Mode switcher, language, voice
│   ├── reader.js           # Reader viewport (renders docs)
│   └── upload-modal.js     # Drag & drop upload modal
└── readers/
    ├── markdown.js         # Markdown → HTML (marked)
    ├── text.js             # Plain text → HTML
    └── pdf.js              # PDF → Canvas (pdfjs-dist)
```
