// Search in document — ⌘F / Ctrl+F overlay
let active = false;
let searchTerm = '';
let matches = [];
let currentMatchIndex = -1;
let originalContent = '';

export function initSearch() {
  const overlay = document.createElement('div');
  overlay.id = 'searchOverlay';
  overlay.className = 'search-overlay hidden';
  overlay.innerHTML = `
    <div class="search-bar glass">
      <input type="text" id="searchInput" class="search-input" placeholder="Search in document…" autofocus>
      <span id="searchCounter" class="search-counter">0 / 0</span>
      <button id="searchPrevBtn" class="search-nav-btn" title="Previous match">▲</button>
      <button id="searchNextBtn" class="search-nav-btn" title="Next match">▼</button>
      <button id="searchCloseBtn" class="search-nav-btn" title="Close (Esc)">✕</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#searchInput');
  const counter = overlay.querySelector('#searchCounter');
  const prevBtn = overlay.querySelector('#searchPrevBtn');
  const nextBtn = overlay.querySelector('#searchNextBtn');
  const closeBtn = overlay.querySelector('#searchCloseBtn');

  const performSearch = (direction) => {
    const term = input.value.trim();
    const container = document.getElementById('readerContent');
    if (!container || !term) {
      clearHighlights();
      searchTerm = '';
      matches = [];
      currentMatchIndex = -1;
      counter.textContent = '0 / 0';
      return;
    }

    // Store original content on first search
    if (searchTerm !== term) {
      searchTerm = term;
      matches = [];
      currentMatchIndex = -1;
      findMatches(container, term);
    }

    if (direction === 'next') {
      currentMatchIndex = (currentMatchIndex + 1) % matches.length;
    } else if (direction === 'prev') {
      currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    } else {
      // Initial search — start at first match
      currentMatchIndex = matches.length > 0 ? 0 : -1;
    }

    updateUI(counter);
    highlightCurrent();
  };

  input.addEventListener('input', () => performSearch('initial'));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(e.shiftKey ? 'prev' : 'next');
    }
    if (e.key === 'Escape') close();
  });

  prevBtn.addEventListener('click', () => performSearch('prev'));
  nextBtn.addEventListener('click', () => performSearch('next'));
  closeBtn.addEventListener('click', close);

  return { open, close, isActive: () => active };
}

function findMatches(container, term) {
  clearHighlights();
  matches = [];
  currentMatchIndex = -1;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent;
    const lower = text.toLowerCase();
    const searchLower = term.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(searchLower, idx)) !== -1) {
      matches.push({ node, start: idx, end: idx + term.length });
      idx += term.length;
    }
  }
}

function updateUI(counter) {
  counter.textContent = matches.length > 0
    ? `${currentMatchIndex + 1} / ${matches.length}`
    : '0 / 0';
}

function highlightCurrent() {
  // Remove existing highlight wraps
  document.querySelectorAll('.search-highlight').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  document.querySelectorAll('.search-current').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });

  if (matches.length === 0 || currentMatchIndex < 0) return;

  // Highlight current match
  const match = matches[currentMatchIndex];
  const { node, start, end } = match;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);

  const span = document.createElement('span');
  span.className = 'search-current';
  range.surroundContents(span);
  span.scrollIntoView({ block: 'center', behavior: 'smooth' });

  // Highlight all other matches
  for (let i = 0; i < matches.length; i++) {
    if (i === currentMatchIndex) continue;
    const m = matches[i];
    // Re-find node (may have been split by the surroundContents above)
    try {
      const r = document.createRange();
      r.setStart(m.node, m.start);
      r.setEnd(m.node, m.end);
      const s = document.createElement('span');
      s.className = 'search-highlight';
      r.surroundContents(s);
    } catch (_) {
      // Node may have been modified — recalculate next time
    }
  }
}

function clearHighlights() {
  document.querySelectorAll('.search-highlight, .search-current').forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    }
  });
}

export function toggleSearch() {
  if (active) close();
  else open();
}

function open() {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  active = true;

  // Clear previous search
  clearHighlights();
  searchTerm = '';
  matches = [];
  currentMatchIndex = -1;

  setTimeout(() => {
    const input = document.getElementById('searchInput');
    if (input) {
      input.value = '';
      input.focus();
      const counter = document.getElementById('searchCounter');
      if (counter) counter.textContent = '0 / 0';
    }
  }, 50);
}

function close() {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('visible');
  active = false;
  clearHighlights();
  searchTerm = '';
  matches = [];
  currentMatchIndex = -1;
}

// Close search when reader content changes
export function closeSearch() {
  if (active) close();
}
