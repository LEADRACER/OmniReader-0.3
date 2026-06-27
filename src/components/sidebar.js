import { store } from '../store.js';
import { getFileIcon, truncateName } from '../utils.js';
import {
  hasApiKey,
  setApiKey,
  clearApiKey,
  getProviders,
  getCurrentProviderInfo,
  getModelInfo,
  setProviderId,
  getDemoStatus,
  refreshOllama,
  PROVIDERS,
} from '../services/ai.js';

// Electron API (available in Electron, undefined in browser)
const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null;

// Import offline translation state dynamically to avoid bundling Transformers.js
async function getOfflineTranslationState() {
  const { getOfflineTranslationState: getState } = await import('../services/translation-offline.js');
  return getState();
}

// Import bookmarks dynamically
async function getBookmarks(docId) {
  const { getBookmarks: getBm } = await import('../services/bookmarks.js');
  return getBm(docId);
}

async function deleteBookmark(docId, bookmarkId) {
  const { deleteBookmark: delBm } = await import('../services/bookmarks.js');
  return delBm(docId, bookmarkId);
}

export function initSidebar() {
  const sidebar = document.getElementById('sidebar');

  function render() {
    const { documents, currentDocId } = store.getState();
    const hasKey = hasApiKey();
    const providerInfo = getCurrentProviderInfo();
    const modelInfo = getModelInfo();
    const demoStatus = getDemoStatus();
    const providers = getProviders();

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
      ${renderPdfOutlineSection(currentDocId)}
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

        // Electron-specific: Add native file open menu item
        if (electronAPI && electronAPI.openFile) {
          const openFileBtn = document.createElement('button');
          openFileBtn.className = 'btn-action';
          openFileBtn.style.marginLeft = '8px';
          openFileBtn.innerHTML = `<span class="btn-icon-inline">📂</span><span>Open File</span>`;
          openFileBtn.addEventListener('click', async () => {
            const result = await electronAPI.openFile();
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              // The main process will handle this via open-file event
            }
          });
          sidebar.querySelector('.sidebar-footer > div:first-child')?.appendChild(openFileBtn);
        }

        render();
    render();
    store.subscribe('documents', render);
    store.subscribe('currentDoc', render);
    store.subscribe('theme', render);
  }

  function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const providerInfo = getCurrentProviderInfo();
    const modelInfo = getModelInfo();
    const demoStatus = getDemoStatus();
    const providers = getProviders();

    // Render the modal asynchronously
    renderSettingsModal();

    async function renderSettingsModal() {
      const offlineState = await getOfflineTranslationState();

      modal.innerHTML = `
        <div class="modal-content glass">
          <div class="modal-header">
            <h3>⚙️ AI Settings</h3>
            <button class="btn-close" id="closeSettingsModal">✕</button>
          </div>
          <div style="padding: 8px 0; max-height: 70vh; overflow-y: auto;">
            ${renderProviderSection(providerInfo, providers, demoStatus)}
            ${renderModelSection(providerInfo, modelInfo)}
            ${renderApiKeySection(providerInfo, demoStatus)}
            ${renderDemoUsageSection(demoStatus)}
            ${renderOllamaSection()}
            ${renderOfflineTranslationSection(offlineState)}
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('visible');

      modal.querySelector('#closeSettingsModal').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

      // Provider selection
      modal.querySelector('#providerSelect')?.addEventListener('change', async (e) => {
        await setProviderId(e.target.value);
        showSettingsModal(); // Re-render with new provider
      });

      // Model selection
      modal.querySelector('#modelSelect')?.addEventListener('change', (e) => {
        store.setAiModel(e.target.value);
      });

      // API Key save
      modal.querySelector('#saveSettingsBtn')?.addEventListener('click', () => {
        const keyInput = modal.querySelector('#apiKeyInput');
        const modelSelect = modal.querySelector('#modelSelect');
        if (keyInput.value && !keyInput.value.includes('••••')) {
          setApiKey(keyInput.value.trim());
        }
        if (modelSelect) {
          store.setAiModel(modelSelect.value);
        }
        closeModal();
        render();
      });

      // Clear key
      modal.querySelector('#clearSettingsBtn')?.addEventListener('click', () => {
        clearApiKey();
        closeModal();
        render();
      });

      // Refresh Ollama
      modal.querySelector('#refreshOllamaBtn')?.addEventListener('click', async () => {
        const btn = modal.querySelector('#refreshOllamaBtn');
        btn.textContent = '🔄 Checking...';
        btn.disabled = true;
        await refreshOllama();
        showSettingsModal(); // Re-render
      });

      // Offline translation toggle
      modal.querySelector('#offlineTranslationToggle')?.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('omnireader-offline-translation', enabled ? 'true' : 'false');
        if (enabled) {
          const { initOfflineTranslator } = await import('../services/translation-offline.js');
          initOfflineTranslator((progress) => {
            const progEl = modal.querySelector('#offlineDownloadProgress');
            if (progEl) {
              progEl.textContent = `Downloading model... ${progress}%`;
              progEl.style.display = progress < 100 ? 'block' : 'none';
            }
          }).catch(() => {
            // If failed, uncheck the box
            e.target.checked = false;
            localStorage.setItem('omnireader-offline-translation', 'false');
            showSettingsModal();
          });
        }
        showSettingsModal();
      });

      function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('visible');
      }
    }
  }

  function renderProviderSection(currentProvider, providers, demoStatus) {
    const options = providers.map(p => `
      <option value="${p.id}" ${p.id === currentProvider.id ? 'selected' : ''} ${!p.available ? 'disabled' : ''}>
        ${p.name} ${!p.available ? ' (unavailable)' : ''} ${p.isLocal ? ' 🖥️' : ''}
      </option>
    `).join('');

    return `
      <div style="margin-bottom: 16px;">
        <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">
          AI Provider
        </label>
        <select class="qa-input" id="providerSelect" style="width: 100%;">
          ${options}
        </select>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
          Current: <strong>${currentProvider.name}</strong>
          ${currentProvider.isLocal ? ' (runs locally on your machine)' : ''}
          ${demoStatus.isUsingDemo && currentProvider.id === 'openrouter' ? ' — using demo key' : ''}
        </p>
      </div>
    `;
  }

  function renderModelSection(providerInfo, modelInfo) {
    const models = providerInfo.models;
    if (models.length === 0 && !providerInfo.isLocal) return '';

    const options = models.map(m => `
      <option value="${m.id}" ${m.id === modelInfo.id ? 'selected' : ''}>
        ${m.name}
      </option>
    `).join('');

    return `
      <div style="margin-bottom: 16px;">
        <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">
          AI Model
        </label>
        <select class="qa-input" id="modelSelect" style="width: 100%;">
          ${options}
        </select>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
          Selected: <strong>${modelInfo.name || modelInfo.id}</strong>
        </p>
      </div>
    `;
  }

  function renderApiKeySection(providerInfo, demoStatus) {
    if (providerInfo.isLocal) {
      return `
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(0,20,200,100,0.1); border-radius: 8px; border: 1px solid rgba(0,200,100,0.3);">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
            🖥️ <strong>Ollama (Local)</strong> — No API key needed. Models run on your machine.
          </p>
        </div>
      `;
    }

    const hasUserKey = hasApiKey() && !demoStatus.isUsingDemo;
    const keyValue = hasUserKey ? '••••••••' : '';
    const placeholder = demoStatus.isUsingDemo ? 'Using demo key (add your own for unlimited use)' : 'sk-or-... / gsk_... / ghp_...';

    return `
      <div style="margin-bottom: 16px;">
        <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">
          API Key ${providerInfo.id !== 'openrouter' ? `(${providerInfo.name})` : ''}
        </label>
        <input type="password" class="qa-input" id="apiKeyInput"
          value="${keyValue}"
          placeholder="${placeholder}"
          style="width: 100%;">
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
          ${providerInfo.id === 'openrouter'
            ? 'Get a free key at <a href="https://openrouter.ai/keys" target="_blank" style="color: #88d3ce;">openrouter.ai/keys</a>'
            : providerInfo.id === 'groq'
              ? 'Free at <a href="https://console.groq.com/keys" target="_blank" style="color: #88d3ce;">console.groq.com</a> (Llama 3.3 70B free!)'
              : providerInfo.id === 'github'
                ? 'Use a GitHub PAT with "models" scope at <a href="https://github.com/settings/tokens" target="_blank" style="color: #88d3ce;">github.com/settings/tokens</a>'
                : providerInfo.id === 'deepseek'
                  ? 'Get key at <a href="https://platform.deepseek.com" target="_blank" style="color: #88d3ce;">platform.deepseek.com</a>'
                  : providerInfo.id === 'together'
                    ? 'Free credits at <a href="https://together.ai" target="_blank" style="color: #88d3ce;">together.ai</a>'
                    : providerInfo.id === 'openai'
                      ? 'Get key at <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #88d3ce;">platform.openai.com</a>'
                      : ''}
        </p>
      </div>
    `;
  }

  function renderDemoUsageSection(demoStatus) {
    if (!demoStatus.isUsingDemo) return '';

    const { remaining, estimatedSummariesLeft, usage } = demoStatus;

    return `
      <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,180,0,0.1); border-radius: 8px; border: 1px solid rgba(255,180,0,0.3);">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 8px 0;">
          🎁 <strong>Demo Mode Active</strong> — Using shared OpenRouter key
        </p>
        <div style="display: flex; gap: 16px; font-size: 0.8rem;">
          <span>💰 Balance: <strong>$${remaining.toFixed(2)}</strong> / $${2.00.toFixed(2)}</span>
          <span>📋 Summaries left: <strong>~${estimatedSummariesLeft}</strong></span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px;">
          Used: ${usage.summaries} summaries, ${usage.qa} Q&A, ${usage.translations} translations
        </div>
      </div>
    `;
  }

  function renderOllamaSection() {
    const { isLocal, available, models } = PROVIDERS.ollama;

    return `
      <div style="margin-bottom: 16px; padding: 12px; background: ${available ? 'rgba(0,200,100,0.1)' : 'rgba(255,100,100,0.1)'}; border-radius: 8px; border: 1px solid ${available ? 'rgba(0,200,100,0.3)' : 'rgba(255,100,100,0.3)'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);">
            ${available ? '🟢' : '🔴'} <strong>Ollama</strong> ${available ? `(${models.length} models)` : '(not running)'}
          </span>
          <button class="btn-action" id="refreshOllamaBtn" style="padding: 4px 10px; font-size: 0.75rem;">
            ${available ? '🔄 Refresh' : '🔍 Detect'}
          </button>
        </div>
        ${available && models.length > 0 ? `
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 8px 0 0 0;">
            Available: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}
          </p>
        ` : ''}
        ${!available ? `
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 8px 0 0 0;">
            Install: <a href="https://ollama.com/" target="_blank" style="color: #88d3ce;">ollama.com</a> → <code>ollama pull llama3.2:3b</code>
          </p>
        ` : ''}
      </div>
    `;
  }

  function renderOfflineTranslationSection(state) {
    const isEnabled = state.enabled;
    const isLoading = state.isLoading;
    const progress = state.progress;

    return `
      <div style="margin-bottom: 16px; padding: 12px; background: rgba(100,150,255,0.1); border-radius: 8px; border: 1px solid rgba(100,150,255,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);">
            📦 <strong>Offline Translation (NLLB)</strong>
          </span>
          <label class="toggle-switch" style="cursor: pointer;">
            <input type="checkbox" id="offlineTranslationToggle" ${isEnabled ? 'checked' : ''} ${isLoading ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 8px 0 0 0;">
          ${isEnabled
            ? (isLoading
                ? `<span id="offlineDownloadProgress" style="display: block; color: #88d3ce;">Downloading model... ${progress}%</span>`
                : '✅ Enabled — Translations run fully offline via Transformers.js (NLLB-200-distilled-600M, ~1.2GB)')
            : '🔌 Disabled — Uses online translation (Chrome API → LLM fallback)'}
        </p>
        ${!isEnabled && !isLoading ? `
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 8px 0 0 0;">
            Enable for fully offline translation. First use downloads ~1.2GB model (cached in browser).
          </p>
        ` : ''}
        <style>
          .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
          .toggle-switch input { opacity: 0; width: 0; height: 0; }
          .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; }
          .toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
          .toggle-switch input:checked + .toggle-slider { background-color: #6e45e2; }
          .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }
          .toggle-switch input:disabled + .toggle-slider { opacity: 0.5; cursor: not-allowed; }
        </style>
      </div>
    `;
  }

  function renderPdfOutlineSection(docId) {
    if (!docId) return '';

    const outlineData = store.getPdfOutline(docId);
    if (!outlineData || !outlineData.outline || !outlineData.outline.items || outlineData.outline.items.length === 0) {
      return '';
    }

    const { totalPages, items } = outlineData.outline;

    function renderOutlineItems(outlineItems, depth = 0) {
      return outlineItems.map(item => `
        <div class="outline-item" style="padding-left: ${depth * 16}px;">
          <button class="outline-link" data-page="${item.page}" ${item.page ? '' : 'disabled'}>
            <span class="outline-title">${item.title}</span>
            ${item.page ? `<span class="outline-page">p. ${item.page}</span>` : ''}
          </button>
          ${item.items && item.items.length > 0 ? renderOutlineItems(item.items, depth + 1) : ''}
        </div>
      `).join('');
    }

    return `
      <nav class="outline-container">
        <p class="section-label">OUTLINE (${totalPages} pages)</p>
        <div class="outline-tree">
          ${renderOutlineItems(items)}
        </div>
      </nav>
    `;
  }

  render();
  store.subscribe('documents', render);
  store.subscribe('currentDoc', render);
  store.subscribe('theme', render);
}