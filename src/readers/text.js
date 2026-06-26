export function renderText(content) {
  if (!content) return '<div class="empty-state"><p>No content</p></div>';
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<article class="prose"><pre class="text-viewer">${escaped}</pre></article>`;
}
