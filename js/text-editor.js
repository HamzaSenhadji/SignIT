/* ============================================
   Text Editor - Text overlays + properties panel
   ============================================ */

const TextEditor = (() => {
  const panel = document.getElementById('properties-panel');
  const propFont = document.getElementById('prop-font');
  const propSize = document.getElementById('prop-size');
  const propSizeValue = document.getElementById('prop-size-value');
  const propColor = document.getElementById('prop-color');
  const propBold = document.getElementById('prop-bold');
  const propItalic = document.getElementById('prop-italic');
  const propDelete = document.getElementById('prop-delete');
  const btnClosePanel = document.getElementById('btn-close-panel');

  let currentOverlayId = null;

  function createTextOverlay() {
    const id = 'overlay-' + Date.now();
    const overlay = {
      id,
      type: 'text',
      page: App.state.currentPage,
      x: 80,
      y: 80,
      w: 180,
      h: 36,
      data: {
        text: 'Texte',
        fontSize: 16,
        color: '#000000',
        fontFamily: 'Helvetica',
        bold: false,
        italic: false,
      }
    };
    OverlayManager.addOverlay(overlay);
    return overlay;
  }

  function showPanel(overlay) {
    currentOverlayId = overlay.id;
    panel.hidden = false;

    // Sync controls with overlay data
    propFont.value = overlay.data.fontFamily || 'Helvetica';
    propSize.value = overlay.data.fontSize || 16;
    propSizeValue.textContent = (overlay.data.fontSize || 16) + 'px';
    propColor.value = overlay.data.color || '#000000';
    propBold.classList.toggle('active', !!overlay.data.bold);
    propItalic.classList.toggle('active', !!overlay.data.italic);
  }

  function hidePanel() {
    panel.hidden = true;
    currentOverlayId = null;
  }

  function updateOverlayStyle() {
    if (!currentOverlayId) return;
    const overlay = OverlayManager.getOverlayById(currentOverlayId);
    if (!overlay) return;

    const el = document.querySelector(`[data-id="${currentOverlayId}"] .overlay__content`);
    if (!el) return;

    el.style.fontSize = overlay.data.fontSize + 'px';
    el.style.color = overlay.data.color;
    el.style.fontFamily = getCssFontFamily(overlay.data.fontFamily);
    el.style.fontWeight = overlay.data.bold ? 'bold' : 'normal';
    el.style.fontStyle = overlay.data.italic ? 'italic' : 'normal';
  }

  function getCssFontFamily(pdfFont) {
    const map = {
      'Helvetica': 'Helvetica, Arial, sans-serif',
      'Times-Roman': '"Times New Roman", Times, serif',
      'Courier': '"Courier New", Courier, monospace',
    };
    return map[pdfFont] || pdfFont;
  }

  // --- Event listeners ---
  propFont.addEventListener('change', () => {
    const overlay = OverlayManager.getOverlayById(currentOverlayId);
    if (overlay) {
      overlay.data.fontFamily = propFont.value;
      updateOverlayStyle();
    }
  });

  propSize.addEventListener('input', () => {
    propSizeValue.textContent = propSize.value + 'px';
    const overlay = OverlayManager.getOverlayById(currentOverlayId);
    if (overlay) {
      overlay.data.fontSize = parseInt(propSize.value, 10);
      updateOverlayStyle();
    }
  });

  propColor.addEventListener('input', () => {
    const overlay = OverlayManager.getOverlayById(currentOverlayId);
    if (overlay) {
      overlay.data.color = propColor.value;
      updateOverlayStyle();
    }
  });

  propBold.addEventListener('click', () => {
    const overlay = OverlayManager.getOverlayById(currentOverlayId);
    if (overlay) {
      overlay.data.bold = !overlay.data.bold;
      propBold.classList.toggle('active', overlay.data.bold);
      updateOverlayStyle();
    }
  });

  propItalic.addEventListener('click', () => {
    const overlay = OverlayManager.getOverlayById(currentOverlayId);
    if (overlay) {
      overlay.data.italic = !overlay.data.italic;
      propItalic.classList.toggle('active', overlay.data.italic);
      updateOverlayStyle();
    }
  });

  propDelete.addEventListener('click', () => {
    if (currentOverlayId) {
      OverlayManager.removeOverlay(currentOverlayId);
    }
  });

  btnClosePanel.addEventListener('click', () => {
    hidePanel();
    OverlayManager.deselectAll();
  });

  return { createTextOverlay, showPanel, hidePanel };
})();
