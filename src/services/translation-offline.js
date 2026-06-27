/**
 * OmniReader — Offline Translation Service (Transformers.js NLLB)
 * Fully local, no API key, no internet required after model download.
 */

import { pipeline } from '@xenova/transformers';

// NLLB-200-distilled-600M model info
const NLLB_MODEL = 'Xenova/nllb-200-distilled-600M';
const NLLB_SIZE_MB = 1200; // ~1.2GB

// Language code mapping (NLLB uses ISO 639-1 + script codes)
const LANG_MAP = {
  'English': 'eng_Latn',
  'Spanish': 'spa_Latn',
  'French': 'fra_Latn',
  'Japanese': 'jpn_Jpan',
  'German': 'deu_Latn',
  'Chinese': 'zho_Hans',
};

let translator = null;
let isLoading = false;
let loadProgress = 0;
let loadCallbacks = [];

// Get stored offline translation preference
function getOfflineTranslationEnabled() {
  return localStorage.getItem('omnireader-offline-translation') === 'true';
}

function setOfflineTranslationEnabled(enabled) {
  localStorage.setItem('omnireader-offline-translation', enabled ? 'true' : 'false');
}

// Initialize the translator (downloads model on first use)
export async function initOfflineTranslator(onProgress) {
  if (translator) return translator;
  if (isLoading) {
    // Return a promise that resolves when loading completes
    return new Promise((resolve, reject) => {
      loadCallbacks.push({ resolve, reject });
    });
  }

  isLoading = true;
  loadProgress = 0;

  try {
    // Use pipeline with progress callback
    translator = await pipeline('translation', NLLB_MODEL, {
      progress_callback: (data) => {
        if (data.status === 'downloading') {
          loadProgress = Math.round((data.loaded / data.total) * 100);
        } else if (data.status === 'progress') {
          loadProgress = Math.round(data.progress * 100);
        }
        if (onProgress) onProgress(loadProgress, data);
        // Notify all waiting callbacks
        loadCallbacks.forEach(cb => cb.resolve ? cb.resolve(translator) : null);
      },
    });

    isLoading = false;
    loadCallbacks = [];
    return translator;
  } catch (error) {
    isLoading = false;
    loadCallbacks.forEach(cb => cb.reject ? cb.reject(error) : null);
    loadCallbacks = [];
    throw error;
  }
}

// Check if model is already cached in IndexedDB
export async function isOfflineModelCached() {
  try {
    // Check if model exists in IndexedDB (Transformers.js caches there)
    const dbs = await indexedDB.databases?.() || [];
    return dbs.some(db => db.name?.includes('transformers') || db.name?.includes('nllb'));
  } catch {
    return false;
  }
}

// Get download progress
export function getDownloadProgress() {
  return { isLoading, progress: loadProgress };
}

// Translate using NLLB
export async function translateOffline(text, targetLang, sourceLang = 'auto') {
  if (!translator) {
    await initOfflineTranslator();
  }

  const sourceCode = sourceLang !== 'auto' ? LANG_MAP[sourceLang] : undefined;
  const targetCode = LANG_MAP[targetLang];

  if (!targetCode) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }

  // NLLB expects format: "src_lang >> tgt_lang" or just tgt_lang if src is auto
  const options = sourceCode 
    ? { src_lang: sourceCode, tgt_lang: targetCode }
    : { tgt_lang: targetCode };

  // Split long text into chunks (NLLB has token limits)
  const maxChunkLength = 500; // Conservative limit for 600M model
  const chunks = splitTextIntoChunks(text, maxChunkLength);
  
  const results = [];
  for (const chunk of chunks) {
    const result = await translator(chunk, options);
    results.push(result[0]?.translation_text || '');
  }

  return results.join(' ');
}

// Helper: split text into chunks at sentence boundaries
function splitTextIntoChunks(text, maxLength) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

// Get available offline languages
export function getOfflineLanguages() {
  return Object.keys(LANG_MAP);
}

// Clear cached model (for testing or reset)
export function clearOfflineModel() {
  translator = null;
  // Note: Model files remain in IndexedDB until browser clears them
}

// Export state for UI
export function getOfflineTranslationState() {
  return {
    enabled: getOfflineTranslationEnabled(),
    isLoading,
    progress: loadProgress,
    modelCached: null, // Will be checked async
  };
}

// Public API
export async function initializeOfflineTranslation() {
  const enabled = getOfflineTranslationEnabled();
  if (enabled) {
    // Pre-warm in background
    initOfflineTranslator().catch(() => {});
  }
}