import { store } from '../store.js';
import * as voice from '../services/voice.js';

let searchToggle = null;
let documentSearchToggle = null;

export function initKeyboard(searchModule, docSearchModule) {
  searchToggle = searchModule;
  documentSearchToggle = docSearchModule;

  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in input fields
    const tag = e.target?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.contentEditable === 'true';

    // Ctrl+F / Cmd+F — toggle in-document search (works even in inputs)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (searchToggle?.toggleSearch) searchToggle.toggleSearch();
      return;
    }

    // Ctrl+Shift+F / Cmd+Shift+F — toggle full document search
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
      e.preventDefault();
      if (documentSearchModule?.toggleDocumentSearch) documentSearchModule.toggleDocumentSearch();
      return;
    }

    // Ctrl+E / Cmd+E — export current doc
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      document.getElementById('exportBtn')?.click();
      return;
    }

    // Skip shortcuts when focused on input
    if (isInput) return;

    switch (e.key) {
      case 'Escape':
        // Stop voice or close search
        if (voice.isVoiceActive()) {
          voice.stop();
        }
        if (searchToggle?.isActive?.()) {
          searchToggle.closeSearch?.();
        }
        if (documentSearchModule?.isActive?.()) {
          documentSearchModule.close();
        }
        break;

      case ' ':
        // Space — toggle voice pause/play
        if (voice.isVoiceActive()) {
          e.preventDefault();
          voice.togglePause();
        }
        break;

      case 's':
        // s — stop voice
        if (voice.isVoiceActive()) {
          voice.stop();
          e.preventDefault();
        }
        break;

      case '/':
        // / — open in-document search (same as Ctrl+F)
        if (!isInput) {
          e.preventDefault();
          if (searchToggle?.toggleSearch) searchToggle.toggleSearch();
        }
        break;

      case 'n':
        // n — next match (when search is active)
        if (searchToggle?.isActive?.()) {
          // Trigger next via DOM
          document.getElementById('searchNextBtn')?.click();
          e.preventDefault();
        }
        break;

      case 'p':
        // p — prev match (when search is active)
        if (searchToggle?.isActive?.()) {
          document.getElementById('searchPrevBtn')?.click();
          e.preventDefault();
        }
        break;
    }
  });
}
