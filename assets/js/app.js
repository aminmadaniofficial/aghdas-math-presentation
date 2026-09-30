// Developed By Amin Madani
/**
 * Presentation Controller for Aghdas Deck
 * Engineered with Vercel Geist & Shadcn UI Design Principles
 * Handles Keynote/PowerPoint slide transitions, progressive fragment reveals,
 * offline KaTeX typesetting, Lucide SVG icons, projector contrast mode, and 3D visualizers.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const slides = document.querySelectorAll('.geist-slide, .slide-item');
  const totalSlides = slides.length || 10;
  let currentSlideIndex = 1;

  // 3D Visualizer instances
  let visPelleh = null;
  let visSingle = null;
  let visFour = null;
  let visSimplex = null;
  let visThankYou = null;

  const slideCounter = document.getElementById('slide-counter-text');
  const progressIndicator = document.getElementById('progress-indicator');
  const prevBtn = document.getElementById('prev-slide-btn');
  const nextBtn = document.getElementById('next-slide-btn');
  const fullscreenBtn = document.getElementById('fullscreen-toggle');
  const projectorBtn = document.getElementById('projector-toggle');
  const helpBtn = document.getElementById('help-toggle');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-btn');
  const dotsContainer = document.getElementById('dots-container');

  // Convert English digits to Persian
  function toPersianDigits(num) {
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, w => persian[+w]);
  }

  // Convert Persian digits to English
  function toEnglishDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632));
  }

  // Initialize Lucide Icons
  function refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  // Parse any text nodes containing $...$ or $$...$$
  function parseInlineMathTextNodes(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes('$')) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'input' || 
            parent.closest('.math-tex') || parent.closest('.viewport-cad-container')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodesToReplace = [];
    while (walker.nextNode()) {
      nodesToReplace.push(walker.currentNode);
    }

    nodesToReplace.forEach(textNode => {
      const text = textNode.nodeValue;
      if (!text.includes('$')) return;

      const span = document.createElement('span');
      span.innerHTML = text
        .replace(/\$\$(.+?)\$\$/g, '<span class="math-tex math-block" dir="ltr" data-tex="$1"></span>')
        .replace(/\$(.+?)\$/g, '<span class="math-tex" dir="ltr" data-tex="$1"></span>');

      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
  }

  // Render KaTeX across the DOM
  function renderAllMath() {
    if (typeof katex === 'undefined') return;

    parseInlineMathTextNodes(document.querySelector('.geist-stage, .slides-stage'));

    document.querySelectorAll('.math-tex').forEach(el => {
      try {
        const tex = el.getAttribute('data-tex') || el.textContent;
        el.setAttribute('dir', 'ltr');
        el.style.direction = 'ltr';
        el.style.unicodeBidi = 'isolate';
        katex.render(tex, el, {
          throwOnError: false,
          displayMode: el.classList.contains('math-block') || el.classList.contains('code-math-box')
        });
      } catch (err) {
        console.warn('KaTeX render error:', err);
      }
    });
  }

  // Build pagination dots
  function initPagination() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    for (let i = 1; i <= totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = `nav-dot-point deck-dot-node ${i === 1 ? 'active' : ''}`;
      dot.title = `اسلاید ${toPersianDigits(i)}`;
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  // Switch to slide
  function goToSlide(targetIndex, revealAllFragments = false) {
    if (targetIndex < 1 || targetIndex > totalSlides) return;

    const isForward = targetIndex >= currentSlideIndex;
    slides.forEach((s, idx) => {
      const slideNum = idx + 1;
      s.classList.remove('active', 'slide-forward', 'slide-backward', 'prev-slide');
      if (slideNum === targetIndex) {
        s.classList.add('active', isForward ? 'slide-forward' : 'slide-backward');
      } else if (slideNum < targetIndex) {
        s.classList.add('prev-slide');
      }
    });

    currentSlideIndex = targetIndex;
    window.currentSlideIndex = currentSlideIndex;

    // Handle fragments & morph accordion cards on active slide
    const activeSlide = slides[currentSlideIndex - 1];
    if (activeSlide) {
      // Morph Accordion Cards (Slide 4)
      const morphCards = activeSlide.querySelectorAll('.morph-accordion-card');
      if (morphCards.length > 0) {
        morphCards.forEach((c, idx) => {
          if (revealAllFragments || idx === 0) {
            c.classList.remove('is-collapsed');
            c.classList.add('is-expanded');
          } else {
            c.classList.remove('is-expanded');
            c.classList.add('is-collapsed');
          }
        });
      }

      // Standard & Accordion Fragments
      const fragments = activeSlide.querySelectorAll('.fragment');
      fragments.forEach(f => {
        f.classList.toggle('revealed', revealAllFragments);
      });
    }

    // Update Header and Footer metadata
    if (slideCounter) {
      slideCounter.textContent = `اسلاید ${toPersianDigits(currentSlideIndex)} از ${toPersianDigits(totalSlides)}`;
    }
    if (progressIndicator) {
      progressIndicator.style.width = `${(currentSlideIndex / totalSlides) * 100}%`;
    }

    if (prevBtn) prevBtn.disabled = currentSlideIndex === 1;
    if (nextBtn) {
      nextBtn.disabled = currentSlideIndex === totalSlides;
      const textSpan = nextBtn.querySelector('span:first-child') || nextBtn.querySelector('span');
      if (textSpan) {
        textSpan.textContent = currentSlideIndex === totalSlides ? 'پایان ارائه' : 'اسلاید بعد';
      }
    }

    // Update Dots
    document.querySelectorAll('.nav-dot-point, .deck-dot-node').forEach((dot, idx) => {
      dot.classList.toggle('active', idx + 1 === currentSlideIndex);
    });

    // Update URL hash
    if (window.location.hash !== `#${currentSlideIndex}`) {
      history.replaceState(null, null, `#${currentSlideIndex}`);
    }

    // Refresh Math & Icons
    renderAllMath();
    refreshIcons();

    // 3D Scene Activation
    handle3DActivation(currentSlideIndex);

    // Notify Whiteboard if active
    if (window.AghdasWhiteboard && window.AghdasWhiteboard.onSlideChange) {
      window.AghdasWhiteboard.onSlideChange();
    }
  }

  // Helper to expand a morph accordion card (Slide 4)
  function expandMorphCard(card) {
    if (!card) return;
    card.classList.remove('is-collapsed');
    card.classList.add('is-expanded');
    renderAllMath();
    refreshIcons();
  }

  // Helper to collapse a morph accordion card (Slide 4)
  function collapseMorphCard(card) {
    if (!card) return;
    card.classList.remove('is-expanded');
    card.classList.add('is-collapsed');
    renderAllMath();
    refreshIcons();
  }

  // Keynote Next Step: Either reveals next fragment, expands morph card, or advances slide
  function advancePresentation() {
    const activeSlide = slides[currentSlideIndex - 1];
    if (!activeSlide) return;

    // 1. Check for unexpanded morph accordion cards (Slide 4)
    const collapsedCard = activeSlide.querySelector('.morph-accordion-card.is-collapsed');
    if (collapsedCard) {
      expandMorphCard(collapsedCard);
      return;
    }

    // 2. Check for unrevealed fragments
    const unrevealedFragment = activeSlide.querySelector('.fragment:not(.revealed)');
    if (unrevealedFragment) {
      unrevealedFragment.classList.add('revealed');
      renderAllMath();
      refreshIcons();
    } else {
      if (currentSlideIndex < totalSlides) {
        goToSlide(currentSlideIndex + 1, false);
      }
    }
  }

  // Keynote Prev Step: Either hides last revealed fragment, collapses morph card, or goes to previous slide
  function reversePresentation() {
    const activeSlide = slides[currentSlideIndex - 1];
    if (!activeSlide) return;

    // 1. Check for revealed fragments
    const revealedFragments = activeSlide.querySelectorAll('.fragment.revealed');
    if (revealedFragments.length > 0) {
      const lastRevealed = revealedFragments[revealedFragments.length - 1];
      lastRevealed.classList.remove('revealed');
      return;
    }

    // 2. Check for expanded morph cards beyond the first card (Slide 4)
    const expandedMorphCards = activeSlide.querySelectorAll('.morph-accordion-card.is-expanded');
    if (expandedMorphCards.length > 1) {
      const lastExpanded = expandedMorphCards[expandedMorphCards.length - 1];
      collapseMorphCard(lastExpanded);
      return;
    }

    // 3. Go to previous slide (show all fragments when going backwards)
    if (currentSlideIndex > 1) {
      goToSlide(currentSlideIndex - 1, true);
    }
  }

  // Manage 3D Visualizer scenes on Slide 2, 5, 6, and 8
  function handle3DActivation(slideNum) {
    if (slideNum === 2) {
      if (!visPelleh && typeof ChandPellehVisualizer !== 'undefined') {
        setTimeout(() => {
          visPelleh = new ChandPellehVisualizer('canvas-target-pelleh');
          initSlide2Controls();
        }, 120);
      } else if (visPelleh) {
        visPelleh.onWindowResize();
      }
    } else if (slideNum === 5) {
      if (!visSingle && typeof Aghdas3DVisualizer !== 'undefined') {
        setTimeout(() => {
          visSingle = new Aghdas3DVisualizer('canvas-target-single', 'single');
          initSlide4Controls();
        }, 120);
      } else if (visSingle) {
        visSingle.onWindowResize();
      }
    } else if (slideNum === 6) {
      if (!visFour && typeof Aghdas3DVisualizer !== 'undefined') {
        setTimeout(() => {
          visFour = new Aghdas3DVisualizer('canvas-target-four', 'four-copies');
          initSlide5Controls();
        }, 120);
      } else if (visFour) {
        visFour.onWindowResize();
      }
    } else if (slideNum === 8) {
      if (!visSimplex && typeof SimplexVisualizer !== 'undefined') {
        setTimeout(() => {
          visSimplex = new SimplexVisualizer('canvas-target-simplex');
          initSlide8SimplexControls();
        }, 120);
      } else if (visSimplex) {
        visSimplex.onWindowResize();
      }
    }
  }

  // Slide 2 Controls: Chand-Pelleh Interactive Step Controller & Visualizer
  let slide2Initialized = false;
  function initSlide2Controls() {
    if (slide2Initialized) {
      if (visPelleh && window.s2CurrentStep) visPelleh.setStep(window.s2CurrentStep);
      return;
    }
    slide2Initialized = true;

    let currentStep = 1;
    const totalSteps = 6;
    const prevBtn = document.getElementById('s2-prev-step-btn');
    const nextBtn = document.getElementById('s2-next-step-btn');
    const titleBadge = document.getElementById('s2-step-title-badge');
    const pillTabs = document.querySelectorAll('#s2-step-tabs .step-pill-tab');
    const cadChips = document.querySelectorAll('#s2-cad-btn-group .cad-mode-chip');
    const panes = document.querySelectorAll('#slide-2 .step-content-pane');
    const rotateBtn = document.getElementById('s2-rotate-btn');
    const resetBtn = document.getElementById('s2-reset-btn');

    const stepTitles = {
      1: 'گام ۱ از ۶: ۱-پله‌ای (۱ مکعب)',
      2: 'گام ۲ از ۶: ۲-پله‌ای (۴ مکعب)',
      3: 'گام ۳ از ۶: ۳-پله‌ای (۱۰ مکعب)',
      4: 'گام ۴ از ۶: ۴-پله‌ای (۲۰ مکعب)',
      5: 'گام ۵ از ۶: تفکیک طبقات (اعداد مثلثی)',
      6: 'گام ۶ از ۶: فرمول کل سازه و پیوند به اقدس'
    };

    function setStep(step) {
      if (step < 1) step = 1;
      if (step > totalSteps) step = totalSteps;
      currentStep = step;
      window.s2CurrentStep = currentStep;

      // Update badge
      if (titleBadge && stepTitles[step]) {
        titleBadge.textContent = stepTitles[step];
      }

      // Update Prev / Next buttons
      if (prevBtn) prevBtn.disabled = (currentStep === 1);
      if (nextBtn) nextBtn.disabled = (currentStep === totalSteps);

      // Update Pill Tabs
      pillTabs.forEach(tab => {
        const s = parseInt(tab.getAttribute('data-step'), 10);
        tab.classList.toggle('active', s === currentStep);
      });

      // Update CAD mode chips
      cadChips.forEach(chip => {
        const s = parseInt(chip.getAttribute('data-step'), 10);
        chip.classList.toggle('active', s === currentStep);
      });

      // Switch Panes
      panes.forEach(pane => {
        pane.classList.remove('active');
      });
      const activePane = document.getElementById(`s2-pane-${currentStep}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      // Update 3D visualizer
      if (visPelleh) {
        visPelleh.setStep(currentStep);
      }

      // Re-trigger KaTeX rendering for any newly visible math formulas
      renderAllMath();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => setStep(currentStep - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => setStep(currentStep + 1));
    }

    pillTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const s = parseInt(tab.getAttribute('data-step'), 10);
        if (s) setStep(s);
      });
    });

    cadChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const s = parseInt(chip.getAttribute('data-step'), 10);
        if (s) setStep(s);
      });
    });

    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        if (visPelleh) {
          const rotating = visPelleh.toggleAutoRotate();
          rotateBtn.classList.toggle('active', rotating);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (visPelleh) visPelleh.resetCamera();
      });
    }

    // Expose jump function
    window.setS2Step = setStep;

    // Initialize at step from URL or default to 1
    const initialS2Step = parseInt(new URLSearchParams(window.location.search).get('s2step'), 10) || 1;
    setStep(initialS2Step);
  }

  // Slide 4 Controls
  function initSlide4Controls() {
    const explodeSlider = document.getElementById('s4-explode-slider');
    const explodeBtn = document.getElementById('s4-explode-btn');
    const rotateBtn = document.getElementById('s4-rotate-btn');
    const resetBtn = document.getElementById('s4-reset-btn');

    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        if (visSingle) visSingle.setLayerExplode(parseFloat(e.target.value));
      });
    }

    if (explodeBtn) {
      let isExploded = false;
      explodeBtn.addEventListener('click', () => {
        isExploded = !isExploded;
        const targetVal = isExploded ? 1.0 : 0.0;
        if (explodeSlider) explodeSlider.value = targetVal;
        if (visSingle) visSingle.setLayerExplode(targetVal);
        const span = explodeBtn.querySelector('span');
        if (span) span.textContent = isExploded ? 'ادغام لایه‌ها' : 'تفکیک لایه‌ها';
      });
    }

    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        if (visSingle) {
          const rotating = visSingle.toggleAutoRotate();
          rotateBtn.classList.toggle('active', rotating);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (visSingle) visSingle.resetCamera();
      });
    }
  }

  // Slide 5 Controls
  function initSlide5Controls() {
    const mergeSlider = document.getElementById('s5-merge-slider');
    const mergeBtn = document.getElementById('s5-merge-btn');
    const rotateBtn = document.getElementById('s5-rotate-btn');
    const resetBtn = document.getElementById('s5-reset-btn');
    const banner = document.getElementById('s5-status-banner');
    let s5Celebrated = false;

    function applyMerge(val) {
      if (visFour) visFour.setAssembleProgress(val);
      if (mergeSlider) mergeSlider.value = val;

      if (val >= 0.94) {
        if (!s5Celebrated) {
          triggerSparklesCelebration();
          s5Celebrated = true;
        }
        if (banner) {
          banner.innerHTML = `
            <div style="font-weight: 700; color: #047857; display: flex; align-items: center; justify-content: center; gap: 0.6rem;">
              <span>در تمام ۱۰ مکعب، جمع هر ۴ کپی برابر ۶ شد:</span>
              <span class="math-tex" data-tex="4 \\times S = 6 \\times 10 = 60 \\implies S = 15"></span>
            </div>
          `;
          renderAllMath();
        }
        if (mergeBtn) {
          const span = mergeBtn.querySelector('span');
          if (span) span.textContent = 'تفکیک ۴ کپی';
        }
      } else {
        if (val < 0.3) {
          s5Celebrated = false;
        }
        if (banner) {
          banner.innerHTML = `
            <div style="font-weight: 600; color: var(--foreground);">
              ۴ هرم با ۴ رنگ مجزا در فضا — اسلایدر را حرکت دهید تا ادغام فضایی را ببینید
            </div>
          `;
        }
        if (mergeBtn) {
          const span = mergeBtn.querySelector('span');
          if (span) span.textContent = 'ادغام ۴ کپی';
        }
      }
    }

    if (mergeSlider) {
      mergeSlider.addEventListener('input', (e) => applyMerge(parseFloat(e.target.value)));
    }

    if (mergeBtn) {
      let isMerged = false;
      mergeBtn.addEventListener('click', () => {
        isMerged = !isMerged;
        applyMerge(isMerged ? 1.0 : 0.0);
      });
    }

    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        if (visFour) {
          const rotating = visFour.toggleAutoRotate();
          rotateBtn.classList.toggle('active', rotating);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (visFour) visFour.resetCamera();
      });
    }
  }

  // Slide 8 Controls: Simplex Step-by-Step Controller (0D to 4D)
  let slide8Initialized = false;
  function initSlide8SimplexControls() {
    if (slide8Initialized) {
      if (visSimplex && window.s8CurrentDim) visSimplex.setDimension(window.s8CurrentDim);
      return;
    }
    slide8Initialized = true;

    const dimOrder = ['all', '0', '1', '2', '3', '4'];
    let currentIndex = 0; // default 'all'

    const prevBtn = document.getElementById('s8-prev-dim-btn');
    const nextBtn = document.getElementById('s8-next-dim-btn');
    const titleBadge = document.getElementById('s8-dim-title-badge');
    const pillTabs = document.querySelectorAll('#s8-dim-tabs .step-pill-tab');
    const cadChips = document.querySelectorAll('#s8-cad-btn-group .cad-mode-chip');
    const panes = document.querySelectorAll('#slide-8 .step-content-pane');
    const rotateBtn = document.getElementById('s8-rotate-btn');
    const resetBtn = document.getElementById('s8-reset-btn');
    const titleSpan = document.getElementById('s8-cad-title');

    const dimTitles = {
      'all': 'نمای کامل خانواده سیمپلکس‌ها (0D تا 3D در استودیو)',
      '0': 'بُعد ۰: نقطه تکین (۰-سیمپلکس، ۱ رأس)',
      '1': 'بُعد ۱: پاره‌خط راست (۱-سیمپلکس، ۲ رأس)',
      '2': 'بُعد ۲: مثلث متساوی‌الاضلاع (۲-سیمپلکس، ۳ رأس)',
      '3': 'بُعد ۳: چهاروجهی منتظم (۳-سیمپلکس، ۴ رأس)',
      '4': 'بُعد ۴: پنج‌خانه منتظم (۴-سیمپلکس، ۵ رأس و چرخش ۴D)'
    };

    function setDimension(dimKey) {
      const idx = dimOrder.indexOf(String(dimKey));
      if (idx !== -1) {
        currentIndex = idx;
      }
      const dim = dimOrder[currentIndex];
      window.s8CurrentDim = dim;

      // Update badge
      if (titleBadge && dimTitles[dim]) {
        titleBadge.textContent = dimTitles[dim];
      }
      if (titleSpan && dimTitles[dim]) {
        titleSpan.textContent = dimTitles[dim];
      }

      // Update Prev / Next buttons
      if (prevBtn) prevBtn.disabled = (currentIndex === 0);
      if (nextBtn) nextBtn.disabled = (currentIndex === dimOrder.length - 1);

      // Update Pill Tabs
      pillTabs.forEach(tab => {
        const d = tab.getAttribute('data-dim');
        tab.classList.toggle('active', d === dim);
      });

      // Update CAD chips
      cadChips.forEach(chip => {
        const d = chip.getAttribute('data-dim');
        chip.classList.toggle('active', d === dim);
      });

      // Switch Panes
      panes.forEach(pane => {
        pane.classList.remove('active');
      });
      const activePane = document.getElementById(`s8-pane-${dim}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      // Update 3D visualizer
      if (visSimplex) {
        visSimplex.setDimension(dim);
      }

      // Re-trigger KaTeX rendering for any newly visible math formulas
      renderAllMath();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) setDimension(dimOrder[currentIndex - 1]);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < dimOrder.length - 1) setDimension(dimOrder[currentIndex + 1]);
      });
    }

    pillTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const d = tab.getAttribute('data-dim');
        if (d) setDimension(d);
      });
    });

    cadChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const d = chip.getAttribute('data-dim');
        if (d) setDimension(d);
      });
    });

    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        if (visSimplex) {
          const rotating = visSimplex.toggleAutoRotate();
          rotateBtn.classList.toggle('active', rotating);
          const span = rotateBtn.querySelector('span');
          const icon = rotateBtn.querySelector('i');
          if (span) span.textContent = rotating ? 'توقف' : 'چرخش';
          if (icon) {
            icon.setAttribute('data-lucide', rotating ? 'pause' : 'play');
            if (window.lucide) window.lucide.createIcons();
          }
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (visSimplex) visSimplex.resetCamera();
      });
    }

    // Expose jump function
    window.setS8Dim = setDimension;

    // Initialize at urlParam or 'all'
    const s8Param = new URLSearchParams(window.location.search).get('s8dim');
    if (s8Param) {
      setDimension(s8Param);
    } else {
      setDimension('all');
    }
  }

  // Projector Responsive Scale Engine: cycles 90%, 82%, 100%
  function initProjectorScaleEngine() {
    const scaleToggle = document.getElementById('scale-toggle');
    const scaleText = document.getElementById('scale-indicator-text');
    const scales = [
      { label: '۹۰٪', scale: 0.90, fontScale: 0.94 },
      { label: '۸۲٪', scale: 0.82, fontScale: 0.88 },
      { label: '۱۰۰٪', scale: 1.0, fontScale: 1.0 }
    ];
    let currentScaleIdx = 0; // Starts at 90% (fits standard projectors with zero manual zoom)

    function applyScale(idx) {
      currentScaleIdx = idx % scales.length;
      const s = scales[currentScaleIdx];
      document.documentElement.style.setProperty('--deck-scale', s.scale);
      document.documentElement.style.setProperty('--deck-font-scale', s.fontScale);
      if (scaleText) scaleText.textContent = s.label;

      setTimeout(() => {
        [visPelleh, visSingle, visFour, visSimplex].forEach(v => {
          if (v && v.onWindowResize) v.onWindowResize();
        });
      }, 50);
    }

    if (scaleToggle) {
      scaleToggle.addEventListener('click', () => {
        applyScale(currentScaleIdx + 1);
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) || (e.altKey && e.key === 'z')) {
        e.preventDefault();
        applyScale(currentScaleIdx + 1);
      }
    });

    applyScale(0);
  }

  // Compute human-style clean integer factorization and cancellations of 24 for any n
  function computeSimplification(n) {
    const nums = [n, n + 1, n + 2, n + 3];

    // 1. Direct multiple of 24
    for (let i = 0; i < 4; i++) {
      if (nums[i] % 24 === 0) {
        const res = [...nums];
        res[i] = nums[i] / 24;
        return {
          denomFactors: [24],
          cancelled: [{ index: i, original: nums[i], divisor: 24, quotient: res[i] }],
          remaining: res,
          finalVal: res.reduce((a, b) => a * b, 1)
        };
      }
    }

    // 2. Pairs multiplying to 24: (6, 4), (4, 6), (8, 3), (3, 8), (12, 2), (2, 12)
    const pairs = [[6, 4], [4, 6], [8, 3], [3, 8], [12, 2], [2, 12]];
    for (const [d1, d2] of pairs) {
      for (let i = 0; i < 4; i++) {
        if (nums[i] % d1 === 0) {
          for (let j = 0; j < 4; j++) {
            if (j !== i && nums[j] % d2 === 0) {
              const res = [...nums];
              res[i] = nums[i] / d1;
              res[j] = nums[j] / d2;
              return {
                denomFactors: [d1, d2],
                cancelled: [
                  { index: i, original: nums[i], divisor: d1, quotient: res[i] },
                  { index: j, original: nums[j], divisor: d2, quotient: res[j] }
                ],
                remaining: res,
                finalVal: res.reduce((a, b) => a * b, 1)
              };
            }
          }
        }
      }
    }

    // 3. Triplets multiplying to 24: (4, 3, 2)
    const triplets = [[4, 3, 2], [3, 4, 2], [2, 4, 3], [2, 3, 4], [6, 2, 2]];
    for (const [d1, d2, d3] of triplets) {
      for (let i = 0; i < 4; i++) {
        if (nums[i] % d1 === 0) {
          for (let j = 0; j < 4; j++) {
            if (j !== i && nums[j] % d2 === 0) {
              for (let k = 0; k < 4; k++) {
                if (k !== i && k !== j && nums[k] % d3 === 0) {
                  const res = [...nums];
                  res[i] = nums[i] / d1;
                  res[j] = nums[j] / d2;
                  res[k] = nums[k] / d3;
                  return {
                    denomFactors: [d1, d2, d3],
                    cancelled: [
                      { index: i, original: nums[i], divisor: d1, quotient: res[i] },
                      { index: j, original: nums[j], divisor: d2, quotient: res[j] },
                      { index: k, original: nums[k], divisor: d3, quotient: res[k] }
                    ],
                    remaining: res,
                    finalVal: res.reduce((a, b) => a * b, 1)
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  // Slide 6 Live Interactive Solver & Step-by-Step Derivation
  function initSlide6Calculator() {
    const input = document.getElementById('calc-input-n');
    const btn = document.getElementById('calc-trigger-btn');
    const resultContainer = document.getElementById('calc-output-container');
    const stepContainer = document.getElementById('s6-step-container');
    const nTag = document.getElementById('s6-n-tag');

    function getParsedN() {
      if (!input) return 41;
      const raw = toEnglishDigits(input.value).replace(/[^0-9]/g, '');
      const val = parseInt(raw, 10);
      return isNaN(val) ? 41 : val;
    }

    function renderStepByStepSimplification(n, pSum) {
      if (!stepContainer) return;

      const nums = [n, n + 1, n + 2, n + 3];
      const pN = toPersianDigits(n);
      if (nTag) nTag.textContent = `${pN} = n`;

      const simp = computeSimplification(n);
      if (!simp) return;

      // Build visual strike-through numerator HTML
      const cancelMap = {};
      simp.cancelled.forEach(c => {
        cancelMap[c.index] = c;
      });

      let numHTML = '';
      nums.forEach((num, idx) => {
        if (cancelMap[idx]) {
          const c = cancelMap[idx];
          numHTML += `
            <span class="cancel-factor">
              <span class="cancel-new font-yas">${toPersianDigits(c.quotient)}</span>
              <span class="cancel-old font-yas">${toPersianDigits(num)}</span>
            </span>
          `;
        } else {
          numHTML += `<span class="plain-factor font-yas">${toPersianDigits(num)}</span>`;
        }
        if (idx < 3) numHTML += `<span class="vf-op">&times;</span>`;
      });

      let denHTML = '';
      simp.denomFactors.forEach((d, idx) => {
        denHTML += `
          <span class="cancel-factor">
            <span class="cancel-new font-yas">۱</span>
            <span class="cancel-old font-yas">${toPersianDigits(d)}</span>
          </span>
        `;
        if (idx < simp.denomFactors.length - 1) denHTML += `<span class="vf-op">&times;</span>`;
      });

      // Verbal explanation of cancellation
      const cancelExplanations = simp.cancelled.map(c => {
        return `
          <div style="display: flex; align-items: baseline; gap: 0.45rem; margin-bottom: 0.25rem;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #d97706; flex-shrink: 0; margin-top: 4px;"></span>
            <span>عدد <strong>${toPersianDigits(c.original)}</strong> با <strong>${toPersianDigits(c.divisor)}</strong> ساده شده و حاصل <strong style="color: #047857; font-size: 1.05rem;" class="font-yas">${toPersianDigits(c.quotient)}</strong> می‌شود:
              <span style="font-family: 'Yas', sans-serif; direction: ltr; display: inline-block; font-weight: 700; color: #78350f;">(${toPersianDigits(c.original)} &divide; ${toPersianDigits(c.divisor)} = ${toPersianDigits(c.quotient)})</span>
            </span>
          </div>
        `;
      }).join('');

      // Multiplication breakdown
      const r = simp.remaining;
      const p1 = r[0] * r[1];
      const p2 = r[2] * r[3];

      stepContainer.innerHTML = `
        <div class="code-math-box highlight-amber" style="margin-top: 0.5rem; text-align: right; direction: rtl !important;">
          <div style="font-weight: 800; font-size: 0.95rem; color: #78350f; margin-bottom: 0.35rem;">
            مراحل محاسبه برای ${pN} جمله (${pN} = n):
          </div>

          <div class="simplification-step-row">
            <span class="step-badge-mini">گام ۱</span>
            <span>جایگذاری در کسر:</span>
          </div>
          <div class="math-tex math-block" data-tex="S_{${n}} = \\frac{${n} \\times ${n+1} \\times ${n+2} \\times ${n+3}}{24}"></div>

          <div class="simplification-step-row">
            <span class="step-badge-mini">گام ۲</span>
            <span>ساده‌سازی و خط‌زدن هوشمند کسر (تفکیک ۲۴ به ${simp.denomFactors.map(toPersianDigits).join(' &times; ')}):</span>
          </div>

          <div class="visual-fraction-box">
            <span class="vf-equals">S<sub>${pN}</sub> =</span>
            <div class="visual-fraction">
              <div class="vf-numerator">${numHTML}</div>
              <div class="vf-bar"></div>
              <div class="vf-denominator">${denHTML}</div>
            </div>
          </div>

          <div style="font-size: 0.85rem; line-height: 1.7; color: #78350f; background: rgba(254, 243, 199, 0.6); padding: 0.45rem 0.75rem; border-radius: 6px; border: 1px solid #fde68a; margin: 0.4rem 0;">
            ${cancelExplanations}
          </div>

          <div class="simplification-step-row">
            <span class="step-badge-mini">گام ۳</span>
            <span>حذف کامل مخرج و ضرب مستقیم اعداد ساده‌شده:</span>
          </div>
          <div class="math-tex math-block" data-tex="S_{${n}} = (${r[0]} \\times ${r[1]}) \\times (${r[2]} \\times ${r[3]}) = ${p1} \\times ${p2} = \\mathbf{${pSum}}"></div>
        </div>
      `;
    }

    if (input) {
      input.value = toPersianDigits(41);

      input.addEventListener('input', () => {
        const raw = toEnglishDigits(input.value).replace(/[^0-9]/g, '');
        if (raw) {
          const num = Math.min(250, parseInt(raw, 10));
          input.value = toPersianDigits(num);
        } else {
          input.value = '';
        }
      });
    }

    let lastTermN = 12341;
    let lastSumN = 135751;

    function runSolve(n, isUserAction = false) {
      if (isNaN(n) || n < 1 || n > 250) {
        alert('لطفاً یک عدد معتبر بین ۱ تا ۲۵۰ وارد کنید.');
        return;
      }

      const termN = (n * (n + 1) * (n + 2)) / 6;
      const sumN = (n * (n + 1) * (n + 2) * (n + 3)) / 24;

      const prevTerm = lastTermN;
      const prevSum = lastSumN;
      lastTermN = termN;
      lastSumN = sumN;

      const pN = toPersianDigits(n);
      const pTerm = toPersianDigits(termN.toLocaleString());
      const pSum = toPersianDigits(sumN.toLocaleString());

      resultContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="background: var(--secondary); border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 0.85rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-size: 0.85rem; color: var(--muted-foreground); font-weight: 700;">جملهٔ ${pN}ام الگوی اقدس (تعداد مکعب‌های هرم ${pN}):</div>
              <div id="calc-ticker-term" style="font-size: 1.75rem; font-weight: 900; color: var(--foreground); font-family: 'Yas', sans-serif;">${pTerm}</div>
            </div>
            <div class="code-math-box" style="margin: 0; padding: 0.4rem 0.85rem;">
              <span class="math-tex" data-tex="Te_{${n}} = \\frac{${n} \\times ${n+1} \\times ${n+2}}{6} = ${termN}"></span>
            </div>
          </div>

          <div class="border-beam-box" style="background: var(--highlight-emerald-bg); border: 1.5px solid var(--highlight-emerald-border); border-radius: var(--radius-sm); padding: 0.95rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; position: relative; overflow: hidden;">
            <div class="border-beam"></div>
            <div>
              <div style="font-size: 0.85rem; color: #047857; font-weight: 800;">مجموع ${pN} جملهٔ اول (پاسخ نهایی):</div>
              <div id="calc-ticker-sum" style="font-size: 2.05rem; font-weight: 900; color: #047857; font-family: 'Yas', sans-serif;">${pSum}</div>
            </div>
            <div class="code-math-box highlight-emerald" style="margin: 0; padding: 0.4rem 0.85rem;">
              <span class="math-tex" data-tex="S_{${n}} = \\frac{${n} \\times ${n+1} \\times ${n+2} \\times ${n+3}}{24} = ${sumN}"></span>
            </div>
          </div>
        </div>
      `;

      // Animated Number Ticker (Magic UI)
      if (isUserAction) {
        animateNumberTicker(document.getElementById('calc-ticker-term'), prevTerm, termN, 600);
        animateNumberTicker(document.getElementById('calc-ticker-sum'), prevSum, sumN, 600);
        triggerSparklesCelebration();
      }

      // Update the left derivation card dynamically with full cancellation and steps
      renderStepByStepSimplification(n, pSum);

      const footerSummary = document.getElementById('s6-footer-summary');
      if (footerSummary) {
        footerSummary.innerHTML = `مجموع ${pN} جمله برابر با <strong>${pSum}</strong> است.`;
      }

      renderAllMath();
    }

    if (btn && input) {
      btn.addEventListener('click', () => runSolve(getParsedN(), true));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runSolve(getParsedN(), true);
      });
    }

    // Initial render for default n=41
    runSolve(41, false);
  }

  // Slide 7 Khayyam Filter
  function initSlide7Khayyam() {
    const buttons = document.querySelectorAll('.btn-khayyam-filter, .shadcn-tab-trigger');
    const cells = document.querySelectorAll('.khayyam-cell-node, .khayyam-matrix-cell');
    const infoBox = document.getElementById('khayyam-deck-info');

    const descriptions = {
      'all': '<div class="khayyam-deck-info-content"><span class="khayyam-info-text">مثلث خیام-پاسکال: هر ستون مورب معرف یک بُعد هندسی، تعداد کپی‌های لازم برای تقارن و ضرایب بسط دو‌جمله‌ای است.</span></div>',
      'dim-0': '<div class="khayyam-deck-info-content"><span class="khayyam-info-text"><strong>ستون اول (نقطه / بعد ۰):</strong> همه ۱ هستند. ۱ رأس ← ۱ کپی:</span><span class="khayyam-info-formula math-tex" data-tex="\\displaystyle S_0 = 1"></span></div>',
      'dim-1': '<div class="khayyam-deck-info-content"><span class="khayyam-info-text"><strong>ستون دوم (خط / بعد ۱):</strong> اعداد طبیعی ۱، ۲، ۳، ... ← روش نجمه با ۲ کپی:</span><span class="khayyam-info-formula math-tex" data-tex="\\displaystyle S_1 = \\frac{n(n+1)}{2}"></span></div>',
      'dim-2': '<div class="khayyam-deck-info-content"><span class="khayyam-info-text"><strong>ستون سوم (مثلث / بعد ۲):</strong> اعداد مثلثی ۱، ۳، ۶، ۱۰، ... ← روش نوشین با ۳ کپی:</span><span class="khayyam-info-formula math-tex" data-tex="\\displaystyle S_2 = \\frac{n(n+1)(n+2)}{6}"></span></div>',
      'dim-3': '<div class="khayyam-deck-info-content"><span class="khayyam-info-text"><strong>ستون چهارم (چهاروجهی / بعد ۳):</strong> اعداد هرمی ۱، ۴، ۱۰، ۲۰، ... ← روش اقدس با ۴ کپی:</span><span class="khayyam-info-formula math-tex" data-tex="\\displaystyle S_3 = \\frac{n(n+1)(n+2)(n+3)}{24}"></span></div>',
      'dim-4': '<div class="khayyam-deck-info-content"><span class="khayyam-info-text"><strong>ستون پنجم (سیمپلکس بعد ۴):</strong> تعمیم به ۵ بعد! هر سیمپلکس در بعد ۴ دارای ۵ رأس است ← ۵ کپی فضایی:</span><span class="khayyam-info-formula math-tex" data-tex="\\displaystyle S_4 = \\frac{n(n+1)(n+2)(n+3)(n+4)}{120}"></span></div>'
    };

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const col = btn.getAttribute('data-dim');
        cells.forEach(cell => {
          if (col === 'all') {
            cell.style.opacity = '1';
            cell.classList.remove('glow-target');
          } else {
            const match = cell.classList.contains(col);
            cell.style.opacity = match ? '1' : '0.2';
            cell.classList.toggle('glow-target', match);
          }
        });

        if (infoBox && descriptions[col]) {
          infoBox.innerHTML = descriptions[col];
          renderAllMath();
        }
      });
    });
  }

  // Fullscreen Handler
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
      fullscreenBtn.classList.add('active');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        fullscreenBtn.classList.remove('active');
      }
    }
  }

  // Projector High-Contrast Mode
  function toggleProjectorMode() {
    document.body.classList.toggle('projector-mode');
    const isProj = document.body.classList.contains('projector-mode');
    projectorBtn.classList.toggle('active', isProj);
  }

  // Event Listeners
  if (prevBtn) prevBtn.addEventListener('click', reversePresentation);
  if (nextBtn) nextBtn.addEventListener('click', advancePresentation);

  // Direct Click to Expand Docked Morph Cards (Slide 4)
  document.querySelectorAll('.morph-accordion-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('is-collapsed')) {
        expandMorphCard(card);
      }
    });
  });

  const heroCta = document.getElementById('hero-start-cta');
  if (heroCta) {
    heroCta.addEventListener('click', () => goToSlide(2, false));
  }

  const restartDeckBtn = document.getElementById('restart-deck-btn');
  if (restartDeckBtn) {
    restartDeckBtn.addEventListener('click', () => goToSlide(1, false));
  }

  const thankyouWbBtn = document.getElementById('thankyou-whiteboard-btn');
  if (thankyouWbBtn) {
    thankyouWbBtn.addEventListener('click', () => {
      const wbToggle = document.getElementById('whiteboard-toggle');
      if (wbToggle) wbToggle.click();
    });
  }

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
  if (projectorBtn) projectorBtn.addEventListener('click', toggleProjectorMode);

  // Pre-print Preparation for all slides & 3D canvases
  function prepareAllForPrint() {
    if (!visPelleh && typeof ChandPellehVisualizer !== 'undefined') {
      visPelleh = new ChandPellehVisualizer('canvas-target-pelleh');
      initSlide2Controls();
    }
    if (!visSingle && typeof Aghdas3DVisualizer !== 'undefined') {
      visSingle = new Aghdas3DVisualizer('canvas-target-single', 'single');
      initSlide4Controls();
    }
    if (!visFour && typeof Aghdas3DVisualizer !== 'undefined') {
      visFour = new Aghdas3DVisualizer('canvas-target-four', 'four-copies');
      initSlide5Controls();
    }
    if (!visSimplex && typeof SimplexVisualizer !== 'undefined') {
      visSimplex = new SimplexVisualizer('canvas-target-simplex');
      initSlide8SimplexControls();
    }
    [visPelleh, visSingle, visFour, visSimplex].forEach(vis => {
      if (vis) {
        vis.onWindowResize();
        vis.renderer.render(vis.scene, vis.camera);
      }
    });
  }

  window.addEventListener('beforeprint', prepareAllForPrint);

  const printToggle = document.getElementById('print-toggle');
  if (printToggle) {
    printToggle.addEventListener('click', () => {
      prepareAllForPrint();
      setTimeout(() => window.print(), 120);
    });
  }

  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => helpModal.classList.add('visible'));
  }
  if (closeHelpBtn && helpModal) {
    closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('visible'));
  }
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.classList.remove('visible');
    });
  }

  // Presentation Keyboard Controls (Tailored for Persian Right-to-Left)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // In RTL, moving to the NEXT slide/fragment means advancing LEFT!
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'Enter') {
      e.preventDefault();
      advancePresentation();
    // In RTL, moving to the PREVIOUS slide/fragment means returning RIGHT!
    } else if (e.key === 'ArrowRight' || e.key === 'PageUp' || e.key === 'Backspace') {
      e.preventDefault();
      reversePresentation();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'p' || e.key === 'P') {
      toggleProjectorMode();
    } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
      if (helpModal) helpModal.classList.toggle('visible');
    } else if (e.key === 'Escape') {
      if (helpModal) helpModal.classList.remove('visible');
    } else if (e.key === 'Home') {
      goToSlide(1, false);
    } else if (e.key === 'End') {
      goToSlide(totalSlides, true);
    }
  });

  // ==========================================================================
  // VIBE CODING HELPER ENGINES (Number Ticker, Confetti, Spotlight, 3D Tilt)
  // ==========================================================================

  // Magic UI: Animated Number Ticker (Smooth Rolling Numbers with Yas Font)
  function animateNumberTicker(element, startVal, endVal, duration = 650) {
    if (!element) return;
    const startTime = performance.now();
    const start = Number(startVal) || 0;
    const end = Number(endVal) || 0;

    function updateTicker(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * ease);
      element.textContent = toPersianDigits(current.toLocaleString());

      if (progress < 1) {
        requestAnimationFrame(updateTicker);
      } else {
        element.textContent = toPersianDigits(end.toLocaleString());
      }
    }

    requestAnimationFrame(updateTicker);
  }

  // Magic UI: Lightweight Celebratory Sparkles & Confetti Canvas
  function triggerSparklesCelebration(originX, originY) {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const startX = originX || window.innerWidth / 2;
    const startY = originY || window.innerHeight / 2;

    const colors = ['#f59e0b', '#10b981', '#0284c7', '#ec4899', '#8b5cf6', '#e11d48'];
    const particles = [];
    const count = 55;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const velocity = 5 + Math.random() * 9;
      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2.5,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.22,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    let animFrame;
    function renderParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.018;

        if (p.alpha > 0) {
          activeCount++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      if (activeCount > 0) {
        animFrame = requestAnimationFrame(renderParticles);
      } else {
        cancelAnimationFrame(animFrame);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }

    renderParticles();
  }

  // Aceternity UI: Spotlight Cursor Glow Tracker
  function initSpotlightGlow() {
    const elements = document.querySelectorAll('.card-shadcn, .cover-meta-card, .viewport-cad-container, .step-breakdown-row');
    elements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // Microkit / Motion Primitives: 3D Parallax Tilt for Cover Cards
  function init3DTiltCards() {
    const cards = document.querySelectorAll('.cover-meta-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.classList.add('is-tilting');
      });
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const tiltX = (y * -14).toFixed(2);
        const tiltY = (x * 14).toFixed(2);
        card.style.transform = `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-5px) scale3d(1.025, 1.025, 1.025)`;
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  }

  // Aceternity: Coordinate Grid Parallax Depth
  function initGridParallax() {
    const bg = document.querySelector('.geist-grid-background');
    if (!bg) return;
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 14;
      const y = (e.clientY / window.innerHeight - 0.5) * 14;
      bg.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  }

  // Global Slide Switcher
  window.goToSlide = goToSlide;

  // Initialize all deck systems
  initPagination();
  initProjectorScaleEngine();
  initSlide2Controls();
  initSlide8SimplexControls();
  initSlide6Calculator();
  initSlide7Khayyam();
  initSpotlightGlow();
  init3DTiltCards();
  initGridParallax();

  const urlParams = new URLSearchParams(window.location.search);
  const autoReveal = urlParams.get('revealed') === 'true';

  const hashClean = window.location.hash.replace(/[^0-9]/g, '');
  const hashNum = parseInt(hashClean, 10);
  const startSlide = (!isNaN(hashNum) && hashNum >= 1 && hashNum <= totalSlides) ? hashNum : 1;
  goToSlide(startSlide, autoReveal);

  window.addEventListener('hashchange', () => {
    const s = parseInt(window.location.hash.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(s) && s !== currentSlideIndex) {
      goToSlide(s, autoReveal);
    }
  });
});
