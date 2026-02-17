/* ============================================
   App - Bootstrap, global state, event wiring
   ============================================ */

const App = (() => {
  const state = {
    pdfBytes: null,
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.5,
    overlays: [],
    selectedOverlayId: null,
  };

  // --- DOM refs ---
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const mainContent = document.getElementById('main-content');
  const btnImport = document.getElementById('btn-import');
  const btnText = document.getElementById('btn-text');
  const btnSignature = document.getElementById('btn-signature');
  const btnExport = document.getElementById('btn-export');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const pageIndicator = document.getElementById('page-indicator');
  const toastContainer = document.getElementById('toast-container');
  const btnDarkmode = document.getElementById('btn-darkmode');

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

  // --- PDF Loading ---
  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      showToast('Veuillez selectionner un fichier PDF', 'error');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      await PdfRenderer.loadPdf(arrayBuffer);

      // Show main content, hide drop zone
      dropZone.hidden = true;
      mainContent.hidden = false;

      // Enable buttons
      btnText.disabled = false;
      btnSignature.disabled = false;
      btnExport.disabled = false;

      updatePageNav();
      showToast('PDF charge avec succes', 'success');
    } catch (err) {
      console.error('Error loading PDF:', err);
      showToast('Erreur lors du chargement du PDF', 'error');
    }
  }

  // --- Navigation ---
  function updatePageNav() {
    pageIndicator.textContent = `${state.currentPage} / ${state.totalPages}`;
    btnPrev.disabled = state.currentPage <= 1;
    btnNext.disabled = state.currentPage >= state.totalPages;
  }

  async function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > state.totalPages) return;
    await PdfRenderer.renderPage(pageNum);
    updatePageNav();
  }

  // --- Event wiring ---

  // Import button → trigger file input
  btnImport.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Drop zone click
  dropZone.querySelector('.drop-zone__content').addEventListener('click', () => {
    fileInput.click();
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  // Navigation
  btnPrev.addEventListener('click', () => goToPage(state.currentPage - 1));
  btnNext.addEventListener('click', () => goToPage(state.currentPage + 1));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.isContentEditable) return;
    if (e.key === 'ArrowLeft') goToPage(state.currentPage - 1);
    if (e.key === 'ArrowRight') goToPage(state.currentPage + 1);
    if (e.key === 'Delete' && state.selectedOverlayId) {
      OverlayManager.removeOverlay(state.selectedOverlayId);
    }
    if (e.key === 'Escape') {
      OverlayManager.deselectAll();
    }
  });

  // Text button
  btnText.addEventListener('click', () => {
    TextEditor.createTextOverlay();
  });

  // Signature button
  btnSignature.addEventListener('click', () => {
    Signature.open();
  });

  // Export button
  btnExport.addEventListener('click', () => {
    Exporter.exportPdf();
  });

  // Listen for page changes
  document.addEventListener('page-changed', (e) => {
    updatePageNav();
  });

  // Click outside overlays to deselect
  document.getElementById('pdf-canvas').addEventListener('pointerdown', () => {
    OverlayManager.deselectAll();
  });

  return { state, showToast };
})();
