import { marked } from 'marked';

export async function renderMarkdown(content) {
  if (!content) return '<div class="empty-state"><p>No content</p></div>';
  const html = await marked.parse(content, {
    breaks: true,
    gfm: true,
  });
  return `<article class="prose">${html}</article>`;
}
