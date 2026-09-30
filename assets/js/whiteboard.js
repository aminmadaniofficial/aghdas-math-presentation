// Developed By Amin Madani
/**
 * Smart Whiteboard / Scratchpad Overlay
 * دبیرستان استعدادهای درخشان شهید باهنر ۳ کرج
 * 
 * Features:
 * - Transparent overlay over active presentation slide (direct annotation)
 * - Math grid paper (شطرنجی ریاضی) & Solid whiteboard modes
 * - Pen / Marker, Highlighter (فسفری), Eraser
 * - Pressure sensitivity for stylus/smartboard markers & mouse drawing
 * - Vector stroke history with Undo/Redo & Slide-aware persistence
 * - High-DPI / Retina responsive rendering
 * - Export notes to PNG
 * - Keyboard shortcuts (W, Esc, Ctrl+Z, Ctrl+Y, etc.)
 */

(function () {
  'use strict';

  // State
  let isOpen = false;
  let currentTool = 'pen'; // 'pen', 'highlighter', 'eraser'
  let currentColor = '#2563eb'; // Royal Blue default
  let currentSize = 4; // 2, 4, 8, 16
  let bgMode = 'transparent'; // 'transparent', 'grid', 'solid'

  // Per-slide stroke storage: { [slideIndex]: Array<Stroke> }
  const slideStrokes = {};
  // Undo/Redo stacks for current slide
  let currentHistory = [];
  let currentRedoStack = [];

  // Canvas & Context
  let canvas, ctx;
  let overlay, backdrop, dock;
  let isDrawing = false;
  let currentStroke = null;
  let dpr = window.devicePixelRatio || 1;

  // DOM Elements
  let toggleBtn, closeBtn, bgToggleBtn, downloadBtn, undoBtn, redoBtn, clearBtn;
  let toolBtns, colorDots, sizeBtns;

  function initWhiteboard() {
    overlay = document.getElementById('whiteboard-overlay');
    if (!overlay) return;

    backdrop = document.getElementById('whiteboard-backdrop');
    canvas = document.getElementById('whiteboard-canvas');
    dock = document.getElementById('whiteboard-dock');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Buttons
    toggleBtn = document.getElementById('whiteboard-toggle');
    closeBtn = document.getElementById('wb-close-btn');
    bgToggleBtn = document.getElementById('wb-bg-toggle');
    downloadBtn = document.getElementById('wb-download-btn');
    undoBtn = document.getElementById('wb-undo-btn');
    redoBtn = document.getElementById('wb-redo-btn');
    clearBtn = document.getElementById('wb-clear-btn');

    toolBtns = document.querySelectorAll('.wb-tool-btn');
    colorDots = document.querySelectorAll('.wb-color-dot');
    sizeBtns = document.querySelectorAll('.wb-size-btn');

    setupCanvasSize();
    window.addEventListener('resize', handleResize);

    // Pointer events on canvas (Works for Mouse, Pen/Stylus, Touch)
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    // Tool switching
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        setTool(tool);
      });
    });

    // Color switching
    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.getAttribute('data-color');
        setColor(color);
        if (currentTool === 'eraser') setTool('pen');
      });
    });

    // Size switching
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = parseInt(btn.getAttribute('data-size'), 10);
        setSize(size);
      });
    });

    // Action buttons
    if (toggleBtn) toggleBtn.addEventListener('click', toggleWhiteboard);
    if (closeBtn) closeBtn.addEventListener('click', closeWhiteboard);
    if (bgToggleBtn) bgToggleBtn.addEventListener('click', cycleBgMode);
    if (downloadBtn) downloadBtn.addEventListener('click', exportToPNG);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
    if (clearBtn) clearBtn.addEventListener('click', clearBoard);

    // Global keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);

    // Update Lucide icons if available
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  function setupCanvasSize() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.scale(dpr, dpr);
    redrawCurrentSlide();
  }

  function handleResize() {
    if (!isOpen) return;
    setupCanvasSize();
  }

  function getSlideKey() {
    return window.currentSlideIndex || 1;
  }

  function loadSlideStrokes() {
    const key = getSlideKey();
    if (!slideStrokes[key]) {
      slideStrokes[key] = [];
    }
    currentHistory = slideStrokes[key];
    currentRedoStack = [];
    updateUndoRedoUI();
  }

  function saveSlideStrokes() {
    const key = getSlideKey();
    slideStrokes[key] = currentHistory;
  }

  // Pointer event handlers
  function handlePointerDown(e) {
    if (!isOpen) return;
    // Prevent default touch gestures (scrolling/pinch)
    e.preventDefault();

    isDrawing = true;
    try {
      if (e.pointerId !== undefined) {
        canvas.setPointerCapture(e.pointerId);
      }
    } catch (_) {}

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

    currentStroke = {
      tool: currentTool,
      color: currentColor,
      size: currentSize,
      points: [{ x, y, p: pressure }]
    };

    // Draw initial point
    drawPoint(x, y, pressure);
  }

  function handlePointerMove(e) {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

    currentStroke.points.push({ x, y, p: pressure });
    drawLatestSegment(currentStroke);
  }

  function handlePointerUp(e) {
    if (!isDrawing || !currentStroke) return;
    isDrawing = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (currentStroke.points.length > 0) {
      currentHistory.push(currentStroke);
      currentRedoStack = [];
      saveSlideStrokes();
      updateUndoRedoUI();
    }
    currentStroke = null;
  }

  // Drawing routines
  function drawPoint(x, y, pressure) {
    ctx.save();
    applyStrokeStyle(currentTool, currentColor, currentSize, pressure);

    ctx.beginPath();
    const radius = Math.max(1, (getEffectiveSize(currentTool, currentSize, pressure) / 2));
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLatestSegment(stroke) {
    const pts = stroke.points;
    const len = pts.length;
    if (len < 2) return;

    ctx.save();
    const p1 = pts[len - 2];
    const p2 = pts[len - 1];
    const avgPressure = (p1.p + p2.p) / 2;

    applyStrokeStyle(stroke.tool, stroke.color, stroke.size, avgPressure);

    ctx.beginPath();
    if (len === 2) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    } else {
      const p0 = pts[len - 3];
      const mid1x = (p0.x + p1.x) / 2;
      const mid1y = (p0.y + p1.y) / 2;
      const mid2x = (p1.x + p2.x) / 2;
      const mid2y = (p1.y + p2.y) / 2;

      ctx.moveTo(mid1x, mid1y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawFullStroke(stroke) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;

    if (pts.length === 1) {
      drawPoint(pts[0].x, pts[0].y, pts[0].p);
      return;
    }

    ctx.save();
    applyStrokeStyle(stroke.tool, stroke.color, stroke.size, pts[0].p);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }

    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
    ctx.restore();
  }

  function getEffectiveSize(tool, baseSize, pressure) {
    const presFactor = pressure ? (0.6 + pressure * 0.8) : 1;
    if (tool === 'eraser') {
      return baseSize * 5 * presFactor;
    } else if (tool === 'highlighter') {
      return baseSize * 3 * presFactor;
    }
    return baseSize * presFactor;
  }

  function applyStrokeStyle(tool, color, size, pressure) {
    const effectiveWidth = getEffectiveSize(tool, size, pressure);
    ctx.lineWidth = effectiveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = hexToRgba(color, 0.35);
      ctx.strokeStyle = hexToRgba(color, 0.35);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
    }
  }

  function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function redrawCurrentSlide() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    currentHistory.forEach(stroke => {
      drawFullStroke(stroke);
    });
  }

  // Tool / State Setters
  function setTool(tool) {
    currentTool = tool;
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
    });

    if (canvas) {
      canvas.className = 'whiteboard-canvas tool-' + tool;
    }
  }

  function setColor(color) {
    currentColor = color;
    colorDots.forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-color') === color);
    });
  }

  function setSize(size) {
    currentSize = size;
    sizeBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-size'), 10) === size);
    });
  }

  function cycleBgMode() {
    const modes = ['transparent', 'grid', 'solid'];
    const names = {
      'transparent': 'زمینه: روی اسلاید',
      'grid': 'زمینه: شطرنجی ریاضی',
      'solid': 'زمینه: تخته سفید'
    };

    const nextIndex = (modes.indexOf(bgMode) + 1) % modes.length;
    bgMode = modes[nextIndex];

    if (backdrop) {
      backdrop.className = 'whiteboard-backdrop mode-' + bgMode;
    }

    const nameEl = document.getElementById('wb-bg-name');
    if (nameEl) nameEl.textContent = names[bgMode];
  }

  function undo() {
    if (currentHistory.length === 0) return;
    const stroke = currentHistory.pop();
    currentRedoStack.push(stroke);
    saveSlideStrokes();
    redrawCurrentSlide();
    updateUndoRedoUI();
  }

  function redo() {
    if (currentRedoStack.length === 0) return;
    const stroke = currentRedoStack.pop();
    currentHistory.push(stroke);
    saveSlideStrokes();
    redrawCurrentSlide();
    updateUndoRedoUI();
  }

  function clearBoard() {
    if (currentHistory.length === 0) return;
    currentHistory = [];
    currentRedoStack = [];
    saveSlideStrokes();
    redrawCurrentSlide();
    updateUndoRedoUI();
  }

  function updateUndoRedoUI() {
    if (undoBtn) undoBtn.disabled = currentHistory.length === 0;
    if (redoBtn) redoBtn.disabled = currentRedoStack.length === 0;
  }

  function exportToPNG() {
    if (!canvas) return;

    // Create a temporary canvas with full resolution
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const eCtx = exportCanvas.getContext('2d');

    // Fill background if grid or solid
    if (bgMode === 'solid') {
      eCtx.fillStyle = '#ffffff';
      eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else if (bgMode === 'grid') {
      eCtx.fillStyle = '#f8fafc';
      eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Draw mathematical grid
      eCtx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
      eCtx.lineWidth = 1;
      const step = 28 * dpr;
      for (let x = 0; x < exportCanvas.width; x += step) {
        eCtx.beginPath();
        eCtx.moveTo(x, 0);
        eCtx.lineTo(x, exportCanvas.height);
        eCtx.stroke();
      }
      for (let y = 0; y < exportCanvas.height; y += step) {
        eCtx.beginPath();
        eCtx.moveTo(0, y);
        eCtx.lineTo(exportCanvas.width, y);
        eCtx.stroke();
      }
    }

    // Draw strokes
    eCtx.drawImage(canvas, 0, 0);

    // Download file
    const slideNum = getSlideKey();
    const link = document.createElement('a');
    link.download = `yaddasht-aghdas-slide-${slideNum}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openWhiteboard() {
    isOpen = true;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    if (toggleBtn) toggleBtn.classList.add('active');

    // Update status bar with current slide info
    const titleEl = document.getElementById('wb-status-title');
    if (titleEl) {
      titleEl.textContent = `تخته یادداشت و رسم — اسلاید ${getSlideKey()}`;
    }

    loadSlideStrokes();
    setupCanvasSize();
    redrawCurrentSlide();
  }

  function closeWhiteboard() {
    isOpen = false;
    overlay.classList.remove('active');
    setTimeout(() => {
      if (!isOpen) overlay.style.display = 'none';
    }, 200);

    if (toggleBtn) toggleBtn.classList.remove('active');
  }

  function toggleWhiteboard() {
    if (isOpen) {
      closeWhiteboard();
    } else {
      openWhiteboard();
    }
  }

  function handleKeyDown(e) {
    // If typing in an input field, do not intercept
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Toggle on 'W' or 'w' or Persian 'ص'
    if (e.key === 'w' || e.key === 'W' || e.key === 'ص') {
      e.preventDefault();
      toggleWhiteboard();
      return;
    }

    // When whiteboard is open:
    if (isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWhiteboard();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'ح') {
        setTool('pen');
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ث') {
        setTool('eraser');
      } else if (e.key === 'h' || e.key === 'H' || e.key === 'ا') {
        setTool('highlighter');
      } else if (e.key === 'g' || e.key === 'G' || e.key === 'ل') {
        cycleBgMode();
      }
    }
  }

  // Expose on window for other scripts/modules if needed
  window.AghdasWhiteboard = {
    open: openWhiteboard,
    close: closeWhiteboard,
    toggle: toggleWhiteboard,
    isOpen: () => isOpen,
    onSlideChange: () => {
      if (isOpen) {
        saveSlideStrokes();
        loadSlideStrokes();
        redrawCurrentSlide();
        const titleEl = document.getElementById('wb-status-title');
        if (titleEl) {
          titleEl.textContent = `تخته یادداشت و رسم — اسلاید ${getSlideKey()}`;
        }
      }
    }
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhiteboard);
  } else {
    initWhiteboard();
  }
})();
