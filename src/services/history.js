/**
 * OmniReader — Reading History Service
 * Tracks reading progress, scroll position, time spent, auto-resume.
 */

const HISTORY_KEY = 'omnireader-reading-history';
const MAX_HISTORY_ENTRIES = 100;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getDocHistory(docId) {
  const all = loadHistory();
  return all[docId] || {
    sessions: [],
    totalTime: 0,
    lastPosition: { scrollTop: 0, page: 1 },
    lastReadAt: null,
  };
}

export function saveReadingProgress(docId, progress) {
  const history = getDocHistory(docId);
  
  // Update last position
  history.lastPosition = {
    scrollTop: progress.scrollTop || 0,
    page: progress.page || 1,
    scrollLeft: progress.scrollLeft || 0,
  };
  
  // Update last read time
  history.lastReadAt = Date.now();
  
  // Save
  const all = loadHistory();
  all[docId] = history;
  saveHistory(all);
}

export function getReadingProgress(docId) {
  return getDocHistory(docId);
}

export function startReadingSession(docId) {
  const history = getDocHistory(docId);
  const session = {
    id: Date.now().toString(36),
    startedAt: Date.now(),
    endedAt: null,
    duration: 0,
    startPosition: { ...history.lastPosition },
    endPosition: null,
  };
  
  history.sessions.push(session);
  
  // Keep only recent sessions
  if (history.sessions.length > MAX_HISTORY_ENTRIES) {
    history.sessions = history.sessions.slice(-MAX_HISTORY_ENTRIES);
  }
  
  const all = loadHistory();
  all[docId] = history;
  saveHistory(all);
  
  return session;
}

export function endReadingSession(docId, sessionId, endPosition) {
  const history = getDocHistory(docId);
  const session = history.sessions.find(s => s.id === sessionId);
  if (!session) return null;
  
  session.endedAt = Date.now();
  session.duration = session.endedAt - session.startedAt;
  session.endPosition = endPosition;
  
  // Update total time
  history.totalTime += session.duration;
  
  const all = loadHistory();
  all[docId] = history;
  saveHistory(all);
  
  return session;
}

export function getReadingStats(docId) {
  const history = getDocHistory(docId);
  
  return {
    totalTime: history.totalTime,
    sessionCount: history.sessions.length,
    lastReadAt: history.lastReadAt,
    lastPosition: history.lastPosition,
    averageSessionTime: history.sessions.length > 0 
      ? history.totalTime / history.sessions.length 
      : 0,
  };
}

export function getAllReadingHistory() {
  const all = loadHistory();
  return Object.entries(all).map(([docId, history]) => ({
    docId,
    ...getReadingStats(docId),
  }));
}

export function deleteHistoryForDoc(docId) {
  const all = loadHistory();
  if (all[docId]) {
    delete all[docId];
    saveHistory(all);
  }
}

export function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// Format duration as human readable
export function formatDuration(ms) {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

// Auto-save scroll position (debounced)
let scrollSaveTimeout = null;
export function autoSaveScrollPosition(docId, getPosition) {
  if (scrollSaveTimeout) clearTimeout(scrollSaveTimeout);
  
  scrollSaveTimeout = setTimeout(() => {
    const position = getPosition();
    saveReadingProgress(docId, position);
  }, 1000); // Save 1s after scrolling stops
}

// Restore scroll position
export function restoreScrollPosition(docId, container) {
  const history = getDocHistory(docId);
  const { scrollTop, scrollLeft, page } = history.lastPosition;
  
  if (container && (scrollTop > 0 || scrollLeft > 0)) {
    // Small delay to ensure content is rendered
    setTimeout(() => {
      container.scrollTop = scrollTop;
      container.scrollLeft = scrollLeft;
    }, 50);
  }
  
  return history.lastPosition;
}

// Initialize history tracking for reader
export function initializeHistoryTracking(store) {
  let currentSession = null;
  let currentDocId = null;
  
  store.subscribe('currentDoc', (doc) => {
    // End previous session
    if (currentSession && currentDocId) {
      const container = document.getElementById('readerContent');
      const endPosition = container ? {
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
        page: getCurrentPageNumber(container),
      } : null;
      endReadingSession(currentDocId, currentSession.id, endPosition);
    }
    
    // Start new session
    if (doc) {
      currentDocId = doc.id;
      currentSession = startReadingSession(doc.id);
      restoreScrollPosition(doc.id, document.getElementById('readerContent'));
    } else {
      currentDocId = null;
      currentSession = null;
    }
  });
  
  // Save scroll position on scroll
  document.addEventListener('scroll', (e) => {
    if (currentDocId && e.target.id === 'readerContent') {
      autoSaveScrollPosition(currentDocId, () => ({
        scrollTop: e.target.scrollTop,
        scrollLeft: e.target.scrollLeft,
        page: getCurrentPageNumber(e.target),
      }));
    }
  }, { passive: true });
}

function getCurrentPageNumber(container) {
  // For PDF: check if there's a page indicator
  const pageElements = container.querySelectorAll('[data-page-number]');
  if (pageElements.length > 0) {
    // Find the most visible page
    let bestPage = 1;
    let bestVisibility = 0;
    pageElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const visibility = Math.max(0, Math.min(
        rect.bottom, window.innerHeight
      ) - Math.max(rect.top, 0)) / rect.height;
      if (visibility > bestVisibility) {
        bestVisibility = visibility;
        bestPage = parseInt(el.dataset.pageNumber) || 1;
      }
    });
    return bestPage;
  }
  
  // For text/markdown: estimate by scroll position
  const scrollPercent = container.scrollTop / (container.scrollHeight - container.clientHeight);
  return Math.max(1, Math.round(scrollPercent * 100));
}