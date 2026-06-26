import { store } from '../store.js';
import * as voice from '../services/voice.js';

const LANGUAGES = ['English', 'Spanish', 'French', 'Japanese', 'German', 'Chinese'];
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function initToolbar() {
  const toolbar = document.getElementById('toolbar');

  function render() {
    const { mode, language } = store.getState();
    const isTranslated = mode === 'translated';
    const vActive = voice.isVoiceActive();
    const vPaused = voice.isVoicePaused();
    const vRate = voice.getVoiceRate();

    toolbar.innerHTML = `
      <div class="reading-modes">
        <span class="toolbar-label">READING MODE</span>
        <div class="mode-switch">
          <button class="mode-btn ${mode === 'detailed' || mode === 'translated' ? 'active' : ''}" data-mode="detailed">
            <span class="mode-icon">📖</span> Detailed
          </button>
          <button class="mode-btn ${mode === 'summary' ? 'active' : ''}" data-mode="summary">
            <span class="mode-icon">📋</span> Summary
          </button>
          <button class="mode-btn ${mode === 'qa' ? 'active' : ''}" data-mode="qa">
            <span class="mode-icon">💬</span> Q&A
          </button>
        </div>
      </div>
      <div class="toolbar-actions">
        ${isTranslated
          ? `<div class="translation-indicator">
              <span>🌐</span>
              <span>${language}</span>
              <button class="btn-original" id="toggleOriginalBtn">
                ${store.getState().showOriginal ? '📖 Show Translated' : '🌐 Show Original'}
              </button>
             </div>`
          : ''
        }

        <!-- Voice controls -->
        ${vActive ? `
          <div class="voice-controls">
            <span class="voice-indicator">${vPaused ? '⏸' : '🔊'}</span>
            <button class="voice-btn ${vPaused ? 'active' : ''}" id="voicePauseBtn" title="${vPaused ? 'Resume' : 'Pause'}" tabindex="-1">
              ${vPaused ? '▶' : '⏸'}
            </button>
            <button class="voice-btn" id="voiceStopBtn" title="Stop" tabindex="-1">⏹</button>
            <select id="voiceSpeedSelect" class="voice-speed" title="Speed" tabindex="-1">
              ${SPEEDS.map(s => `
                <option value="${s}" ${Math.abs(vRate - s) < 0.01 ? 'selected' : ''}>${s}x</option>
              `).join('')}
            </select>
          </div>
        ` : `
          <button class="btn-icon" id="voiceBtn" title="Read Aloud (Space to pause/play)">
            <span class="icon-voice">🔈</span>
          </button>
        `}

        <div class="lang-selector" id="langSelector">
          <span class="icon-globe">🌐</span>
          <select id="langSelect" class="lang-dropdown">
            ${LANGUAGES.map(l => `
              <option value="${l}" ${language === l ? 'selected' : ''}>${l}</option>
            `).join('')}
          </select>
        </div>
        <button class="btn-icon" id="exportBtn" title="Export (⌘E)">
          <span class="icon-voice">📥</span>
        </button>
      </div>
    `;

    // Mode buttons
    toolbar.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetMode = btn.dataset.mode;
        if (mode === targetMode || (mode === 'translated' && targetMode === 'detailed')) return;
        if (mode === 'translated' && targetMode === 'detailed') {
          store.setLanguage('English');
          store.setMode('detailed');
          return;
        }
        if (targetMode === 'detailed') {
          const currentLang = store.getState().language;
          if (currentLang !== 'English') {
            store.setMode('translated');
            return;
          }
          store.setMode('detailed');
          return;
        }
        store.setMode(targetMode);
      });
    });

    // Voice: Start
    toolbar.querySelector('#voiceBtn')?.addEventListener('click', startVoice);

    // Voice: Pause/Resume
    toolbar.querySelector('#voicePauseBtn')?.addEventListener('click', () => {
      voice.togglePause();
      render();
    });

    // Voice: Stop
    toolbar.querySelector('#voiceStopBtn')?.addEventListener('click', () => {
      voice.stop();
      render();
    });

    // Voice: Speed
    toolbar.querySelector('#voiceSpeedSelect')?.addEventListener('change', (e) => {
      voice.setRate(parseFloat(e.target.value));
      // render() will be called by voice state change if needed
    });

    // Language dropdown
    toolbar.querySelector('#langSelect')?.addEventListener('change', (e) => {
      const lang = e.target.value;
      store.setLanguage(lang);
      if (lang !== 'English') {
        store.setMode('translated');
      } else {
        store.setMode('detailed');
      }
    });

    // Original/Translated toggle
    toolbar.querySelector('#toggleOriginalBtn')?.addEventListener('click', () => {
      store.setShowOriginal(!store.getState().showOriginal);
    });

    // Export
    toolbar.querySelector('#exportBtn')?.addEventListener('click', exportCurrentDoc);
  }

  function startVoice() {
    const readerContent = document.getElementById('readerContent');
    const text = readerContent?.innerText;
    if (!text || !text.trim()) return;

    voice.speak(text, store.getState().language, () => {
      render();
    });
    render();
  }

  function exportCurrentDoc() {
    const doc = store.getCurrentDoc();
    if (!doc) return;

    const readerContent = document.getElementById('readerContent');
    const text = readerContent?.innerText || doc.content || '';

    // Determine format
    const isMarkdown = doc.type === 'markdown';
    const extension = isMarkdown ? 'md' : 'txt';
    const mimeType = isMarkdown ? 'text/markdown' : 'text/plain';

    // Create filename
    const baseName = doc.name.replace(/\.[^.]+$/, '');
    const mode = store.getState().mode;
    const suffix = mode !== 'detailed' ? `-${mode}` : '';
    const filename = `${baseName}${suffix}.${extension}`;

    // Download
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  render();
  store.subscribe('mode', render);
  store.subscribe('language', render);
  store.subscribe('showOriginal', render);
}
