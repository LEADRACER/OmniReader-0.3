const STORAGE_KEY = 'omnireader-state';
const QA_HISTORY_KEY = 'omnireader-qa-history';
const SUMMARY_CACHE_KEY = 'omnireader-summary-cache';
const TRANSLATION_CACHE_KEY = 'omnireader-translation-cache';
const AI_MODEL_KEY = 'omnireader-ai-model';
const AI_PROVIDER_KEY = 'omnireader-ai-provider';
const THEME_KEY = 'omnireader-theme';
const PDF_OUTLINE_KEY = 'omnireader-pdf-outline';

class Store {
  constructor() {
    this.state = this._load();
    this.listeners = new Map();
  }

  _defaultState() {
    return {
      documents: [],
      currentDocId: null,
      mode: 'detailed',
      language: 'English',
      voiceActive: false,
      showOriginal: false,
      aiLoading: false,
      aiError: null,
      theme: localStorage.getItem(THEME_KEY) || 'dark',
    };
  }

  _load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this._defaultState(), ...parsed, documents: [] };
      }
    } catch (_) {}
    return this._defaultState();
  }

  _save() {
    try {
      const toSave = {
        mode: this.state.mode,
        language: this.state.language,
        voiceActive: this.state.voiceActive,
        currentDocId: this.state.currentDocId,
        documents: this.state.documents.map(d => ({
          id: d.id, name: d.name, type: d.type,
          content: d.type !== 'pdf' ? d.content : null,
          data: null, createdAt: d.createdAt,
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (_) {}
  }

  subscribe(key, fn) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }

  _emit(key, payload) {
    this.listeners.get(key)?.forEach(fn => fn(payload, this.state));
  }

  _emitState() {
    this._emit('state', this.state);
  }

  getState() { return this.state; }

  // === Documents ===
  addDocument(file, content, data) {
    const doc = {
      id: Date.now().toString(),
      name: file.name,
      type: file.name.endsWith('.pdf') ? 'pdf'
        : file.name.endsWith('.md') ? 'markdown' : 'text',
      content: content || null,
      data: data || null,
      createdAt: Date.now(),
    };
    this.state.documents = [...this.state.documents, doc];
    this.state.currentDocId = doc.id;
    this.state.language = 'English';
    this._save();
    this._emit('documents', this.state.documents);
    this._emit('currentDoc', doc);
    this._emitState();
    return doc;
  }

  selectDocument(id) {
    this.state.currentDocId = id;
    this.state.language = 'English';
    this._save();
    this._emit('currentDoc', this.getCurrentDoc());
    this._emitState();
  }

  getCurrentDoc() {
    return this.state.documents.find(d => d.id === this.state.currentDocId) || null;
  }

  deleteDocument(id) {
    this.state.documents = this.state.documents.filter(d => d.id !== id);
    if (this.state.currentDocId === id) {
      this.state.currentDocId = this.state.documents[0]?.id || null;
    }
    // Clean up cached data
    this._clearQaHistory(id);
    this._clearSummaryCache(id);
    this._clearTranslationCache(id);
    this._clearPdfOutline(id);
    this._save();
    this._emit('documents', this.state.documents);
    this._emit('currentDoc', this.getCurrentDoc());
    this._emitState();
  }

  // === Modes ===
  setMode(mode) {
    this.state.mode = mode;
    this._emit('mode', mode);
    this._emitState();
  }

  setLanguage(lang) {
    this.state.language = lang;
    this.state.showOriginal = false;
    this._emit('language', lang);
    this._emitState();
  }

  setShowOriginal(val) {
    this.state.showOriginal = val;
    this._emit('showOriginal', val);
    this._emitState();
  }

  toggleVoice() {
    this.state.voiceActive = !this.state.voiceActive;
    this._emit('voice', this.state.voiceActive);
    return this.state.voiceActive;
  }

  // === AI State ===
  setAiLoading(loading) {
    this.state.aiLoading = loading;
    this._emit('aiLoading', loading);
    this._emitState();
  }

  setAiError(error) {
    this.state.aiError = error;
    this._emit('aiError', error);
    this._emitState();
  }

  // === Summary Cache ===
  getSummaryCache(docId) {
    try {
      const cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
      return cache[docId] || null;
    } catch { return null; }
  }

  setSummaryCache(docId, summary) {
    try {
      const cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
      cache[docId] = { summary, cachedAt: Date.now() };
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  _clearSummaryCache(docId) {
    try {
      const cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
      delete cache[docId];
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  // === Q&A History ===
  getQaHistory(docId) {
    try {
      const all = JSON.parse(localStorage.getItem(QA_HISTORY_KEY) || '{}');
      return all[docId] || [];
    } catch { return []; }
  }

  addQaEntry(docId, question, answer) {
    try {
      const all = JSON.parse(localStorage.getItem(QA_HISTORY_KEY) || '{}');
      if (!all[docId]) all[docId] = [];
      all[docId].push({ question, answer, timestamp: Date.now() });
      // Keep last 50
      if (all[docId].length > 50) all[docId] = all[docId].slice(-50);
      localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(all));
      this._emit('qaHistory', all[docId]);
    } catch (_) {}
  }

  _clearQaHistory(docId) {
    try {
      const all = JSON.parse(localStorage.getItem(QA_HISTORY_KEY) || '{}');
      delete all[docId];
      localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  // === Translation Cache ===
  getTranslationCache(docId, lang) {
    try {
      const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
      return cache[`${docId}:${lang}`] || null;
    } catch { return null; }
  }

  setTranslationCache(docId, lang, translatedText) {
    try {
      const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
      cache[`${docId}:${lang}`] = { text: translatedText, cachedAt: Date.now() };
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  _clearTranslationCache(docId) {
    try {
      const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
      Object.keys(cache).forEach(k => { if (k.startsWith(docId + ':')) delete cache[k]; });
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  // === AI Model Setting ===
  getAiModel() {
    return localStorage.getItem(AI_MODEL_KEY) || 'openrouter/owl-alpha';
  }

  setAiModel(model) {
    localStorage.setItem(AI_MODEL_KEY, model);
  }

  // === AI Provider Setting ===
  getAiProvider() {
    return localStorage.getItem(AI_PROVIDER_KEY) || 'openrouter';
  }

  setAiProvider(provider) {
    localStorage.setItem(AI_PROVIDER_KEY, provider);
  }

  // === PDF Outline ===
  getPdfOutline(docId) {
    try {
      const cache = JSON.parse(localStorage.getItem(PDF_OUTLINE_KEY) || '{}');
      return cache[docId] || null;
    } catch { return null; }
  }

  setPdfOutline(docId, outline) {
    try {
      const cache = JSON.parse(localStorage.getItem(PDF_OUTLINE_KEY) || '{}');
      cache[docId] = { outline, cachedAt: Date.now() };
      localStorage.setItem(PDF_OUTLINE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  _clearPdfOutline(docId) {
    try {
      const cache = JSON.parse(localStorage.getItem(PDF_OUTLINE_KEY) || '{}');
      delete cache[docId];
      localStorage.setItem(PDF_OUTLINE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  // === Theme ===
  getTheme() {
    return this.state.theme || 'dark';
  }

  setTheme(theme) {
    this.state.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    this._emit('theme', theme);
    this._emitState();
  }

  toggleTheme() {
    this.setTheme(this.state.theme === 'dark' ? 'light' : 'dark');
  }
}

export const store = new Store();
