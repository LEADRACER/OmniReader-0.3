/**
 * OmniReader — Mobile Gesture Support
 * Touch gestures for mobile: swipe, pinch-zoom, pull-to-refresh
 */

export function initMobileGestures(store) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isPulling = false;
  let pullDistance = 0;
  let lastPinchDistance = 0;
  let currentScale = 1;
  let isPinching = false;
  
  const readerContent = document.getElementById('readerContent');
  if (!readerContent) return;
  
  // Pull-to-refresh threshold
  const PULL_THRESHOLD = 80;
  const PULL_MAX = 150;
  
  // Touch start
  readerContent.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      
      // Check if at top for pull-to-refresh
      isPulling = readerContent.scrollTop === 0;
    } else if (e.touches.length === 2) {
      // Pinch start
      isPinching = true;
      lastPinchDistance = getPinchDistance(e.touches[0], e.touches[1]);
    }
  }, { passive: true });
  
  // Touch move
  readerContent.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isPulling) {
      const deltaY = e.touches[0].clientY - touchStartY;
      if (deltaY > 0) {
        pullDistance = Math.min(deltaY * 0.5, PULL_MAX);
        readerContent.style.transform = `translateY(${pullDistance}px)`;
        readerContent.style.transition = 'none';
        
        // Visual feedback
        if (pullDistance >= PULL_THRESHOLD) {
          readerContent.classList.add('pull-ready');
        } else {
          readerContent.classList.remove('pull-ready');
        }
      }
    } else if (e.touches.length === 2 && isPinching) {
      const currentDistance = getPinchDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / lastPinchDistance;
      
      // Only apply pinch zoom to PDF pages
      const pdfCanvases = readerContent.querySelectorAll('.pdf-page canvas');
      if (pdfCanvases.length > 0) {
        currentScale = Math.max(0.5, Math.min(3, currentScale * scaleChange));
        pdfCanvases.forEach(canvas => {
          canvas.style.transform = `scale(${currentScale})`;
          canvas.style.transformOrigin = 'center top';
        });
      }
      
      lastPinchDistance = currentDistance;
    }
  }, { passive: true });
  
  // Touch end
  readerContent.addEventListener('touchend', (e) => {
    // Pull-to-refresh release
    if (isPulling) {
      readerContent.style.transition = 'transform 0.3s ease';
      if (pullDistance >= PULL_THRESHOLD) {
        // Trigger refresh
        triggerRefresh(readerContent);
      } else {
        // Snap back
        readerContent.style.transform = 'translateY(0)';
      }
      readerContent.classList.remove('pull-ready');
      isPulling = false;
      pullDistance = 0;
    }
    
    // Swipe detection (single tap was already handled by selection)
    if (e.changedTouches.length === 1 && !isPinching) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Swipe: horizontal > 50px, vertical < 100px, fast < 300ms
      if (distance > 50 && deltaTime < 300 && Math.abs(deltaX) > Math.abs(deltaY)) {
        const doc = store.getCurrentDoc();
        if (doc && doc.type === 'pdf') {
          if (deltaX > 0) {
            // Swipe right - previous page
            navigatePDFPage('prev');
          } else {
            // Swipe left - next page
            navigatePDFPage('next');
          }
        }
      }
    }
    
    // Pinch end
    if (isPinching) {
      isPinching = false;
    }
  }, { passive: true });
  
  // Helper: Calculate pinch distance
  function getPinchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Helper: Trigger refresh
  function triggerRefresh(container) {
    // Add loading indicator
    const loader = document.createElement('div');
    loader.className = 'pull-refresh-loader';
    loader.innerHTML = '<div class="spinner"></div>';
    loader.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
    `;
    container.parentElement.insertBefore(loader, container);
    
    // Reload current document
    const doc = store.getCurrentDoc();
    if (doc) {
      store.selectDocument(doc.id);
    }
    
    // Clean up
    setTimeout(() => {
      loader.remove();
      container.style.transform = 'translateY(0)';
    }, 500);
  }
  
  // Helper: Navigate PDF page
  function navigatePDFPage(direction) {
    const container = readerContent;
    const pages = container.querySelectorAll('[data-page]');
    if (pages.length === 0) return;
    
    // Find current visible page
    let currentPage = 1;
    pages.forEach(page => {
      const rect = page.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
        currentPage = parseInt(page.dataset.page) || 1;
      }
    });
    
    let targetPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
    targetPage = Math.max(1, Math.min(pages.length, targetPage));
    
    const targetElement = container.querySelector(`[data-page="${targetPage}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  // Add CSS for pull-to-refresh
  if (!document.getElementById('mobile-gestures-style')) {
    const style = document.createElement('style');
    style.id = 'mobile-gestures-style';
    style.textContent = `
      #readerContent {
        touch-action: pan-y pinch-zoom;
        overflow-y: auto;
      }
      
      #readerContent.pull-ready {
        /* Visual indicator when pull threshold reached */
      }
      
      .pull-refresh-loader {
        pointer-events: none;
      }
      
      .pdf-page canvas {
        transition: transform 0.1s ease-out;
        transform-origin: center top;
      }
      
      /* Swipe hint for PDF */
      .pdf-swipe-hint {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.8rem;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 1000;
      }
      
      .pdf-swipe-hint.show {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Show swipe hint for PDF on mobile
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) {
    store.subscribe('currentDoc', (doc) => {
      if (doc && doc.type === 'pdf') {
        const hint = document.getElementById('pdf-swipe-hint') || createSwipeHint();
        hint.classList.add('show');
        setTimeout(() => hint.classList.remove('show'), 5000);
      }
    });
  }
  
  function createSwipeHint() {
    const hint = document.createElement('div');
    hint.id = 'pdf-swipe-hint';
    hint.className = 'pdf-swipe-hint';
    hint.textContent = 'Swipe left/right to change pages';
    document.body.appendChild(hint);
    return hint;
  }
}