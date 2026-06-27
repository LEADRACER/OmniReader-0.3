/**
 * OmniReader — Full-Text Document Search Component
 * Search across all uploaded documents with results sidebar.
 */

import { store } from '../store.js';
import { search, indexDocument, removeFromIndex, rebuildIndex } from '../services/search-index.js';

let searchOverlay = null;
let searchInput = null;
let searchResults = null;
let searchCounter = null;
let closeBtn = null;

export function initDocumentSearch() {
  // Create overlay
  searchOverlay = document.createElement('div');
  searchOverlay.id = 'documentSearchOverlay';
  searchOverlay.className = 'document-search-overlay hidden';
  searchOverlay.innerHTML = `
    <div class="document-search-panel glass">
      <div class="document-search-header">
        <h3>🔍 Search All Documents</h3>
        <button class="btn-close" id="docSearchCloseBtn">✕</button>
      </div>
      <div class="document-search-body">
        <input type="text" id="docSearchInput" class="search-input" placeholder="Search across all documents…" autofocus>
        <div id="docSearchResults" class="document-search-results"></div>
        <div id="docSearchStats" class="document-search-stats"></div>
      </div>
    </div>
  `;
  document.body.appendChild(searchOverlay);

  searchInput = searchOverlay.querySelector('#docSearchInput');
  searchResults = searchOverlay.querySelector('#docSearchResults');
  searchCounter = searchOverlay.querySelector('#docSearchStats');
  closeBtn = searchOverlay.querySelector('#docSearchCloseBtn');

  // Event listeners
  let searchDebounce = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      performSearch(e.target.value.trim());
    }, 150);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') {
      // Focus first result
      const firstResult = searchResults.querySelector('.doc-search-result');
      if (firstResult) firstResult.click();
    }
  });

  closeBtn.addEventListener('click', close);

  // Click outside to close
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) close();
  });

  // Rebuild index when documents change
  store.subscribe('documents', () => {
    rebuildIndex(store);
  });

  return { open, close, isActive: () => !searchOverlay.classList.contains('hidden') };
}

function performSearch(query) {
  if (!query) {
    searchResults.innerHTML = '<p class="search-empty">Type to search across all documents</p>';
    searchCounter.textContent = '';
    return;
  }

  const results = search(query, { limit: 20 });
  
  if (results.length === 0) {
    searchResults.innerHTML = `<p class="search-empty">No results for "${escapeHtml(query)}"</p>`;
    searchCounter.textContent = '0 results';
    return;
  }

  searchCounter.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} in ${new Set(results.map(r => r.docId)).size} document${results.length !== 1 ? 's' : ''}`;
  
  searchResults.innerHTML = results.map(r => `
    <div class="doc-search-result" data-doc-id="${r.docId}">
      <div class="doc-search-result-title">${escapeHtml(r.name)}</div>
      <div class="doc-search-result-meta">
        <span class="doc-type-badge">${r.type.toUpperCase()}</span>
        <span>${r.matches ? Object.values(r.matches).reduce((a,b)=>a+b,0) : 0} matches</span>
      </div>
      <div class="doc-search-result-preview">
        ${generatePreview(r)}
      </div>
    </div>
  `).join('');

  // Click handlers
  searchResults.querySelectorAll('.doc-search-result').forEach(el => {
    el.addEventListener('click', () => {
      const docId = el.dataset.docId;
      selectDocument(docId);
      close();
    });
  });
}

function generatePreview(result) {
  // This would ideally show context snippets
  // For now, show match info
  const terms = Object.keys(result.matches || {}).join(', ');
  return terms ? `Matched: ${terms}` : '';
}

function selectDocument(docId) {
  const doc = store.getState().documents.find(d => d.id === docId);
  if (doc) {
    store.selectDocument(docId);
  }
}

function open() {
  searchOverlay.classList.remove('hidden');
  searchOverlay.classList.add('visible');
  searchInput.value = '';
  searchResults.innerHTML = '<p class="search-empty">Type to search across all documents</p>';
  searchCounter.textContent = '';
  setTimeout(() => searchInput.focus(), 50);
}

function close() {
  searchOverlay.classList.add('hidden');
  searchOverlay.classList.remove('visible');
  searchInput.value = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export for keyboard shortcuts
export function toggleDocumentSearch() {
  if (searchOverlay.classList.contains('hidden')) open();
  else close();
}