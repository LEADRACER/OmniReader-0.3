import { store } from '../store.js';
import { getFileIcon, truncateName } from '../utils.js';
import { hasApiKey, setApiKey, clearApiKey } from '../services/ai.js';

export function initSidebar() {
  const sidebar = document.getElementById('sidebar');

  function render() {
    const { documents, currentDocId } = store.getState();
    const hasKey = hasApiKey();

    sidebar.innerHTML = `
      <div class="logo-area">
        <div class="logo-glow"></div>
        <h1>OmniReader</h1>
      </div>
      <nav class="doc-list-container">
        <p class="section-label">DOCUMENTS</p>
        <div class="doc-list" id="docList">
          ${documents.length === 0
            ? '<p class="empty-hint">Upload a document<br>to begin</p>'
            : documents.map(doc => `
              <div class="doc-item ${currentDocId === doc.id ? 'active' : ''}"
                   data-id="${doc.id}">
                <span class="doc-icon">${getFileIcon(doc.type)}</span>
                <span class="doc-name" title="${doc.name}">${truncateName(doc.name)}</span>
                <button class="doc-delete" data-id="${doc.id}" title="Delete">✕</button>
              </div>
            `).join('')}
        </div>
      </nav>
      <div class="sidebar-footer">
        <button class="btn-action" id="uploadBtn">
          <span class="btn-icon-inline">+</span>
          <span>Upload</span>
        </button>
        <div style="display: flex; gap: 6px;">
          <button class="btn-icon sidebar-settings-btn" id="themeBtn" title="Toggle theme">
            <span style="font-size:1.1rem;">${store.getTheme() === 'dark' ? '☀️' : '🌙'}</span>
          </button>
          <button class="btn-icon sidebar-settings-btn" id="settingsBtn" title="AI Settings">
            <span style="font-size:1.1rem;">${hasKey ? '⚙️' : '🔑'}</span>
          </button>
        </div>
      </div>
    `;

    // Event listeners
    sidebar.querySelectorAll('.doc-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.doc-delete')) return;
        store.selectDocument(item.dataset.id);
      });
    });

    sidebar.querySelectorAll('.doc-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.deleteDocument(btn.dataset.id);
      });
    });

    sidebar.querySelector('#uploadBtn')?.addEventListener('click', () => {
      document.getElementById('uploadModal').classList.remove('hidden');
      document.getElementById('uploadModal').classList.add('visible');
    });

    sidebar.querySelector('#settingsBtn')?.addEventListener('click', showSettingsModal);

    sidebar.querySelector('#themeBtn')?.addEventListener('click', () => {
      store.toggleTheme();
    });
  }

  function showSettingsModal() {
    const modal = document.getElementById('uploadModal');

    modal.innerHTML = `
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>🔑 AI Settings</h3>
          <button class="btn-close" id="closeSettingsModal">✕</button>
        </div>
        <div style="padding: 8px 0;">
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
            OmniReader uses <strong>OpenRouter</strong> for AI summaries and Q&A (default: 🦉 <strong>Owl Alpha</strong>).<br>
            🔐 <strong>Bring your own key</strong> — it's stored locally and sent only to OpenRouter.
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
              AI Model
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
            <button class="btn-action" id="saveSettingsBtn" style="flex: 1;">Save</button>
            ${hasApiKey() ? `<button class="btn-action" id="clearSettingsBtn" style="flex: 0; background: rgba(255,80,80,0.3);">Clear Key</button>` : ''}
          </div>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 12px; text-align: center;">
            <a href="https://openrouter.ai/keys" target="_blank" style="color: #88d3ce;">Don't have a key? Get one free →</a>
          </p>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('visible');

    modal.querySelector('#closeSettingsModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('#saveSettingsBtn').addEventListener('click', () => {
      const keyInput = modal.querySelector('#apiKeyInput');
      const modelSelect = modal.querySelector('#modelSelect');
      if (keyInput.value && !keyInput.value.includes('••••')) {
        setApiKey(keyInput.value.trim());
      }
      store.setAiModel(modelSelect.value);
      closeModal();
      render();
    });

    modal.querySelector('#clearSettingsBtn')?.addEventListener('click', () => {
      clearApiKey();
      closeModal();
      render();
    });

    function closeModal() {
      modal.classList.add('hidden');
      modal.classList.remove('visible');
    }
  }

  render();
  store.subscribe('documents', render);
  store.subscribe('currentDoc', render);
  store.subscribe('theme', render);
}
