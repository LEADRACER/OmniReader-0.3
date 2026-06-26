import { store } from '../store.js';

export function initUploadModal() {
  const modal = document.getElementById('uploadModal');

  function render() {
    modal.innerHTML = `
      <div class="modal-content glass">
        <div class="modal-header">
          <h3>Upload Document</h3>
          <button class="btn-close" id="closeModal">✕</button>
        </div>
        <div class="drop-zone" id="dropZone">
          <div class="drop-icon">📤</div>
          <p>Drag & drop your file here</p>
          <span class="drop-hint">or click to browse</span>
          <small class="drop-formats">Supports PDF, Markdown (.md), and Text (.txt)</small>
          <input type="file" id="fileInput" hidden accept=".pdf,.md,.txt">
        </div>
      </div>
    `;

    // Close handlers
    modal.querySelector('#closeModal').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // Drop zone
    const dropZone = modal.querySelector('#dropZone');
    const fileInput = modal.querySelector('#fileInput');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
  }

  function handleFiles(files) {
    if (!files.length) return;
    const file = files[0];

    // Validate size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size: 50MB.');
      return;
    }

    if (file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        store.addDocument(file, null, new Uint8Array(e.target.result));
        close();
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        store.addDocument(file, e.target.result, null);
        close();
      };
      reader.readAsText(file);
    }
  }

  function close() {
    modal.classList.add('hidden');
    modal.classList.remove('visible');
  }

  render();

  // Keyboard shortcut: Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}
