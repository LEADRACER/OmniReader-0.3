/**
 * OmniReader — Full-Text Search Service
 * Search across all uploaded documents. Indexed in localStorage.
 */

const SEARCH_INDEX_KEY = 'omnireader-search-index';

function loadIndex() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_INDEX_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveIndex(index) {
  localStorage.setItem(SEARCH_INDEX_KEY, JSON.stringify(index));
}

// Build search index for a document
export function indexDocument(docId, docName, docType, content) {
  if (!content || docType === 'pdf') return; // PDF indexing TBD
  
  const index = loadIndex();
  
  // Simple word-level index
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  const wordPositions = {};
  words.forEach((word, i) => {
    if (!wordPositions[word]) wordPositions[word] = [];
    wordPositions[word].push(i);
  });
  
  index[docId] = {
    name: docName,
    type: docType,
    wordPositions,
    wordCount: words.length,
    indexedAt: Date.now(),
  };
  
  saveIndex(index);
}

export function removeFromIndex(docId) {
  const index = loadIndex();
  if (index[docId]) {
    delete index[docId];
    saveIndex(index);
  }
}

export function search(query, options = {}) {
  const { limit = 20, docId = null } = options;
  const index = loadIndex();
  const searchTerms = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  
  if (searchTerms.length === 0) return [];
  
  const results = [];
  
  Object.entries(index).forEach(([id, docIndex]) => {
    if (docId && id !== docId) return;
    
    let score = 0;
    const matches = {};
    
    searchTerms.forEach(term => {
      // Exact word matches
      if (docIndex.wordPositions[term]) {
        score += docIndex.wordPositions[term].length * 10;
        matches[term] = docIndex.wordPositions[term].length;
      }
      
      // Partial matches (prefix)
      Object.keys(docIndex.wordPositions).forEach(indexedWord => {
        if (indexedWord.startsWith(term) && indexedWord !== term) {
          score += docIndex.wordPositions[indexedWord].length * 2;
          matches[indexedWord] = (matches[indexedWord] || 0) + docIndex.wordPositions[indexedWord].length;
        }
      });
    });
    
    if (score > 0) {
      results.push({
        docId: id,
        name: docIndex.name,
        type: docIndex.type,
        score,
        matches,
        wordCount: docIndex.wordCount,
      });
    }
  });
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

export function getIndexStats() {
  const index = loadIndex();
  const docCount = Object.keys(index).length;
  let totalWords = 0;
  let totalUniqueWords = new Set();
  
  Object.values(index).forEach(doc => {
    totalWords += doc.wordCount;
    Object.keys(doc.wordPositions).forEach(w => totalUniqueWords.add(w));
  });
  
  return {
    docCount,
    totalWords,
    uniqueWords: totalUniqueWords.size,
  };
}

export function clearIndex() {
  localStorage.removeItem(SEARCH_INDEX_KEY);
}

// Re-index all documents from store
export function rebuildIndex(store) {
  const index = loadIndex();
  const docs = store.getState().documents;
  
  docs.forEach(doc => {
    if (doc.type !== 'pdf' && doc.content) {
      indexDocument(doc.id, doc.name, doc.type, doc.content);
    }
  });
}