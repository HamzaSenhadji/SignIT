/* ============================================
   Signature - Modal, capture, overlay creation
   ============================================ */

const Signature = (() => {
  const modal = document.getElementById('signature-modal');
  const sigCanvas = document.getElementById('signature-canvas');
  const btnClear = document.getElementById('sig-clear');
  const btnUndo = document.getElementById('sig-undo');
  const btnCancel = document.getElementById('sig-cancel');
  const btnConfirm = document.getElementById('sig-confirm');
  const backdrop = modal.querySelector('.modal__backdrop');

  let signaturePad = null;

  function open() {
    modal.hidden = false;
    // Wait for the modal to be laid out before sizing the canvas
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initPad();
      });
    });
  }

  function close() {
    modal.hidden = true;
    if (signaturePad) {
      signaturePad.clear();
    }
  }

  function initPad() {
    // Size canvas to its displayed size
    const wrapper = sigCanvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    sigCanvas.width = rect.width;
    sigCanvas.height = rect.height;

    if (signaturePad) {
      signaturePad.off();
      signaturePad = null;
    }

    signaturePad = new SignaturePad(sigCanvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#1e293b',
      minWidth: 1.5,
      maxWidth: 3,
    });
  }

  function confirm() {
    if (signaturePad.isEmpty()) {
      App.showToast('Veuillez dessiner une signature', 'error');
      return;
    }

    const dataUrl = signaturePad.toDataURL('image/png');
    const id = 'overlay-' + Date.now();
    const overlay = {
      id,
      type: 'signature',
      page: App.state.currentPage,
      x: 60,
      y: 120,
      w: 220,
      h: 80,
      data: { dataUrl }
    };

    OverlayManager.addOverlay(overlay);
    close();
    App.showToast('Signature ajoutee', 'success');
  }

  // --- Events ---
  btnClear.addEventListener('click', () => {
    if (signaturePad) signaturePad.clear();
  });

  btnUndo.addEventListener('click', () => {
    if (signaturePad) {
      const data = signaturePad.toData();
      if (data.length > 0) {
        data.pop();
        signaturePad.fromData(data);
      }
    }
  });

  btnCancel.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  btnConfirm.addEventListener('click', confirm);

  // Handle window resize to re-init pad dimensions
  window.addEventListener('resize', () => {
    if (!modal.hidden && signaturePad) {
      const data = signaturePad.toData();
      initPad();
      signaturePad.fromData(data);
    }
  });

  return { open, close };
})();
