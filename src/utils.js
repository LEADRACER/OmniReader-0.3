export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(type) {
  switch (type) {
    case 'pdf': return '📄';
    case 'markdown': return '📝';
    default: return '📃';
  }
}

export function truncateName(name, max = 24) {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.');
  const extStr = ext !== -1 ? name.slice(ext) : '';
  const base = ext !== -1 ? name.slice(0, ext) : name;
  return base.slice(0, max - extStr.length - 3) + '...' + extStr;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
