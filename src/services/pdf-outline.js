/**
 * OmniReader — PDF Outline/TOC Service
 * Extracts PDF bookmarks/outline for navigation with page resolution.
 */

// Dynamic import to avoid bundling pdfjs-dist twice
async function getPdfjs() {
  return await import('pdfjs-dist');
}

export async function getPDFOutlineWithPages(data) {
  if (!data || !(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
    return null;
  }
  
  try {
    const pdfjsLib = await getPdfjs();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const outline = await pdf.getOutline();
    
    if (!outline || outline.length === 0) {
      return null;
    }
    
    // Get page count for reference
    const totalPages = pdf.numPages;
    
    // Process outline with page resolution
    const processed = await processOutlineWithPages(outline, pdf);
    
    return {
      totalPages,
      items: processed,
    };
  } catch (err) {
    console.warn('Failed to extract PDF outline:', err);
    return null;
  }
}

async function processOutlineWithPages(outline, pdf) {
  const results = [];
  
  for (const item of outline) {
    let pageNumber = null;
    
    if (item.dest) {
      // Resolve destination to page number
      try {
        const dest = await pdf.getDestination(item.dest);
        if (Array.isArray(dest) && dest.length > 0) {
          const pageRef = dest[0];
          // Page reference can be a page object or page number
          if (typeof pageRef === 'number') {
            pageNumber = pageRef + 1; // 0-indexed to 1-indexed
          } else if (pageRef && typeof pageRef === 'object') {
            // It's a page reference object, get page index
            const pageIndex = await pdf.getPageIndex(pageRef);
            pageNumber = pageIndex + 1;
          }
        }
      } catch (e) {
        // Could not resolve destination
        console.debug('Could not resolve outline dest:', e);
      }
    }
    
    const processed = {
      title: item.title,
      page: pageNumber,
      url: item.url,
      items: item.items ? await processOutlineWithPages(item.items, pdf) : [],
    };
    
    results.push(processed);
  }
  
  return results;
}

// Flatten outline for search
export function flattenOutline(outline, prefix = '') {
  const flat = [];
  
  outline.forEach(item => {
    flat.push({
      title: prefix + item.title,
      page: item.page,
      ...item,
    });
    if (item.items && item.items.length > 0) {
      flat.push(...flattenOutline(item.items, prefix + '  '));
    }
  });
  
  return flat;
}

// Find page number by outline title (fuzzy match)
export function findPageByTitle(outline, title) {
  const flat = flattenOutline(outline);
  const lowerTitle = title.toLowerCase();
  
  // Exact match first
  let match = flat.find(item => item.title.toLowerCase() === lowerTitle);
  if (match) return match.page;
  
  // Contains match
  match = flat.find(item => item.title.toLowerCase().includes(lowerTitle));
  if (match) return match.page;
  
  // Word-based match
  const titleWords = lowerTitle.split(/\s+/).filter(w => w.length > 2);
  match = flat.find(item => {
    const itemLower = item.title.toLowerCase();
    return titleWords.every(w => itemLower.includes(w));
  });
  if (match) return match.page;
  
  return null;
}