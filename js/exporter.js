/* ============================================
   Exporter - Bake overlays into PDF via pdf-lib
   ============================================ */

const Exporter = (() => {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  async function exportPdf() {
    const { pdfBytes, overlays, scale } = App.state;
    if (!pdfBytes) return;

    try {
      App.showToast('Export en cours...', 'info');

      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      // Embed fonts only when needed
      const fontCache = {};
      async function getFont(key) {
        if (fontCache[key]) return fontCache[key];
        const fontMap = {
          'Helvetica': StandardFonts.Helvetica,
          'Helvetica-Bold': StandardFonts.HelveticaBold,
          'Helvetica-Oblique': StandardFonts.HelveticaOblique,
          'Helvetica-BoldOblique': StandardFonts.HelveticaBoldOblique,
          'Times-Roman': StandardFonts.TimesRoman,
          'Times-Bold': StandardFonts.TimesRomanBold,
          'Times-Italic': StandardFonts.TimesRomanItalic,
          'Times-BoldItalic': StandardFonts.TimesRomanBoldItalic,
          'Courier': StandardFonts.Courier,
          'Courier-Bold': StandardFonts.CourierBold,
          'Courier-Oblique': StandardFonts.CourierOblique,
          'Courier-BoldOblique': StandardFonts.CourierBoldOblique,
        };
        const stdFont = fontMap[key] || fontMap['Helvetica'];
        fontCache[key] = await pdfDoc.embedFont(stdFont);
        return fontCache[key];
      }

      for (const overlay of overlays) {
        const pageIndex = overlay.page - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        const page = pages[pageIndex];
        const { height: pdfHeight } = page.getSize();

        // Convert screen coords to PDF coords
        const pdfX = overlay.x / scale;
        const pdfW = overlay.w / scale;
        const pdfH = overlay.h / scale;
        const pdfY = pdfHeight - (overlay.y / scale) - pdfH;

        if (overlay.type === 'text') {
          const { text, fontSize, color, fontFamily, bold, italic } = overlay.data;
          if (!text || !text.trim()) continue;

          const fontKey = getFontKey(fontFamily, bold, italic);
          const font = await getFont(fontKey);
          const pdfFontSize = fontSize / scale;
          const { r, g, b } = hexToRgb(color);
          const textColor = rgb(r / 255, g / 255, b / 255);

          // Strip characters the font can't encode (StandardFonts = WinAnsi only)
          const sanitized = sanitizeText(text, font);

          // pdf-lib drawText doesn't support newlines — draw line by line
          const lines = sanitized.split('\n');
          let lineY = pdfY + pdfH - pdfFontSize - 2 / scale;

          for (const line of lines) {
            if (lineY < 0) break;
            if (line.length === 0) {
              lineY -= pdfFontSize * 1.2;
              continue;
            }
            page.drawText(line, {
              x: pdfX + 4 / scale,
              y: lineY,
              size: pdfFontSize,
              font,
              color: textColor,
            });
            lineY -= pdfFontSize * 1.2;
          }
        } else if (overlay.type === 'signature') {
          const pngBytes = dataUrlToBytes(overlay.data.dataUrl);
          const pngImage = await pdfDoc.embedPng(pngBytes);

          page.drawImage(pngImage, {
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
          });
        }
      }

      const savedBytes = await pdfDoc.save();
      return savedBytes;
    } catch (err) {
      console.error('Export error:', err);
      App.showToast('Erreur : ' + err.message, 'error');
      return null;
    }
  }

  async function exportAndDownload(filename) {
    App.showToast('Export en cours...', 'info');
    const bytes = await exportPdf();
    if (bytes) {
      downloadPdf(bytes, filename || 'Signadji-export.pdf');
      App.showToast('PDF exporte avec succes !', 'success');
    }
  }

  async function exportAndSave(year, filename) {
    App.showToast('Export en cours...', 'info');
    const bytes = await exportPdf();
    if (!bytes) return;

    try {
      const url = '/api/save/' + encodeURIComponent(year) + '/' + encodeURIComponent(filename);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: bytes,
      });
      if (!res.ok) throw new Error('Erreur serveur');
      App.showToast('PDF enregistre dans le dossier ' + year + ' !', 'success');
    } catch (err) {
      console.error('Save error:', err);
      App.showToast('Erreur lors de l\'enregistrement : ' + err.message, 'error');
    }
  }

  // StandardFonts only support WinAnsi (latin-1). Strip unsupported chars.
  function sanitizeText(text, font) {
    let result = '';
    for (const char of text) {
      try {
        font.encodeText(char);
        result += char;
      } catch {
        // Replace unsupported character with '?'
        result += '?';
      }
    }
    return result;
  }

  function getFontKey(fontFamily, bold, italic) {
    const base = fontFamily || 'Helvetica';
    if (base === 'Times-Roman') {
      if (bold && italic) return 'Times-BoldItalic';
      if (bold) return 'Times-Bold';
      if (italic) return 'Times-Italic';
      return 'Times-Roman';
    }
    if (base === 'Courier') {
      if (bold && italic) return 'Courier-BoldOblique';
      if (bold) return 'Courier-Bold';
      if (italic) return 'Courier-Oblique';
      return 'Courier';
    }
    if (bold && italic) return 'Helvetica-BoldOblique';
    if (bold) return 'Helvetica-Bold';
    if (italic) return 'Helvetica-Oblique';
    return 'Helvetica';
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'Signadji-export.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { exportPdf, exportAndDownload, exportAndSave };
})();
