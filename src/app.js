import { initSidebar } from './components/sidebar.js';
import { initToolbar } from './components/toolbar.js';
import { initReader } from './components/reader.js';
import { initUploadModal } from './components/upload-modal.js';
import { initSearch } from './components/search.js';
import { initKeyboard } from './services/keyboard.js';

export function initApp() {
  initSidebar();
  initToolbar();
  initReader();
  initUploadModal();

  // Search + keyboard shortcuts
  const search = initSearch();
  initKeyboard(search);
}
