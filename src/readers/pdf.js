import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function renderPDF(data, container) {
  // Show skeleton loader while loading
  container.innerHTML = `
    <div class="skeleton-loader">
      <div class="skeleton-page"></div>
      <div class="skeleton-page" style="width: 90%;"></div>
      <div class="skeleton-page" style="width: 95%;"></div>
    </div>
  `;

  try {
    // Validate data
    if (!data || !(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
      throw new Error('Invalid PDF data — the file may be corrupted or empty.');
    }

    const pdf = await pdfjsLib.getDocument({ data }).promise;

    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages — the file may be empty.');
    }

    const totalPages = pdf.numPages;

    container.innerHTML = '';
    container.style.overflowY = 'auto';

    // Page info header
    const header = document.createElement('div');
    header.className = 'pdf-info-bar';
    header.innerHTML = `<span>📄 ${totalPages} page${totalPages > 1 ? 's' : ''}</span>`;
    container.appendChild(header);

    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.marginBottom = '16px';
        canvas.style.borderRadius = '8px';
        canvas.dataset.page = i;

        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page';
        pageContainer.appendChild(canvas);
        container.appendChild(pageContainer);

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (pageErr) {
        // Per-page error — show fallback for this page, continue rendering others
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page pdf-page-error';
        pageContainer.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 24px; margin-bottom: 16px;">
            <p style="color: #ff6b6b;">⚠️ Failed to render page ${i}</p>
            <small style="color: var(--text-secondary);">${pageErr.message}</small>
          </div>
        `;
        container.appendChild(pageContainer);
      }
    }

    return { totalPages };
  } catch (err) {
    let friendlyMsg = err.message;
    let suggestion = '';

    if (err.message?.includes('Invalid PDF structure')) {
      friendlyMsg = 'This file is not a valid PDF.';
      suggestion = 'Try re-downloading the file or converting it to a different format.';
    } else if (err.message?.includes('password')) {
      friendlyMsg = 'This PDF is password-protected.';
      suggestion = 'OmniReader cannot open encrypted PDFs. Please decrypt it first.';
    } else if (err.message?.includes('worker')) {
      friendlyMsg = 'PDF worker failed to load.';
      suggestion = 'Try refreshing the page. If running from file://, serve from a local HTTP server.';
    }

    container.innerHTML = `
      <div class="error-state">
        <div class="glass-card" style="border-color: rgba(255, 100, 100, 0.3); max-width: 420px; margin: 40px auto;">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">⚠️ Failed to render PDF</p>
          <p style="color: #ff6b6b; margin-bottom: 12px;">${friendlyMsg}</p>
          ${suggestion ? `<small style="color: var(--text-secondary);">${suggestion}</small>` : ''}
          <button class="btn-action" id="retryPdfBtn" style="margin-top: 16px; width: auto;">Retry</button>
        </div>
      </div>
    `;

    return { totalPages: 0, error: friendlyMsg };
  }
}
