/* ============================================
   Explorer - File browser for network PDFs
   ============================================ */

(() => {
  // --- PDF.js worker ---
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // --- State ---
  let allFiles = [];
  let activeYear = 'all';
  let searchQuery = '';
  let previewDoc = null;
  let previewPage = 1;
  let previewTotal = 0;

  // --- DOM refs ---
  const searchInput = document.getElementById('search-input');
  const yearTabs = document.getElementById('year-tabs');
  const fileGrid = document.getElementById('file-grid');
  const fileCount = document.getElementById('file-count');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const previewModal = document.getElementById('preview-modal');
  const previewBackdrop = document.getElementById('preview-backdrop');
  const previewClose = document.getElementById('preview-close');
  const previewTitle = document.getElementById('preview-title');
  const previewCanvas = document.getElementById('preview-canvas');
  const previewPrev = document.getElementById('preview-prev');
  const previewNext = document.getElementById('preview-next');
  const previewPageIndicator = document.getElementById('preview-page-indicator');
  const btnDarkmode = document.getElementById('btn-darkmode');
  const toastContainer = document.getElementById('toast-container');

  // --- Dark Mode ---
  function initDarkMode() {
    const saved = localStorage.getItem('signit-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const theme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('signit-theme', theme);
  }

  btnDarkmode.addEventListener('click', toggleDarkMode);
  initDarkMode();

  // --- Toast ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Format file size ---
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  // --- Fetch files ---
  async function loadFiles() {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Erreur serveur');
      allFiles = await res.json();
      loading.hidden = true;
      renderFiles();
    } catch (err) {
      loading.hidden = true;
      showToast('Erreur lors du chargement des fichiers', 'error');
      console.error(err);
    }
  }

  // --- Filter ---
  function getFilteredFiles() {
    const q = searchQuery.toLowerCase().trim();
    return allFiles.filter(f => {
      if (activeYear !== 'all' && f.year !== activeYear) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // --- Render ---
  function renderFiles() {
    const filtered = getFilteredFiles();
    fileGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.hidden = false;
      fileCount.textContent = '0 fichiers';
      return;
    }

    emptyState.hidden = true;
    fileCount.textContent = filtered.length + ' fichier' + (filtered.length > 1 ? 's' : '');

    for (const file of filtered) {
      const card = document.createElement('div');
      card.className = 'file-card glass-panel';
      card.dataset.year = file.year;
      card.dataset.name = file.name;

      card.innerHTML = `
        <div class="file-card__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff6fa3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div class="file-card__info">
          <span class="file-card__name" title="${file.name}">${file.name.replace('.pdf', '')}</span>
          <span class="file-card__meta">
            <span class="file-card__year">${file.year}</span>
            <span class="file-card__size">${formatSize(file.size)}</span>
          </span>
        </div>
      `;

      card.addEventListener('click', () => openPreview(file));
      fileGrid.appendChild(card);
    }
  }

  // --- Search ---
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderFiles();
  });

  // --- Year tabs ---
  yearTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.explorer__tab');
    if (!tab) return;
    yearTabs.querySelectorAll('.explorer__tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeYear = tab.dataset.year;
    renderFiles();
  });

  // --- Preview ---
  async function openPreview(file) {
    previewTitle.textContent = file.name;
    previewModal.hidden = false;
    previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewPageIndicator.textContent = '...';

    try {
      const url = '/api/pdf/' + encodeURIComponent(file.year) + '/' + encodeURIComponent(file.name);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fichier introuvable');
      const arrayBuffer = await res.arrayBuffer();

      previewDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      previewTotal = previewDoc.numPages;
      previewPage = 1;
      await renderPreviewPage();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'ouverture du PDF', 'error');
      closePreview();
    }
  }

  async function renderPreviewPage() {
    if (!previewDoc) return;
    const page = await previewDoc.getPage(previewPage);

    // Calculate scale to fit within the preview card while keeping aspect ratio
    const baseViewport = page.getViewport({ scale: 1 });
    const container = previewCanvas.parentElement;
    const maxWidth = container.clientWidth - 2;  // minus border
    const maxHeight = window.innerHeight * 0.65;
    const scaleW = maxWidth / baseViewport.width;
    const scaleH = maxHeight / baseViewport.height;
    const scale = Math.min(scaleW, scaleH, 2); // cap at 2x

    const viewport = page.getViewport({ scale });

    previewCanvas.width = viewport.width;
    previewCanvas.height = viewport.height;

    await page.render({
      canvasContext: previewCanvas.getContext('2d'),
      viewport: viewport,
    }).promise;

    previewPageIndicator.textContent = previewPage + ' / ' + previewTotal;
    previewPrev.disabled = previewPage <= 1;
    previewNext.disabled = previewPage >= previewTotal;
  }

  function closePreview() {
    previewModal.hidden = true;
    previewDoc = null;
  }

  previewBackdrop.addEventListener('click', closePreview);
  previewClose.addEventListener('click', closePreview);
  previewPrev.addEventListener('click', () => {
    if (previewPage > 1) { previewPage--; renderPreviewPage(); }
  });
  previewNext.addEventListener('click', () => {
    if (previewPage < previewTotal) { previewPage++; renderPreviewPage(); }
  });

  document.addEventListener('keydown', (e) => {
    if (previewModal.hidden) return;
    if (e.key === 'Escape') closePreview();
    if (e.key === 'ArrowLeft' && previewPage > 1) { previewPage--; renderPreviewPage(); }
    if (e.key === 'ArrowRight' && previewPage < previewTotal) { previewPage++; renderPreviewPage(); }
  });

  // --- Init ---
  loadFiles();
})();
