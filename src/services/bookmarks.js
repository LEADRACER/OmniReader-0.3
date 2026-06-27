/**
 * OmniReader — Bookmarks Service
 * Page/paragraph bookmarks with labels per document. Persisted in localStorage.
 */

const BOOKMARKS_KEY = 'omnireader-bookmarks';

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

// Bookmark structure:
// {
//   id: string,
//   docId: string,
//   type: 'page' | 'paragraph' | 'position',
//   position: number, // page number or character offset
//   label: string, // user label
//   createdAt: number
// }

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

export function getAllBookmarks() {
  return loadBookmarks();
}

// Create bookmark at current position
export function createBookmarkAtPosition(docId, position, label = '', type = 'position') {
  const finalLabel = label || (type === 'page' ? `Page ${position}` : `Position ${position}`);
  return addBookmark(docId, { position, label: finalLabel, type });
}

// Create bookmark for current PDF page
export function createPageBookmark(docId, pageNum, label = '') {
  return createBookmarkAtPosition(docId, pageNum, label || `Page ${pageNum}`, 'page');
}

// Create bookmark for scroll position
export function createScrollBookmark(docId, scrollTop, label = '') {
  return createBookmarkAtPosition(docId, scrollTop, label || `Position ${scrollTop}`, 'paragraph');
}

// Jump to bookmark
export function jumpToBookmark(docId, bookmarkId, container) {
  const bookmarks = getBookmarks(docId);
  const bookmark = bookmarks.find(b => b.id === bookmarkId);
  if (!bookmark || !container) return false;
  
  if (bookmark.type === 'page') {
    // Find page element and scroll to it
    const pageEl = container.querySelector(`[data-page-number="${bookmark.position}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
  } else {
    // Scroll to position
    container.scrollTo({ top: bookmark.position, behavior: 'smooth' });
    return true;
  }
  return false;
}