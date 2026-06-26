import './style.css';
import { initApp } from './app.js';
import { store } from './store.js';

// Apply saved theme before DOM renders to prevent flash
const savedTheme = store.getTheme();
document.documentElement.setAttribute('data-theme', savedTheme);

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — non-critical, app works without it
    });
  }
});
