/* ============================================
   PDF Renderer - PDF.js loading & rendering
   ============================================ */

const PdfRenderer = (() => {
  // Set PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  const overlayLayer = document.getElementById('overlay-layer');

  async function loadPdf(arrayBuffer) {
    // .slice() creates an independent copy — PDF.js detaches the original ArrayBuffer
    App.state.pdfBytes = new Uint8Array(arrayBuffer.slice(0));

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    App.state.pdfDoc = await loadingTask.promise;
    App.state.totalPages = App.state.pdfDoc.numPages;
    App.state.currentPage = 1;

    await renderPage(1);
  }

  async function renderPage(pageNum) {
    const { pdfDoc, scale } = App.state;
    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Sync overlay layer dimensions
    overlayLayer.style.width = viewport.width + 'px';
    overlayLayer.style.height = viewport.height + 'px';

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    App.state.currentPage = pageNum;

    // Dispatch custom event for other modules
    document.dispatchEvent(new CustomEvent('page-changed', {
      detail: { page: pageNum, totalPages: App.state.totalPages }
    }));
  }

  return { loadPdf, renderPage };
})();
