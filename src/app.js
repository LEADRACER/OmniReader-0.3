import { initSidebar } from './components/sidebar.js';
import { initToolbar } from './components/toolbar.js';
import { initReader } from './components/reader.js';
import { initUploadModal } from './components/upload-modal.js';
import { initSearch } from './components/search.js';
import { initDocumentSearch } from './components/document-search.js';
import { initKeyboard } from './services/keyboard.js';

export function initApp() {
  initSidebar();
  initToolbar();
  initReader();
  initUploadModal();
  initDocumentSearch();

  // Search + keyboard shortcuts
  const search = initSearch();
  const docSearch = initDocumentSearch();
  initKeyboard(search, docSearch);
}
