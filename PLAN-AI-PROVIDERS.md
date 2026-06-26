# OmniReader — AI Provider Alternatives

## Current: OpenRouter
Single API key → access to 300+ models (Owl Alpha, GPT-4o, Claude, Gemini).
_Who it's for:_ Users who grab a free OpenRouter key once and forget about it.

---

## Plan A: Ollama (Local, Offline, No Key)
Run models **on your own machine** — no internet, no API key, no data leaves your computer.

| Aspect | Detail |
|--------|--------|
| **UX** | User installs [Ollama](https://ollama.com/), runs `ollama pull llama3.2:3b`, app auto-detects it at `localhost:11434` |
| **API** | OpenAI-compatible format → reuses existing ai.js fetch code almost 1:1 |
| **Models** | Llama 3.2 (3B), Phi-3, Mistral, Qwen 2.5 — 7B params fits most laptops |
| **RAM** | ~4-8GB for 7B models, ~2GB for 3B |
| **Cost** | Free (electricity only) |
| **Trade-off** | User must install Ollama (~500MB) + pull a model (~2-4GB). Slower than cloud on non-GPU machines |

**Implementation:**
- Add `ollama` as a provider in ai.js — same `/v1/chat/completions` endpoint
- Auto-detect: try `fetch('http://localhost:11434/api/tags')` on load
- No key field needed — just a model selector (`llama3.2:3b`, `phi3:mini`, `mistral:7b`)
- Fall back gracefully if Ollama isn't running

---

## Plan B: Multi-Provider (Bring Your Own API Key)
Let users plug in **any** OpenAI-compatible API key directly.

| Provider | Endpoint | Key Format | Models |
|----------|----------|------------|--------|
| **OpenAI** | `api.openai.com/v1` | `sk-proj-...` | GPT-4o, GPT-4o-mini |
| **Groq** | `api.groq.com/openai/v1` | `gsk_...` | Llama 3.3 70B (free tier!) |
| **Together AI** | `api.together.xyz/v1` | `tgpv1_...` | Llama, Mixtral, DeepSeek |
| **DeepSeek** | `api.deepseek.com/v1` | `sk-...` | DeepSeek V2, R1 |
| **GitHub Models** | `models.inference.ai.azure.com` | `ghp_...` | GPT-4o-mini (free!) |
| **OpenRouter** | `openrouter.ai/api/v1` | `sk-or-...` | 300+ models |

**Implementation:**
- Provider selector in settings (dropdown)
- Each provider has its own base URL, auth header format, and model list
- All use `/chat/completions` (OpenAI-compatible) — same fetch pattern
- Store `{provider, apiKey, model}` per user in localStorage

**Build effort:** ~80 lines of config + 50 lines of UI. Minimal.

---

## Plan C: Anthropic + Google Native APIs
Non-OpenAI providers with different API shapes.

| Provider | Endpoint | Auth | Differences |
|----------|----------|------|-------------|
| **Anthropic** | `api.anthropic.com/v1/messages` | `x-api-key` header | Different request/response format, no `/chat/completions` |
| **Google Gemini** | `generativelanguage.googleapis.com/v1beta/models/...:generateContent` | `?key=` query param | Very different API shape |

**Build effort:** ~150 lines per provider. More code, but users get access to Claude Sonnet / Gemini Flash.

---

## Plan D: Transformers.js (Fully Offline, In-Browser)
Small models run **inside the browser via WebGPU/WASM** — no server, no key, no install.

| Model | Size | Task | Quality |
|-------|------|------|---------|
| `BART-large-cnn` | ~1.6GB | Summarization | Decent (like 2019 SOTA) |
| `T5-small` | ~300MB | Summarization | Mediocre |
| `NLLB-200-distilled-600M` | ~1.2GB | Translation | Good for 200 languages |
| `LaMini-Flan-T5-783M` | ~1.5GB | Summarization + Q&A | Ok for short docs |

**Trade-offs:**
- ✅ Fully offline, zero config, no API key
- ❌ 300MB-1.6GB model download on first use
- ❌ Quality far below LLMs (small models)
- ❌ WebGPU required (Chrome/Edge, not Safari/Firefox)
- ❌ Q&A quality is poor at this size

**Best use:** Default fallback for **translation only** — NLLB is great at translation even at small sizes. For summarization/Q&A, cloud is still far better.

---

## ✅ Recommended path

| Phase | What | Why |
|-------|------|-----|
| **Phase 2** ✅ | OpenRouter (done) | Best dev UX — one key, all models |
| **Phase 2b** | Plan A: **Ollama** | No-key local option. Auto-detect, fallback. ~80 lines of code. |
| **Phase 2c** | Plan B: **Multi-provider** (OpenAI, Groq, DeepSeek, Together) | OpenAI-compatible reuse. Users bring existing keys. ~80 lines. |
| **Phase 3** | Plan A + D: **Translation** via Ollama + NLLB | Best of both worlds — cloud quality + offline fallback |

### Why Ollama first
- **No key, no account** — just `brew install ollama && ollama pull llama3.2:3b`
- **API format is identical** to OpenAI → our `ai.js` already speaks it
- **Auto-detect** on app start → sidebar shows 🟢 "Ollama ready" or 🔴 "No AI configured"
- Users who want cloud can keep using OpenRouter (already works)

Want me to start building the Ollama integration?
