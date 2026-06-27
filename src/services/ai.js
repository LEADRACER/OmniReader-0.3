/**
 * OmniReader — Multi-Provider AI Service
 * Supports: OpenRouter, Ollama, OpenAI, Groq, DeepSeek, Together AI, GitHub Models
 */

// ============================================
// PROVIDER CONFIGURATIONS
// ============================================

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: 'sk-or-',
    keyStorageKey: 'omnireader-openrouter-key',
    models: [
      { id: 'openrouter/owl-alpha', name: '🦉 Owl Alpha (recommended)', speed: 'fast', quality: 'high' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini ⚡', speed: 'fast', quality: 'high' },
      { id: 'openai/gpt-4o', name: 'GPT-4o 🧠', speed: 'medium', quality: 'premium' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku ⚡', speed: 'fast', quality: 'high' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet 🧠', speed: 'medium', quality: 'premium' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash ⚡', speed: 'fast', quality: 'high' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', speed: 'medium', quality: 'high' },
    ],
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: 'sk-proj-',
    keyStorageKey: 'omnireader-openai-key',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini ⚡', speed: 'fast', quality: 'high' },
      { id: 'gpt-4o', name: 'GPT-4o 🧠', speed: 'medium', quality: 'premium' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', speed: 'fast', quality: 'standard' },
    ],
  },
  groq: {
    name: 'Groq (Free Tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: 'gsk_',
    keyStorageKey: 'omnireader-groq-key',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (FREE) 🎁', speed: 'very fast', quality: 'high' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant ⚡', speed: 'very fast', quality: 'standard' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', speed: 'very fast', quality: 'standard' },
    ],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: 'sk-',
    keyStorageKey: 'omnireader-deepseek-key',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 🧠', speed: 'medium', quality: 'high' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoning)', speed: 'slow', quality: 'premium' },
    ],
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: 'tgpv1_',
    keyStorageKey: 'omnireader-together-key',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', speed: 'fast', quality: 'high' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', speed: 'fast', quality: 'high' },
      { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek V2.5', speed: 'medium', quality: 'high' },
    ],
  },
  github: {
    name: 'GitHub Models (Free)',
    baseUrl: 'https://models.inference.ai.azure.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: 'ghp_',
    keyStorageKey: 'omnireader-github-key',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (FREE) 🎁', speed: 'fast', quality: 'high' },
      { id: 'gpt-4o', name: 'GPT-4o', speed: 'medium', quality: 'premium' },
    ],
  },
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    keyPrefix: '',
    keyStorageKey: null, // No key needed
    models: [], // Populated dynamically via /api/tags
    isLocal: true,
    requiresDetection: true,
  },
};

// Demo key configuration (embedded, low balance)
const DEMO_KEY = 'sk-or-v1-DEMO_KEY_PLACEHOLDER_REPLACE_WITH_REAL_KEY'; // Will be replaced at build time
const DEMO_BALANCE_USD = 2.00; // $2 demo balance
const DEMO_COST_PER_SUMMARY = 0.004; // ~$0.004 per summary (Owl Alpha)
const DEMO_COST_PER_QA = 0.002; // ~$0.002 per Q&A turn
const DEMO_COST_PER_TRANSLATION = 0.001; // ~$0.001 per translation

// ============================================
// STATE & HELPERS
// ============================================

let currentProviderId = 'openrouter';
let ollamaAvailable = false;
let ollamaModels = [];
let demoUsage = { summaries: 0, qa: 0, translations: 0, spent: 0 };

function getProvider(id = currentProviderId) {
  return PROVIDERS[id] || PROVIDERS.openrouter;
}

function getCurrentProvider() {
  return getProvider(currentProviderId);
}

function getKey(providerId = currentProviderId) {
  const provider = getProvider(providerId);
  if (!provider.keyStorageKey) return '';
  return localStorage.getItem(provider.keyStorageKey) || '';
}

function getModel() {
  return localStorage.getItem('omnireader-ai-model') || 'openrouter/owl-alpha';
}

function setModel(model) {
  localStorage.setItem('omnireader-ai-model', model);
}

function setProvider(providerId) {
  currentProviderId = providerId;
  localStorage.setItem('omnireader-ai-provider', providerId);
}

function getProviderId() {
  return localStorage.getItem('omnireader-ai-provider') || 'openrouter';
}

// Demo usage tracking
function loadDemoUsage() {
  try {
    const saved = localStorage.getItem('omnireader-demo-usage');
    if (saved) demoUsage = JSON.parse(saved);
  } catch (_) {}
  // Initialize spent from counts
  demoUsage.spent = (demoUsage.summaries * DEMO_COST_PER_SUMMARY) +
                    (demoUsage.qa * DEMO_COST_PER_QA) +
                    (demoUsage.translations * DEMO_COST_PER_TRANSLATION);
}

function saveDemoUsage() {
  localStorage.setItem('omnireader-demo-usage', JSON.stringify(demoUsage));
}

function getDemoRemaining() {
  return Math.max(0, DEMO_BALANCE_USD - demoUsage.spent);
}

function getDemoEstimatedSummariesLeft() {
  const remaining = getDemoRemaining();
  return Math.floor(remaining / DEMO_COST_PER_SUMMARY);
}

function trackDemoUsage(type) {
  if (currentProviderId !== 'openrouter') return; // Only track OpenRouter demo usage
  if (!hasValidKey() && !isUsingDemoKey()) return;
  
  demoUsage[type]++;
  demoUsage.spent = (demoUsage.summaries * DEMO_COST_PER_SUMMARY) +
                    (demoUsage.qa * DEMO_COST_PER_QA) +
                    (demoUsage.translations * DEMO_COST_PER_TRANSLATION);
  saveDemoUsage();
}

function isUsingDemoKey() {
  const key = getKey('openrouter');
  return key === DEMO_KEY || key.startsWith('sk-or-v1-DEMO');
}

function hasValidKey(providerId = currentProviderId) {
  const provider = getProvider(providerId);
  if (provider.isLocal) return ollamaAvailable;
  const key = getKey(providerId);
  return key.length > 0 && key.startsWith(provider.keyPrefix);
}

function getEffectiveKey() {
  const provider = getCurrentProvider();
  if (provider.isLocal) return 'ollama-local';
  
  const userKey = getKey();
  if (userKey && userKey.startsWith(provider.keyPrefix)) {
    return userKey;
  }
  // Fall back to demo key for OpenRouter
  if (currentProviderId === 'openrouter' && DEMO_KEY !== 'sk-or-..._KEY') {
    return DEMO_KEY;
  }
  return '';
}

// ============================================
// OLLAMA DETECTION
// ============================================

async function detectOllama() {
  const provider = PROVIDERS.ollama;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${provider.baseUrl.replace('/v1', '')}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      ollamaModels = (data.models || []).map(m => m.name);
      ollamaAvailable = ollamaModels.length > 0;
      return ollamaAvailable;
    }
  } catch (_) {
    ollamaAvailable = false;
    ollamaModels = [];
  }
  return false;
}

function getOllamaModels() {
  return ollamaModels.map(name => ({ id: name, name, speed: 'local', quality: 'varies' }));
}

// ============================================
// UNIFIED API CALL
// ============================================

async function callProvider(messages, options = {}) {
  const provider = getCurrentProvider();
  const model = options.model || getModel();
  const maxTokens = options.maxTokens || 2000;
  const temperature = options.temperature ?? 0.3;
  const key = getEffectiveKey();

  if (!key) {
    throw new Error(`No API key for ${provider.name}. Please configure in settings.`);
  }

  const headers = {
    'Content-Type': 'application/json',
    [provider.authHeader]: `${provider.authPrefix}${key}`,
  };

  // OpenRouter-specific headers
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'OmniReader';
  }

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `API error ${res.status}`;
    
    // Special handling for common errors
    if (res.status === 401) {
      throw new Error(`Invalid API key for ${provider.name}. Please check your key.`);
    }
    if (res.status === 429) {
      throw new Error(`Rate limited by ${provider.name}. Please wait or switch providers.`);
    }
    if (res.status === 402 || msg.includes('insufficient') || msg.includes('balance')) {
      if (currentProviderId === 'openrouter' && isUsingDemoKey()) {
        throw new Error('Demo key depleted. Please add your own OpenRouter key for continued use.');
      }
      throw new Error(`Insufficient balance on ${provider.name}.`);
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

// ============================================
// HIGH-LEVEL FUNCTIONS
// ============================================

export async function getSummary(documentName, documentText, docType) {
  const prompt = `You are a document summarization engine. Analyze the following ${docType.toUpperCase()} document titled "${documentName}" and provide:

1. **Core Theme/Topic** — What is this document about? (1-2 sentences)
2. **Key Takeaways** — 3-5 bullet points covering the most important information
3. **Structure Overview** — How the document is organized

Keep the summary concise and actionable. Use markdown formatting.

=== DOCUMENT START ===
${documentText.slice(0, 8000)}
=== DOCUMENT END ===`;

  const result = await callProvider([
    { role: 'system', content: 'You are a precise document summarization assistant. Return clean markdown.' },
    { role: 'user', content: prompt },
  ], { maxTokens: 1500, temperature: 0.3 });

  trackDemoUsage('summaries');
  return result;
}

export async function askQuestion(documentName, documentText, docType, conversationHistory, newQuestion) {
  const systemPrompt = `You are a document Q&A assistant. Answer questions based ONLY on the content of the document provided below. If the answer cannot be found in the document, say so clearly — do not make up information.

Document title: "${documentName}"
Document type: ${docType.toUpperCase()}

=== DOCUMENT CONTENT ===
${documentText.slice(0, 10000)}
=== DOCUMENT END ===`;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  const recentHistory = conversationHistory.slice(-10);
  for (const entry of recentHistory) {
    messages.push({ role: 'user', content: entry.question });
    if (entry.answer) messages.push({ role: 'assistant', content: entry.answer });
  }

  messages.push({ role: 'user', content: newQuestion });

  const result = await callProvider(messages, { maxTokens: 1000, temperature: 0.2 });
  trackDemoUsage('qa');
  return result;
}

export async function getTranslation(text, targetLang, sourceLang = 'auto') {
  // Check if offline translation is enabled
  const offlineTranslation = await getOfflineTranslation();
  if (offlineTranslation.getOfflineTranslationEnabled()) {
    try {
      return await offlineTranslation.translateOffline(text, targetLang, sourceLang);
    } catch (e) {
      console.warn('Offline translation failed, falling back to online:', e);
      // Fall through to online translation
    }
  }

  // Try Chrome Translation API first (zero-setup)
  if (await tryChromeTranslation(text, targetLang, sourceLang)) {
    return await tryChromeTranslation(text, targetLang, sourceLang);
  }

  // Fall back to LLM translation
  const prompt = `Translate the following text to ${targetLang}. 
Only return the translated text, nothing else.

Source language: ${sourceLang}
Target language: ${targetLang}

TEXT TO TRANSLATE:
${text.slice(0, 4000)}`;

  const result = await callProvider([
    { role: 'system', content: 'You are a translator. Return only the translated text, no preamble.' },
    { role: 'user', content: prompt },
  ], { maxTokens: 2000, temperature: 0.1 });

  trackDemoUsage('translations');
  return result;
}

// ============================================
// CHROME TRANSLATION API (Zero-Setup)
// ============================================

async function tryChromeTranslation(text, targetLang, sourceLang) {
  // Check if Chrome Translation API is available
  if (!window.translation || !window.translation.createTranslator) {
    return null;
  }

  const langMap = {
    'English': 'en', 'Spanish': 'es', 'French': 'fr',
    'Japanese': 'ja', 'German': 'de', 'Chinese': 'zh'
  };

  const sourceCode = langMap[sourceLang] || 'en';
  const targetCode = langMap[targetLang];

  if (!targetCode) return null;

  try {
    const translator = await window.translation.createTranslator({
      sourceLanguage: sourceCode,
      targetLanguage: targetCode,
    });
    const result = await translator.translate(text.slice(0, 5000)); // Chrome API has limits
    return result;
  } catch (e) {
    console.warn('Chrome Translation API failed, falling back to LLM:', e);
    return null;
  }
}

// ============================================
// PUBLIC API
// ============================================

export function getProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    name: p.name,
    isLocal: p.isLocal || false,
    requiresKey: !p.isLocal,
    hasKey: p.isLocal ? ollamaAvailable : hasValidKey(id),
    models: p.isLocal ? getOllamaModels() : p.models,
    available: p.isLocal ? ollamaAvailable : true,
  }));
}

// Import offline translation dynamically to avoid bundle bloat if not used
let offlineTranslationModule = null;
async function getOfflineTranslation() {
  if (!offlineTranslationModule) {
    offlineTranslationModule = await import('./translation-offline.js');
  }
  return offlineTranslationModule;
}

export function getCurrentProviderInfo() {
  return getProviders().find(p => p.id === currentProviderId) || getProviders()[0];
}

export function setProviderId(providerId) {
  if (PROVIDERS[providerId]) {
    setProvider(providerId);
    // Auto-switch to first model of new provider
    const provider = PROVIDERS[providerId];
    if (provider.models.length > 0 || provider.isLocal) {
      const firstModel = provider.isLocal ? getOllamaModels()[0]?.id : provider.models[0].id;
      if (firstModel) setModel(firstModel);
    }
  }
}

export function getModelInfo() {
  const provider = getCurrentProvider();
  const modelId = getModel();
  if (provider.isLocal) {
    return getOllamaModels().find(m => m.id === modelId) || { name: modelId };
  }
  return provider.models.find(m => m.id === modelId) || { name: modelId };
}

export function hasApiKey() {
  return hasValidKey();
}

export function getApiKey() {
  return getKey();
}

export function setApiKey(key) {
  const provider = getCurrentProvider();
  if (provider.keyStorageKey) {
    localStorage.setItem(provider.keyStorageKey, key);
  }
}

export function clearApiKey() {
  const provider = getCurrentProvider();
  if (provider.keyStorageKey) {
    localStorage.removeItem(provider.keyStorageKey);
  }
}

export function getDemoStatus() {
  loadDemoUsage();
  return {
    isUsingDemo: isUsingDemoKey(),
    remaining: getDemoRemaining(),
    estimatedSummariesLeft: getDemoEstimatedSummariesLeft(),
    usage: { ...demoUsage },
  };
}

export async function initializeAI() {
  // Load saved provider
  currentProviderId = getProviderId();
  
  // Detect Ollama
  await detectOllama();
  
  // Load demo usage
  loadDemoUsage();
  
  // If no provider has a key and Ollama not available, ensure OpenRouter is selected
  const providers = getProviders();
  const hasAnyKey = providers.some(p => p.hasKey);
  if (!hasAnyKey && currentProviderId !== 'openrouter') {
    setProviderId('openrouter');
  }
  
  return getCurrentProviderInfo();
}

export function isOllamaAvailable() {
  return ollamaAvailable;
}

export function refreshOllama() {
  return detectOllama();
}

// Export PROVIDERS for UI reference
export { PROVIDERS };