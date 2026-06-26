import { store } from '../store.js';
import { renderMarkdown } from '../readers/markdown.js';
import { renderText } from '../readers/text.js';
import { renderPDF } from '../readers/pdf.js';
import { getSummary, askQuestion, getTranslation, hasApiKey, setApiKey, clearApiKey } from '../services/ai.js';

export function initReader() {
  const reader = document.getElementById('reader');
  let currentDocId = null;

  function render() {
    const state = store.getState();
    const doc = store.getCurrentDoc();

    if (!doc) {
      reader.innerHTML = `
        <div class="doc-header">
          <h2>OmniReader</h2>
        </div>
        <div class="reader-body">
          <div class="empty-state">
            <div class="empty-icon">📚</div>
            <h3>No Document Open</h3>
            <p>Upload a PDF, Markdown, or Text file to get started.</p>
          </div>
        </div>
      `;
      return;
    }

    reader.innerHTML = `
      <div class="doc-header">
        <h2 id="docTitle">${doc.name}</h2>
        <div class="doc-meta">
          <span class="doc-type-badge">${doc.type.toUpperCase()}</span>
          ${doc.type !== 'pdf' ? '<span id="pageCounter" class="page-count">1 / 1</span>' : ''}
        </div>
      </div>
      <div class="reader-body" id="readerContent">
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading ${doc.type === 'pdf' ? 'PDF pages' : 'document'}...</p>
        </div>
      </div>
    `;

    currentDocId = doc.id;
    loadDocument(doc);
  }

  async function loadDocument(doc) {
    const container = document.getElementById('readerContent');
    if (!container) return;

    // Show skeleton loader
    container.innerHTML = `
      <div class="skeleton-loader">
        <div class="skeleton-text" style="width: 70%;"></div>
        <div class="skeleton-text" style="width: 100%;"></div>
        <div class="skeleton-text" style="width: 90%;"></div>
        <div class="skeleton-text" style="width: 95%;"></div>
        <div class="skeleton-text" style="width: 80%;"></div>
        <div class="skeleton-text" style="width: 60%;"></div>
      </div>
    `;

    try {
      if (doc.type === 'pdf') {
        await renderPDF(doc.data, container);
      } else if (doc.type === 'markdown') {
        container.innerHTML = await renderMarkdown(doc.content);
      } else {
        container.innerHTML = renderText(doc.content);
      }
    } catch (err) {
      container.innerHTML = `
        <div class="error-state">
          <div class="glass-card" style="border-color: rgba(255, 100, 100, 0.3); max-width: 420px; margin: 40px auto;">
            <p style="font-size: 1.1rem; margin-bottom: 8px;">⚠️ Failed to load document</p>
            <p style="color: #ff6b6b;">${err.message}</p>
            <small style="color: var(--text-secondary);">Try uploading the file again or using a different format.</small>
          </div>
        </div>
      `;
    }

    // Apply reading mode after load
    const { mode } = store.getState();
    if (mode !== 'detailed') {
      applyAiMode(mode);
    }
  }

  async function applyAiMode(mode) {
    const container = document.getElementById('readerContent');
    if (!container) return;

    const doc = store.getCurrentDoc();
    if (!doc || doc.type === 'pdf') return; // PDF AI support TBD

    const docText = doc.content || '';

    if (mode === 'summary') {
      await showSummary(doc, docText, container);
    } else if (mode === 'qa') {
      showQaInterface(doc, docText, container);
    } else if (mode === 'translated') {
      await showTranslation(doc, docText, container);
    }
  }

  // === SUMMARY ===
  async function showSummary(doc, docText, container) {
    // Check cache first
    const cached = store.getSummaryCache(doc.id);
    if (cached) {
      container.innerHTML = `
        <article class="prose">
          <h1>📋 Summary: ${doc.name}</h1>
          <div class="glass-card summary-content">${cached.summary}</div>
          <hr style="margin: 24px 0; border-color: rgba(255,255,255,0.1);">
          ${container.innerHTML}
        </article>
      `;
      return;
    }

    // Check API key
    if (!hasApiKey()) {
      container.innerHTML = `
        <article class="prose">
          <h1>📋 Summary</h1>
          <div class="glass-card">
            <p>🔑 <strong>OpenRouter API key required</strong></p>
            <p>To generate real AI summaries, enter your OpenRouter API key.</p>
            <button class="btn-action" id="showApiKeyBtn" style="margin-top: 12px; width: auto;">
              Configure API Key
            </button>
          </div>
          <hr style="margin: 24px 0; border-color: rgba(255,255,255,0.1);">
          ${container.innerHTML}
        </article>
      `;
      container.querySelector('#showApiKeyBtn')?.addEventListener('click', showApiKeyModal);
      return;
    }

    // Generate summary
    store.setAiLoading(true);
    store.setAiError(null);

    container.innerHTML = `
      <article class="prose">
        <h1>📋 Generating Summary...</h1>
        <div class="glass-card" style="text-align: center;">
          <div class="spinner" style="margin: 20px auto;"></div>
          <p>Analyzing document with AI...</p>
        </div>
        <hr style="margin: 24px 0; border-color: rgba(255,255,255,0.1);">
        ${container.innerHTML}
      </article>
    `;

    try {
      const summary = await getSummary(doc.name, docText, doc.type);
      store.setSummaryCache(doc.id, summary);
      store.setAiLoading(false);

      container.innerHTML = `
        <article class="prose">
          <h1>📋 Summary: ${doc.name}</h1>
          <div class="glass-card summary-content">${summary}</div>
          <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 8px;">
            ⚡ Generated via ${store.getAiModel()} — cached for reuse
          </p>
          <hr style="margin: 24px 0; border-color: rgba(255,255,255,0.1);">
          ${container.innerHTML}
        </article>
      `;
    } catch (err) {
      store.setAiLoading(false);
      store.setAiError(err.message);
      container.innerHTML = `
        <article class="prose">
          <h1>📋 Summary</h1>
          <div class="glass-card" style="border-color: rgba(255, 100, 100, 0.3);">
            <p style="color: #ff6b6b;">⚠️ Failed to generate summary</p>
            <small style="color: var(--text-secondary);">${err.message}</small>
            <button class="btn-action" id="retrySummaryBtn" style="margin-top: 12px; width: auto;">
              Retry
            </button>
          </div>
          <hr style="margin: 24px 0; border-color: rgba(255,255,255,0.1);">
          ${container.innerHTML}
        </article>
      `;
      container.querySelector('#retrySummaryBtn')?.addEventListener('click', () => {
        showSummary(doc, docText, document.getElementById('readerContent'));
      });
    }
  }

  // === Q&A ===
  function showQaInterface(doc, docText, container) {
    const history = store.getQaHistory(doc.id);

    // Save original content for reference
    const originalHtml = container.innerHTML;

    if (!hasApiKey()) {
      container.innerHTML = `
        <article class="prose">
          <h1>💬 Q&A: ${doc.name}</h1>
          <div class="glass-card">
            <p>🔑 <strong>OpenRouter API key required</strong></p>
            <p>To ask questions about your document, enter your OpenRouter API key.</p>
            <button class="btn-action" id="showApiKeyBtnQa" style="margin-top: 12px; width: auto;">
              Configure API Key
            </button>
          </div>
        </article>
      `;
      container.querySelector('#showApiKeyBtnQa')?.addEventListener('click', showApiKeyModal);
      return;
    }

    container.innerHTML = `
      <article class="prose">
        <h1>💬 Q&A: ${doc.name}</h1>
        <div class="qa-history" id="qaHistory">
          ${history.length === 0
            ? '<p style="color: var(--text-secondary);">Ask a question about this document. The AI will answer based on the content.</p>'
            : history.map((entry, i) => `
              <div class="qa-entry">
                <div class="qa-question">
                  <strong>You:</strong> ${escapeHtml(entry.question)}
                </div>
                <div class="qa-answer">
                  <strong>OmniReader:</strong> ${entry.answer}
                </div>
              </div>
            `).join('')
          }
        </div>
        <div class="qa-input-row">
          <input type="text" class="qa-input" id="qaInput"
            placeholder="Ask a question about this document..."
            ${store.getState().aiLoading ? 'disabled' : ''}>
          <button class="btn-action" id="qaSendBtn"
            ${store.getState().aiLoading ? 'disabled' : ''}
            style="width: auto; padding: 8px 20px;">
            ${store.getState().aiLoading ? '⏳' : 'Ask'}
          </button>
        </div>
        ${store.getState().aiError
          ? `<p style="color: #ff6b6b; font-size: 0.85rem; margin-top: 8px;">⚠️ ${escapeHtml(store.getState().aiError)}</p>`
          : ''
        }
      </article>
    `;

    const input = container.querySelector('#qaInput');
    const sendBtn = container.querySelector('#qaSendBtn');

    async function handleQuestion() {
      const question = input.value.trim();
      if (!question) return;

      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;
      sendBtn.textContent = '⏳';
      store.setAiLoading(true);
      store.setAiError(null);

      try {
        const answer = await askQuestion(
          doc.name, docText, doc.type,
          history, question
        );
        store.addQaEntry(doc.id, question, answer);
        store.setAiLoading(false);
        // Re-render Q&A to show the new entry
        showQaInterface(doc, docText, container);
      } catch (err) {
        store.setAiLoading(false);
        store.setAiError(err.message);
        // Re-render with error
        showQaInterface(doc, docText, container);
      }
    }

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleQuestion();
    });
    sendBtn?.addEventListener('click', handleQuestion);
    input?.focus();
  }

  // === TRANSLATION ===
  async function showTranslation(doc, docText, container) {
    const { language, showOriginal } = store.getState();
    if (language === 'English') return; // shouldn't happen

    // If toggling back to original, re-render original
    if (showOriginal) {
      if (doc.type === 'markdown') {
        container.innerHTML = await renderMarkdown(doc.content);
      } else {
        container.innerHTML = renderText(doc.content);
      }
      return;
    }

    // Check cache
    const cached = store.getTranslationCache(doc.id, language);
    if (cached) {
      if (doc.type === 'markdown') {
        // Render translated markdown as plain text (can't assume markdown syntax survived)
        container.innerHTML = `<article class="prose">${
          escapeHtml(cached.text).replace(/\n/g, '<br>')
        }</article>`;
      } else {
        container.innerHTML = `<article class="prose"><p>${escapeHtml(cached.text).replace(/\n/g, '<br>')}</p></article>`;
      }
      return;
    }

    // Check API key
    if (!hasApiKey()) {
      container.innerHTML = `
        <article class="prose">
          <h1>🌐 Translation</h1>
          <div class="glass-card">
            <p>🔑 <strong>OpenRouter API key required</strong></p>
            <p>To translate documents, enter your OpenRouter API key in settings.</p>
            <button class="btn-action" id="showApiKeyBtnTrans" style="margin-top: 12px; width: auto;">
              Configure API Key
            </button>
          </div>
        </article>
      `;
      container.querySelector('#showApiKeyBtnTrans')?.addEventListener('click', showApiKeyModal);
      return;
    }

    // Translate
    store.setAiLoading(true);
    store.setAiError(null);

    container.innerHTML = `
      <article class="prose">
        <h1>🌐 Translating to ${language}...</h1>
        <div class="glass-card" style="text-align: center;">
          <div class="spinner" style="margin: 20px auto;"></div>
          <p>Translating document with AI...</p>
        </div>
      </article>
    `;

    try {
      const translated = await getTranslation(docText || '', language);
      store.setTranslationCache(doc.id, language, translated);
      store.setAiLoading(false);

      container.innerHTML = `<article class="prose">${
        escapeHtml(translated).replace(/\n/g, '<br>')
      }</article>`;
    } catch (err) {
      store.setAiLoading(false);
      store.setAiError(err.message);
      container.innerHTML = `
        <article class="prose">
          <h1>🌐 Translation</h1>
          <div class="glass-card" style="border-color: rgba(255, 100, 100, 0.3);">
            <p style="color: #ff6b6b;">⚠️ Translation failed</p>
            <small style="color: var(--text-secondary);">${err.message}</small>
            <button class="btn-action" id="retryTransBtn" style="margin-top: 12px; width: auto;">Retry</button>
          </div>
        </article>
      `;
      container.querySelector('#retryTransBtn')?.addEventListener('click', () => {
        showTranslation(doc, docText, document.getElementById('readerContent'));
      });
    }
  }

  // === API KEY MODAL ===
  function showApiKeyModal() {
    const modal = document.getElementById('uploadModal');
    modal.innerHTML = `
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>🔑 OpenRouter API Key</h3>
          <button class="btn-close" id="closeApiModal">✕</button>
        </div>
        <div style="padding: 8px 0;">
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
            OmniReader uses OpenRouter to generate AI summaries and answer questions.
            Enter your API key below. It's stored locally in your browser and never sent anywhere except OpenRouter.
          </p>
          <div style="margin-bottom: 12px;">
            <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              API Key (<code>sk-or-...</code>)
            </label>
            <input type="password" class="qa-input" id="apiKeyInput"
              value="${hasApiKey() ? '••••••••' : ''}"
              placeholder="sk-or-..." style="width: 100%;">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              Model
            </label>
            <select class="qa-input" id="modelSelect" style="width: 100%;">
              <option value="openrouter/owl-alpha" ${store.getAiModel() === 'openrouter/owl-alpha' ? 'selected' : ''}>🦉 Owl Alpha (recommended)</option>
              <option value="openai/gpt-4o-mini" ${store.getAiModel() === 'openai/gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini ⚡</option>
              <option value="openai/gpt-4o" ${store.getAiModel() === 'openai/gpt-4o' ? 'selected' : ''}>GPT-4o 🧠</option>
              <option value="anthropic/claude-3.5-haiku" ${store.getAiModel() === 'anthropic/claude-3.5-haiku' ? 'selected' : ''}>Claude 3.5 Haiku ⚡</option>
              <option value="anthropic/claude-3.5-sonnet" ${store.getAiModel() === 'anthropic/claude-3.5-sonnet' ? 'selected' : ''}>Claude 3.5 Sonnet 🧠</option>
              <option value="google/gemini-2.0-flash-001" ${store.getAiModel() === 'google/gemini-2.0-flash-001' ? 'selected' : ''}>Gemini 2.0 Flash ⚡</option>
              <option value="meta-llama/llama-3.3-70b-instruct" ${store.getAiModel() === 'meta-llama/llama-3.3-70b-instruct' ? 'selected' : ''}>Llama 3.3 70B</option>
            </select>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-action" id="saveApiKeyBtn" style="flex: 1;">
              Save & Close
            </button>
            ${hasApiKey() ? `<button class="btn-action" id="clearApiKeyBtn" style="flex: 0; background: rgba(255,80,80,0.3);">Clear</button>` : ''}
          </div>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 12px; text-align: center;">
            <a href="https://openrouter.ai/keys" target="_blank" style="color: #88d3ce;">Get a free API key →</a>
          </p>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('visible');

    modal.querySelector('#saveApiKeyBtn').addEventListener('click', () => {
      const keyInput = modal.querySelector('#apiKeyInput');
      const modelSelect = modal.querySelector('#modelSelect');
      if (keyInput.value && !keyInput.value.includes('••••')) {
        setApiKey(keyInput.value.trim());
      }
      store.setAiModel(modelSelect.value);
      modal.classList.add('hidden');
      modal.classList.remove('visible');
      // Re-trigger current mode
      const mode = store.getState().mode;
      if (mode !== 'detailed') {
        store.setMode('detailed');
        setTimeout(() => store.setMode(mode), 50);
      }
    });

    modal.querySelector('#clearApiKeyBtn')?.addEventListener('click', () => {
      clearApiKey();
      modal.classList.add('hidden');
      modal.classList.remove('visible');
    });

    modal.querySelector('#closeApiModal').addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('visible');
    });
  }

  // Listen for mode changes
  store.subscribe('mode', (mode) => {
    const doc = store.getCurrentDoc();
    if (!doc) return;
    const container = document.getElementById('readerContent');
    if (!container) return;

    if (mode === 'detailed') {
      // Reload original document
      loadDocument(doc);
    } else {
      applyAiMode(mode);
    }
  });

  // Listen for document changes
  store.subscribe('currentDoc', () => { render(); });

  // Listen for original/translated toggle
  store.subscribe('showOriginal', () => {
    const { mode } = store.getState();
    if (mode === 'translated') {
      const doc = store.getCurrentDoc();
      if (!doc) return;
      const container = document.getElementById('readerContent');
      if (!container) return;
      applyAiMode('translated');
    }
  });

  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
