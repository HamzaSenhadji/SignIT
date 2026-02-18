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
  const btnFeuille = document.getElementById('btn-feuille');

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

      dropZone.hidden = true;
      mainContent.hidden = false;
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

  // --- Quick load PDF from URL ---
  async function loadPdfFromUrl(url) {
    try {
      showToast('Chargement en cours...', 'info');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fichier introuvable');
      const arrayBuffer = await response.arrayBuffer();
      await PdfRenderer.loadPdf(arrayBuffer);

      dropZone.hidden = true;
      mainContent.hidden = false;
      btnText.disabled = false;
      btnSignature.disabled = false;
      btnExport.disabled = false;

      updatePageNav();
      showToast('PDF charge avec succes', 'success');
    } catch (err) {
      console.error('Error loading PDF from URL:', err);
      showToast('Erreur lors du chargement du PDF', 'error');
    }
  }

  // --- Event wiring ---

  // Quick feuille button — load PDF
  btnFeuille.addEventListener('click', () => {
    loadPdfFromUrl('feuilles/FeuilleMat%C3%A9riel.pdf');
  });

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

  // Export button — toggle menu
  const exportMenu = document.getElementById('export-menu');
  const filenameModal = document.getElementById('filename-modal');
  const filenameInput = document.getElementById('filename-input');
  const filenameBackdrop = document.getElementById('filename-backdrop');
  const filenameCancel = document.getElementById('filename-cancel');
  const filenameConfirm = document.getElementById('filename-confirm');
  let pendingExportAction = null; // { action: 'download' } or { action: 'save', year: '2025' }

  btnExport.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.hidden = !exportMenu.hidden;
  });

  exportMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.export-menu__item');
    if (!item) return;
    exportMenu.hidden = true;

    const action = item.dataset.action;
    pendingExportAction = { action };
    if (action === 'save') pendingExportAction.year = item.dataset.year;

    // Open filename modal
    filenameInput.value = 'Signadji-export';
    filenameModal.hidden = false;
    filenameInput.focus();
    filenameInput.select();
  });

  function closeFilenameModal() {
    filenameModal.hidden = true;
    pendingExportAction = null;
  }

  function confirmFilename() {
    const name = filenameInput.value.trim();
    if (!name) return;
    const filename = name.endsWith('.pdf') ? name : name + '.pdf';
    filenameModal.hidden = true;

    if (pendingExportAction.action === 'download') {
      Exporter.exportAndDownload(filename);
    } else if (pendingExportAction.action === 'save') {
      Exporter.exportAndSave(pendingExportAction.year, filename);
    }
    pendingExportAction = null;
  }

  filenameConfirm.addEventListener('click', confirmFilename);
  filenameCancel.addEventListener('click', closeFilenameModal);
  filenameBackdrop.addEventListener('click', closeFilenameModal);
  filenameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmFilename();
    if (e.key === 'Escape') closeFilenameModal();
  });

  // Close export menu when clicking elsewhere
  document.addEventListener('click', () => {
    exportMenu.hidden = true;
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
