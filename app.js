// App State
const state = {
    currentDoc: 'welcome',
    mode: 'detailed',
    language: 'English',
    documents: [
        { id: 'welcome', name: 'Welcome_Guide.md', type: 'markdown', content: '' }
    ],
    pdfDoc: null,
    pageNum: 1,
    pageCount: 0
};

// DOM Elements
const docList = document.getElementById('docList');
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const closeModal = document.getElementById('closeModal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const modeBtns = document.querySelectorAll('.mode-btn');
const readerContent = document.getElementById('readerContent');
const docTitle = document.getElementById('docTitle');
const pageCounter = document.getElementById('pageCounter');

// Configure PDF.js
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Initialize GSAP Animations
function initAnimations() {
    gsap.from('.app-container', { duration: 1, opacity: 0, scale: 0.95, ease: 'power3.out' });
    gsap.from('.sidebar', { duration: 1, x: -50, opacity: 0, delay: 0.3, ease: 'power3.out' });
    gsap.from('.main-content', { duration: 1, y: 20, opacity: 0, delay: 0.5, ease: 'power3.out' });
}

// UI Controllers
function toggleModal(show) {
    if (show) {
        uploadModal.classList.remove('hidden');
        gsap.from('.modal-content', { duration: 0.4, scale: 0.8, opacity: 0, ease: 'back.out(1.7)' });
    } else {
        gsap.to('.modal-content', {
            duration: 0.3,
            scale: 0.8,
            opacity: 0,
            onComplete: () => uploadModal.classList.add('hidden')
        });
    }
}

function updateDocList() {
    docList.innerHTML = '';
    state.documents.forEach(doc => {
        const item = document.createElement('div');
        item.className = `doc-item ${state.currentDoc === doc.id ? 'active' : ''}`;
        item.dataset.id = doc.id;
        item.innerHTML = `
            <ion-icon name="${doc.type === 'pdf' ? 'document-outline' : 'document-text-outline'}"></ion-icon>
            <span>${doc.name}</span>
        `;
        item.addEventListener('click', () => selectDocument(doc.id));
        docList.appendChild(item);
    });
}

async function selectDocument(id) {
    state.currentDoc = id;
    const doc = state.documents.find(d => d.id === id);
    docTitle.textContent = doc.name;
    updateDocList();

    // Animate doc selection
    gsap.from('.reader-viewport', { duration: 0.6, y: 10, opacity: 0.8, ease: 'power2.out' });
    simulateLoading();

    if (doc.type === 'pdf') {
        renderPDF(doc.data);
    } else {
        renderText(doc.content, doc.type);
    }
}

function renderText(content, type) {
    pageCounter.textContent = '1 / 1';
    let html = '';
    if (type === 'markdown') {
        html = `<article class="prose">${marked.parse(content || welcomeContent)}</article>`;
    } else {
        html = `<article class="prose"><pre style="white-space: pre-wrap; font-family: inherit;">${content}</pre></article>`;
    }
    readerContent.innerHTML = html;
    applyReadingMode();
}

async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: data });
    state.pdfDoc = await loadingTask.promise;
    state.pageCount = state.pdfDoc.numPages;
    state.pageNum = 1;
    renderPDFPage(state.pageNum);
    applyReadingMode();
}

async function renderPDFPage(num) {
    const page = await state.pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '8px';

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    readerContent.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'pdf-page-container';
    container.appendChild(canvas);
    readerContent.appendChild(container);

    pageCounter.textContent = `${num} / ${state.pageCount}`;
    await page.render(renderContext).promise;
}

function simulateLoading() {
    gsap.fromTo(readerContent,
        { opacity: 0, y: 5 },
        { duration: 0.4, opacity: 1, y: 0, ease: 'power2.out' }
    );
}

// Reading Mode Logic
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;

        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;

        // Transition animation
        gsap.to(readerContent, {
            duration: 0.2,
            opacity: 0,
            y: -5,
            onComplete: () => {
                applyReadingMode();
                gsap.to(readerContent, { duration: 0.3, opacity: 1, y: 0 });
            }
        });
    });
});

function applyReadingMode() {
    if (state.mode === 'detailed') {
        // Just keep standard rendering
    } else if (state.mode === 'summary') {
        // In a real app, we'd use an API. Here we simulate summary view
        const currentName = docTitle.textContent;
        readerContent.innerHTML = `
            <article class="prose">
                <h1>Smart Summary: ${currentName}</h1>
                <div class="glass" style="padding: 24px; border-radius: 16px; margin-top: 20px;">
                    <p><strong>Status:</strong> Analysis Complete</p>
                    <p>This document is a ${currentName.split('.').pop().toUpperCase()} file. Our engine has identified the core themes as Exploration, Modernization, and Efficient Information Retrieval.</p>
                    <ul>
                        <li>Key Takeaway A: Digital transformation is accelerating.</li>
                        <li>Key Takeaway B: Seamless integration is the gold standard of UX.</li>
                    </ul>
                </div>
            </article>
        `;
    } else if (state.mode === 'qa') {
        readerContent.innerHTML = `
            <article class="prose">
                <h1>Document Query Engine</h1>
                <p>Interactive insights for <strong>${docTitle.textContent}</strong></p>
                <div class="qa-chat" style="display: flex; flex-direction: column; gap: 16px; margin-top: 24px;">
                    <div class="glass" style="padding: 16px; border-radius: 12px;">
                        <strong>User:</strong> What is the main purpose?
                        <p style="margin-top: 8px;"><strong>OmniReader:</strong> Based on the section headers, the primary purpose is to provide a unified interface for reading multiple document formats while breaking language barriers.</p>
                    </div>
                </div>
            </article>
        `;
    }
}

// Event Listeners
uploadBtn.addEventListener('click', () => toggleModal(true));
closeModal.addEventListener('click', () => toggleModal(false));
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => handleFiles(fileInput.files));

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const result = e.target.result;
            const newDoc = {
                id: Date.now().toString(),
                name: file.name,
                type: file.name.endsWith('.pdf') ? 'pdf' : (file.name.endsWith('.md') ? 'markdown' : 'text'),
                content: file.name.endsWith('.pdf') ? null : result,
                data: file.name.endsWith('.pdf') ? new Uint8Array(result) : null
            };
            state.documents.push(newDoc);
            toggleModal(false);
            selectDocument(newDoc.id);
        };

        if (file.name.endsWith('.pdf')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    }
}

const welcomeContent = `
# Welcome to OmniReader

Experience documents in a whole new dimension. OmniReader is your futuristic hub for comprehensive reading and instantaneous translation.

### Key Capabilities:

- **Multi-Format:** PDF, Markdown, and Text.
- **Modes:** Switch between full detail, smart summaries, or an interactive Q&A.
- **Translate:** Break language barriers with 100+ languages.

Upload a file using the sidebar to begin your journey.
`;

// Lang Selector Simulation
document.getElementById('langSelector').addEventListener('click', () => {
    const langs = ['English', 'Spanish', 'French', 'Japanese', 'German', 'Chinese'];
    const currentIdx = langs.indexOf(state.language);
    state.language = langs[(currentIdx + 1) % langs.length];
    document.getElementById('currentLang').textContent = state.language;
    simulateLoading();
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initAnimations();
    state.documents[0].content = welcomeContent;
    updateDocList();
});
