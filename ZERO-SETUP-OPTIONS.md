# OmniReader — Zero-Setup AI Options

**Goal:** User opens `index.html` or `dist/` — AI just works. No CLI, no API keys, no model downloads the user initiates.

---

## Option 1: Embed a Demo API Key ⭐

Ship the app with a **low-limit shared OpenRouter key** baked in. The user gets summarization & Q&A immediately — zero config.

| Pro | Con |
|-----|-----|
| ✅ Best quality (full LLM) | ❌ Key visible in source (anyone can extract it) |
| ✅ Works in every browser | ❌ If it leaks/posts on GitHub → key gets revoked |
| ✅ Same code — zero changes | ❌ Rate-limited / capped balance |
| ✅ 100% reliable | |

**Mitigations if we do this:**
- Key has **$1-2 balance** — enough for ~500 summaries. When it runs out, UI shows "Demo depleted — configure your own key"
- Soft rate limit (20 req/min) so one user can't drain it
- Settings page still lets users replace with their own key
- Works as a **try-before-you-configure** experience

**Pattern used by:** Linear, Notion, Figma (trial credits), many indie apps.

---

## Option 2: Chrome Built-in AI (Prompt API)

Google ships **Gemini Nano** inside Chrome 128+. The browser has a `window.ai` API — zero setup, zero download (the model ships with Chrome).

```js
// Can we use this?
if (window.ai?.canCreateSummary) {
  const summarizer = await window.ai.createSummarizer();
  const summary = await summarizer.summarize(docText);
}
```

| Pro | Con |
|-----|-----|
| ✅ Truly zero setup — ships with browser | ❌ Chrome-only (no Firefox/Safari/Edge) |
| ✅ No download, no key | ❌ **Still experimental** — requires `chrome://flags/#optimization-guide-on-device-model` enabled |
| ✅ Works offline | ❌ Gemini Nano quality is weaker than GPT-4o-mini |
| | ❌ API surface still in flux — could break |

**Status (June 2026):** The Prompt API is shipping in Chrome but still behind a flag in stable. Not reliable enough to bet the app on.

---

## Option 3: Transformers.js (In-Browser Model)

Load a small AI model **from HuggingFace CDN** on first use. The user doesn't install anything — the browser downloads the model automatically and caches it in IndexedDB.

```js
import { pipeline } from '@xenova/transformers';

// On first use — downloads ~300MB, caches in browser
const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
const summary = await summarizer(docText);
```

| Pro | Con |
|-----|-----|
| ✅ Works in any browser with WebGPU/WASM | ❌ **300MB-1.6GB download** on first use |
| ✅ No keys, no accounts | ❌ User sees "Loading AI model..." for 30-90s |
| ✅ Fully offline after first load | ❌ **Quality is poor** — DistilBART is 2019-era tech |
| ✅ Works without any server | ❌ Q&A models don't exist at this size (only summarization) |

**Suitable models:**

| Model | Size | Task | Quality |
|-------|------|------|---------|
| `Xenova/distilbart-cnn-6-6` | ~300MB | Summarize | Ok for short docs |
| `Xenova/t5-small` | ~250MB | Summarize | Weak |
| `Xenova/LaMini-Flan-T5-783M` | ~1.5GB | Summarize + basic QA | Decent for short docs |
| `Xenova/nllb-200-distilled-600M` | ~1.2GB | **Translation** | Good (200 languages) |

**Best use:** NLLB for **Phase 3 Translation** only — it's actually good at translation even at small sizes.

---

## Option 4: Browser Built-in Translation API

Chrome has a built-in translation engine (the same one that powers "Translate this page") — exposed as `translation` API. Zero setup, zero download, works on any page.

```js
// Chrome Translation API
const translator = await self.translation.createTranslator({
  sourceLanguage: 'en',
  targetLanguage: 'es'
});
const result = await translator.translate(text);
```

| Pro | Con |
|-----|-----|
| ✅ Ships with Chrome — zero setup | ❌ Chrome only (for now) |
| ✅ No download, no key | ❌ Limited to ~10 language pairs |
| ✅ Good quality (Google Translate) | ❌ Only does translation, not summarization |
| ✅ Works offline | |

---

## Option 5: Streaming via a Free Public API

Some providers offer **free tiers without requiring a credit card**:

| Provider | Free tier limit | API key needed? | Setup |
|----------|----------------|-----------------|-------|
| **GitHub Models** | GPT-4o-mini, 60 req/min | GitHub PAT | User needs a GitHub account |
| **Groq** | Llama 3.3 70B, 30 req/min | API key | Free signup, no card |
| **Google Gemini** | Gemini 1.5 Flash, 60 req/min | API key | Free signup, no card |
| **HuggingFace Inference** | Various, rate-limited | Token (free) | Free signup |

None of these are truly zero-setup — user still needs an account.

---

## ✅ Recommended: Option 1 + 3 hybrid

| Phase | Approach | Setup for user |
|-------|----------|---------------|
| **Summary / Q&A** | **Option 1** — Embed a demo OpenRouter key | **Zero** — works on open. User can replace with own key later for unlimited use |
| **Translation** | **Option 4** — Chrome built-in Translation API | **Zero** — browser ships it. Fallback to OpenRouter for non-Chrome |
| **Offline fallback** | **Option 3** — Transformers.js NLLB for translation | One-time 1.2GB download (automatic, user just waits) |

**The key insight:** A demo key with $1-2 balance gives users a real taste of the app's capability with zero friction. The "configure your own key" option is always there for power users who want unlimited use.

Want me to implement Option 1 (embed demo key) + add a usage tracker so users know their demo balance?
