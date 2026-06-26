const API_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/owl-alpha';
const SUMMARY_MODEL = 'openrouter/owl-alpha';

function getKey() {
  return localStorage.getItem('omnireader-openrouter-key') || '';
}

export function hasApiKey() {
  const key = getKey();
  return key.length > 0 && key.startsWith('sk-or-');
}

export function setApiKey(key) {
  localStorage.setItem('omnireader-openrouter-key', key);
}

export function clearApiKey() {
  localStorage.removeItem('omnireader-openrouter-key');
}

async function callOpenRouter(messages, options = {}) {
  const key = getKey();
  if (!key) throw new Error('No OpenRouter API key set');

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 2000;

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'OmniReader',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

export async function getSummary(documentName, documentText, docType) {
  const prompt = `You are a document summarization engine. Analyze the following ${docType.toUpperCase()} document titled "${documentName}" and provide:

1. **Core Theme/Topic** — What is this document about? (1-2 sentences)
2. **Key Takeaways** — 3-5 bullet points covering the most important information
3. **Structure Overview** — How the document is organized

Keep the summary concise and actionable. Use markdown formatting.

=== DOCUMENT START ===
${documentText.slice(0, 8000)}
=== DOCUMENT END ===`;

  return callOpenRouter([
    { role: 'system', content: 'You are a precise document summarization assistant. Return clean markdown.' },
    { role: 'user', content: prompt },
  ], { model: SUMMARY_MODEL, maxTokens: 1500, temperature: 0.3 });
}

export async function askQuestion(documentName, documentText, docType, conversationHistory, newQuestion) {
  const systemPrompt = `You are a document Q&A assistant. Answer questions based ONLY on the content of the document provided below. If the answer cannot be found in the document, say so clearly — do not make up information.

Document title: "${documentName}"
Document type: ${docType.toUpperCase()}

=== DOCUMENT CONTENT ===
${documentText.slice(0, 10000)}
=== DOCUMENT END ===`;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add up to 10 previous Q&A turns for context
  const recentHistory = conversationHistory.slice(-10);
  for (const entry of recentHistory) {
    messages.push({ role: 'user', content: entry.question });
    if (entry.answer) messages.push({ role: 'assistant', content: entry.answer });
  }

  // Add the new question
  messages.push({ role: 'user', content: newQuestion });

  return callOpenRouter(messages, { model: DEFAULT_MODEL, maxTokens: 1000, temperature: 0.2 });
}

export async function getTranslation(text, targetLang, sourceLang = 'auto') {
  const prompt = `Translate the following text to ${targetLang}. 
Only return the translated text, nothing else.

Source language: ${sourceLang}
Target language: ${targetLang}

TEXT TO TRANSLATE:
${text.slice(0, 4000)}`;

  return callOpenRouter([
    { role: 'system', content: 'You are a translator. Return only the translated text, no preamble.' },
    { role: 'user', content: prompt },
  ], { model: DEFAULT_MODEL, maxTokens: 2000, temperature: 0.1 });
}
