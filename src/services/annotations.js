/**
 * OmniReader — Annotations Service
 * Highlights, notes, and bookmarks per document. Persisted in localStorage.
 */

const ANNOTATIONS_KEY = 'omnireader-annotations';
const BOOKMARKS_KEY = 'omnireader-bookmarks';

// Annotation structure:
// {
//   id: string,
//   docId: string,
//   type: 'highlight' | 'note',
//   range: { start: number, end: number }, // character offsets in text content
//   selector: string, // CSS selector path for re-location
//   text: string, // selected text
//   note: string, // user note (for notes)
//   color: string, // highlight color
//   createdAt: number,
//   updatedAt: number
// }

// Bookmark structure:
// {
//   id: string,
//   docId: string,
//   type: 'page' | 'paragraph',
//   position: number, // page number or character offset
//   label: string,
//   createdAt: number
// }

function loadAnnotations() {
  try {
    return JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAnnotations(annotations) {
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(annotations));
}

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

// === ANNOTATIONS ===

export function getAnnotations(docId) {
  const all = loadAnnotations();
  return all[docId] || [];
}

export function getAllAnnotations() {
  return loadAnnotations();
}

export function addAnnotation(docId, annotation) {
  const all = loadAnnotations();
  if (!all[docId]) all[docId] = [];
  
  const newAnnotation = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    docId,
    ...annotation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  all[docId].push(newAnnotation);
  saveAnnotations(all);
  return newAnnotation;
}

export function updateAnnotation(docId, annotationId, updates) {
  const all = loadAnnotations();
  if (!all[docId]) return null;
  
  const index = all[docId].findIndex(a => a.id === annotationId);
  if (index === -1) return null;
  
  all[docId][index] = {
    ...all[docId][index],
    ...updates,
    updatedAt: Date.now(),
  };
  saveAnnotations(all);
  return all[docId][index];
}

export function deleteAnnotation(docId, annotationId) {
  const all = loadAnnotations();
  if (!all[docId]) return false;
  
  const index = all[docId].findIndex(a => a.id === annotationId);
  if (index === -1) return false;
  
  all[docId].splice(index, 1);
  if (all[docId].length === 0) delete all[docId];
  saveAnnotations(all);
  return true;
}

export function deleteAnnotationsForDoc(docId) {
  const all = loadAnnotations();
  if (all[docId]) {
    delete all[docId];
    saveAnnotations(all);
  }
}

// Highlight colors
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Yellow', css: '#fff3a3' },
  { id: 'green', name: 'Green', css: '#a3f7a3' },
  { id: 'blue', name: 'Blue', css: '#a3d5ff' },
  { id: 'pink', name: 'Pink', css: '#ffa3e8' },
  { id: 'orange', name: 'Orange', css: '#ffd6a3' },
  { id: 'purple', name: 'Purple', css: '#d6a3ff' },
];

// Create a highlight annotation from current text selection
export function createHighlightFromSelection(docId, color = 'yellow') {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  if (!selectedText.length < 2) return null; // Ignore tiny selections
  
  // Get the text content of the reader for offset calculation
  const readerContent = document.getElementById('readerContent');
  if (!readerContent) return null;
  
  const fullText = readerContent.innerText;
  const startOffset = fullText.indexOf(selectedText);
  if (startOffset === -1) return null;
  
  // Generate a CSS selector path for re-location
  const selector = generateSelector(range.startContainer);
  
  return addAnnotation(docId, {
    type: 'highlight',
    range: { start: startOffset, end: startOffset + selectedText.length },
    selector,
    text: selectedText,
    note: '',
    color,
  });
}

// Create a note annotation from current selection
export function createNoteFromSelection(docId, noteText, color = 'yellow') {
  const highlight = createHighlightFromSelection(docId, color);
  if (!highlight) return null;
  
  return updateAnnotation(docId, highlight.id, {
    type: 'note',
    note: noteText,
  });
}

// Generate a CSS selector for an element
function generateSelector(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  if (!node || node === document.body) return 'body';
  
  const parts = [];
  while (node && node !== document.body) {
    let selector = node.tagName.toLowerCase();
    if (node.id) {
      selector += '#' + node.id;
      parts.unshift(selector);
      break;
    }
    if (node.className) {
      const classes = node.className.split(' ').filter(c => c).join('.');
      if (classes) selector += '.' + classes;
    }
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(el => el.tagName === node.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(node) + 1;
        selector += ':nth-of-type(' + index + ')';
      }
    }
    parts.unshift(selector);
    node = parent;
  }
  return parts.join(' > ');
}

// Restore highlights in the reader content
export function restoreHighlights(docId) {
  const annotations = getAnnotations(docId);
  const highlights = annotations.filter(a => a.type === 'highlight' || a.type === 'note');
  const readerContent = document.getElementById('readerContent');
  if (!readerContent || highlights.length === 0) return;
  
  // Use TreeWalker to find and wrap text nodes
  highlights.forEach(ann => {
    try {
      highlightTextInElement(readerContent, ann.text, ann.color, ann.id);
    } catch (e) {
      console.warn('Failed to restore highlight:', ann, e);
    }
  });
}

// Highlight text occurrences in an element
function highlightTextInElement(element, searchText, color, annotationId) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  for (const textNode of textNodes) {
    const text = textNode.textContent;
    const index = text.indexOf(searchText);
    if (index >= 0) {
      const before = text.slice(0, index);
      const match = text.slice(index, index + searchText.length);
      const after = text.slice(index + searchText.length);
      
      const span = document.createElement('span');
      span.className = 'annotation-highlight';
      span.style.backgroundColor = HIGHLIGHT_COLORS.find(c => c.id === color)?.css || '#fff3a3';
      span.dataset.annotationId = annotationId;
      span.textContent = match;
      
      const parent = textNode.parentNode;
      if (before) parent.insertBefore(document.createTextNode(before), textNode);
      parent.insertBefore(span, textNode);
      if (after) parent.insertBefore(document.createTextNode(after), textNode);
      parent.removeChild(textNode);
      
      // Only highlight first occurrence per annotation
      break;
    }
  }
}

// Remove all highlight spans
export function clearHighlights() {
  document.querySelectorAll('.annotation-highlight').forEach(span => {
    const parent = span.parentNode;
    parent.replaceChild(document.createTextNode(span.textContent), span);
    // Normalize adjacent text nodes
    parent.normalize();
  });
}

// === BOOKMARKS ===

export function getBookmarks(docId) {
  const all = loadBookmarks();
  return all[docId] || [];
}

export function addBookmark(docId, bookmark) {
  const all = loadBookmarks();
  if (!all[docId]) all[docId] = [];
  
  const newBookmark = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    docId,
    ...bookmark,
    createdAt: Date.now(),
  };
  
  all[docId].push(newBookmark);
  all[docId].sort((a, b) => a.position - b.position);
  saveBookmarks(all);
  return newBookmark;
}

export function updateBookmark(docId, bookmarkId, updates) {
  const all = loadBookmarks();
  if (!all[docId]) return null;
  
  const index = all[docId].findIndex(b => b.id === bookmarkId);
  if (index === -1) return null;
  
  all[docId][index] = { ...all[docId][index], ...updates };
  all[docId].sort((a, b) => a.position - b.position);
  saveBookmarks(all);
  return all[docId][index];
}

export function deleteBookmark(docId, bookmarkId) {
  const all = loadBookmarks();
  if (!all[docId]) return false;
  
  const index = all[docId].findIndex(b => b.id === bookmarkId);
  if (index === -1) return false;
  
  all[docId].splice(index, 1);
  if (all[docId].length === 0) delete all[docId];
  saveBookmarks(all);
  return true;
}

export function deleteBookmarksForDoc(docId) {
  const all = loadBookmarks();
  if (all[docId]) {
    delete all[docId];
    saveBookmarks(all);
  }
}

// Initialize - restore highlights when document changes
export function initializeAnnotations(store) {
  store.subscribe('currentDoc', () => {
    clearHighlights();
    const doc = store.getCurrentDoc();
    if (doc) {
      // Small delay to let content render
      setTimeout(() => restoreHighlights(doc.id), 100);
    }
  });
}