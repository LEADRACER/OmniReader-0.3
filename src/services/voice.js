// Voice service — wraps Web Speech API with pause/resume/speed controls
let utterance = null;
let isPaused = false;
let isActive = false;
let voiceRate = 1.0;
let onEndCallback = null;
let progressInterval = null;

const LANG_MAP = {
  'Spanish': 'es-ES', 'French': 'fr-FR', 'Japanese': 'ja-JP',
  'German': 'de-DE', 'Chinese': 'zh-CN', 'English': 'en-US',
};

export function isVoiceActive() {
  return isActive;
}

export function isVoicePaused() {
  return isPaused;
}

export function getVoiceRate() {
  return voiceRate;
}

export function speak(text, language = 'English', onEnd) {
  stop();

  if (!text || !text.trim()) return;

  const synth = window.speechSynthesis;

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = voiceRate;

  const langCode = LANG_MAP[language] || 'en-US';
  utterance.lang = langCode;

  // Find matching voice
  const voices = synth.getVoices();
  const matched = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
  if (matched) utterance.voice = matched;

  utterance.onend = () => {
    cleanup();
    if (onEndCallback) onEndCallback();
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    cleanup();
  };

  synth.speak(utterance);
  isActive = true;
  isPaused = false;
  onEndCallback = onEnd || null;

  // Emit progress every 500ms for UI updates
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (!isActive) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }, 500);
}

export function pause() {
  if (!isActive || isPaused) return;
  window.speechSynthesis.pause();
  isPaused = true;
}

export function resume() {
  if (!isActive || !isPaused) return;
  window.speechSynthesis.resume();
  isPaused = false;
}

export function togglePause() {
  if (isPaused) resume();
  else pause();
}

export function stop() {
  window.speechSynthesis.cancel();
  cleanup();
}

export function setRate(rate) {
  voiceRate = Math.max(0.25, Math.min(3.0, rate));
  // If currently speaking, restart with new rate
  if (isActive) {
    const text = utterance?.text || '';
    const lang = LANG_MAP[getLanguage()] ? getLanguage() : 'English';
    const wasPaused = isPaused;
    speak(text, lang, onEndCallback);
    if (wasPaused) pause();
  }
}

function getLanguage() {
  // Best-effort reverse lookup from utterance.lang
  for (const [name, code] of Object.entries(LANG_MAP)) {
    if (utterance?.lang === code) return name;
  }
  return 'English';
}

function cleanup() {
  isActive = false;
  isPaused = false;
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

export function getVoices() {
  return window.speechSynthesis?.getVoices() || [];
}
