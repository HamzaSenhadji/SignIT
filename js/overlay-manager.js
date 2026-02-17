/* ============================================
   Overlay Manager - DOM, drag, resize, select
   ============================================ */

const OverlayManager = (() => {
  const overlayLayer = document.getElementById('overlay-layer');
  let dragState = null;
  let resizeState = null;

  function createOverlayElement(overlay) {
    const el = document.createElement('div');
    el.className = `overlay overlay--${overlay.type}`;
    el.dataset.id = overlay.id;
    el.style.left = overlay.x + 'px';
    el.style.top = overlay.y + 'px';
    el.style.width = overlay.w + 'px';
    el.style.height = overlay.h + 'px';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'overlay__delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      removeOverlay(overlay.id);
    });
    el.appendChild(deleteBtn);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'overlay__resize';
    resizeHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startResize(e, overlay.id);
    });
    el.appendChild(resizeHandle);

    // Content area
    if (overlay.type === 'text') {
      const content = document.createElement('div');
      content.className = 'overlay__content';
      content.contentEditable = true;
      content.innerText = overlay.data.text || 'Texte';
      content.style.fontSize = (overlay.data.fontSize || 16) + 'px';
      content.style.color = overlay.data.color || '#000000';
      content.style.fontFamily = overlay.data.fontFamily || 'Helvetica, sans-serif';
      content.style.fontWeight = overlay.data.bold ? 'bold' : 'normal';
      content.style.fontStyle = overlay.data.italic ? 'italic' : 'normal';

      // Prevent drag when editing text
      content.addEventListener('pointerdown', (e) => e.stopPropagation());
      content.addEventListener('input', () => {
        const ov = getOverlayById(overlay.id);
        if (ov) ov.data.text = content.innerText;
      });

      el.appendChild(content);
    } else if (overlay.type === 'signature') {
      const img = document.createElement('img');
      img.src = overlay.data.dataUrl;
      img.alt = 'Signature';
      img.draggable = false;
      el.appendChild(img);
    }

    // Select on click
    el.addEventListener('pointerdown', (e) => {
      selectOverlay(overlay.id);
      startDrag(e, overlay.id);
    });

    return el;
  }

  function renderOverlays() {
    overlayLayer.innerHTML = '';
    const { overlays, currentPage } = App.state;
    const pageOverlays = overlays.filter(o => o.page === currentPage);

    pageOverlays.forEach(overlay => {
      const el = createOverlayElement(overlay);
      overlayLayer.appendChild(el);
    });
  }

  function addOverlay(overlay) {
    App.state.overlays.push(overlay);
    renderOverlays();
    selectOverlay(overlay.id);
  }

  function removeOverlay(id) {
    App.state.overlays = App.state.overlays.filter(o => o.id !== id);
    if (App.state.selectedOverlayId === id) {
      App.state.selectedOverlayId = null;
      TextEditor.hidePanel();
    }
    renderOverlays();
  }

  function getOverlayById(id) {
    return App.state.overlays.find(o => o.id === id);
  }

  function selectOverlay(id) {
    App.state.selectedOverlayId = id;

    // Update DOM classes
    overlayLayer.querySelectorAll('.overlay').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === id);
    });

    const overlay = getOverlayById(id);
    if (overlay && overlay.type === 'text') {
      TextEditor.showPanel(overlay);
    } else {
      TextEditor.hidePanel();
    }
  }

  function deselectAll() {
    App.state.selectedOverlayId = null;
    overlayLayer.querySelectorAll('.overlay').forEach(el => {
      el.classList.remove('selected');
    });
    TextEditor.hidePanel();
  }

  // --- Drag ---
  function startDrag(e, id) {
    const el = overlayLayer.querySelector(`[data-id="${id}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragState = {
      id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);

    el.addEventListener('pointermove', onDragMove);
    el.addEventListener('pointerup', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState) return;
    const layerRect = overlayLayer.getBoundingClientRect();
    const overlay = getOverlayById(dragState.id);
    if (!overlay) return;

    let newX = e.clientX - layerRect.left - dragState.offsetX;
    let newY = e.clientY - layerRect.top - dragState.offsetY;

    // Clamp within bounds
    newX = Math.max(0, Math.min(newX, layerRect.width - overlay.w));
    newY = Math.max(0, Math.min(newY, layerRect.height - overlay.h));

    overlay.x = newX;
    overlay.y = newY;

    const el = overlayLayer.querySelector(`[data-id="${dragState.id}"]`);
    if (el) {
      el.style.left = newX + 'px';
      el.style.top = newY + 'px';
    }
  }

  function onDragEnd(e) {
    if (!dragState) return;
    const el = overlayLayer.querySelector(`[data-id="${dragState.id}"]`);
    if (el) {
      el.classList.remove('dragging');
      el.removeEventListener('pointermove', onDragMove);
      el.removeEventListener('pointerup', onDragEnd);
    }
    dragState = null;
  }

  // --- Resize ---
  function startResize(e, id) {
    const overlay = getOverlayById(id);
    if (!overlay) return;

    resizeState = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startW: overlay.w,
      startH: overlay.h,
    };

    document.addEventListener('pointermove', onResizeMove);
    document.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e) {
    if (!resizeState) return;
    const overlay = getOverlayById(resizeState.id);
    if (!overlay) return;

    const dx = e.clientX - resizeState.startX;
    const dy = e.clientY - resizeState.startY;

    overlay.w = Math.max(40, resizeState.startW + dx);
    overlay.h = Math.max(20, resizeState.startH + dy);

    const el = overlayLayer.querySelector(`[data-id="${resizeState.id}"]`);
    if (el) {
      el.style.width = overlay.w + 'px';
      el.style.height = overlay.h + 'px';
    }
  }

  function onResizeEnd() {
    resizeState = null;
    document.removeEventListener('pointermove', onResizeMove);
    document.removeEventListener('pointerup', onResizeEnd);
  }

  // Deselect when clicking on empty overlay layer area
  overlayLayer.addEventListener('pointerdown', (e) => {
    if (e.target === overlayLayer) {
      deselectAll();
    }
  });

  // Re-render overlays when page changes
  document.addEventListener('page-changed', () => renderOverlays());

  return { addOverlay, removeOverlay, renderOverlays, selectOverlay, deselectAll, getOverlayById };
})();
