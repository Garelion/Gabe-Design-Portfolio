// js/carousels.js
document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('filmLightbox');
  if (!lightbox) return;

  const lightboxImg = document.getElementById('filmLightboxImg');
  const lightboxCaption = document.getElementById('filmLightboxCaption');
  const closeBtn = lightbox.querySelector('.film-lightbox-close');
  const prevBtn = lightbox.querySelector('.film-lightbox-nav.prev');
  const nextBtn = lightbox.querySelector('.film-lightbox-nav.next');

  let activeGallery = [];
  let activeIndex = 0;
  let activeTrigger = null;
  /* let activeTrack = null; */
  let activeFilmController = null;

  // Timestamp of the last time the lightbox was opened. Used to ignore the
  // synthesized "ghost" click that fires ~300ms after a touch tap, which would
  // otherwise land on the freshly-opened backdrop and close it immediately.
  let lightboxOpenedAt = 0;

  function renderLightbox(index) {
    if (!activeGallery.length) return;
    activeIndex = (index + activeGallery.length) % activeGallery.length;
    const item = activeGallery[activeIndex];

    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    lightboxCaption.textContent = item.caption || '';
  }

  function openLightbox(gallery, index, triggerEl = null, filmController = null) {
    if (!gallery.length) return;

    activeGallery = gallery;
    activeTrigger = triggerEl;
    activeFilmController = filmController;

    activeFilmController?.pause();

    renderLightbox(index);

    lightboxOpenedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    document.documentElement.classList.add('lightbox-open');
    document.body.classList.add('lightbox-open');
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');

    // Avoid stealing scroll/focus on mobile; only move focus once the open
    // transition has settled and a stray pointer/ghost event can't fire.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { closeBtn.focus({ preventScroll: true }); } catch (_) { closeBtn.focus(); }
      });
    });
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('lightbox-open');
    document.body.classList.remove('lightbox-open');

    lightboxImg.removeAttribute('src');
    lightboxImg.alt = '';
    lightboxCaption.textContent = '';

    activeFilmController?.resume(900);

    if (activeTrigger) activeTrigger.focus();

    activeGallery = [];
    activeIndex = 0;
    activeTrigger = null;
    activeFilmController = null;
  }

  function syncBootstrapThumbs(carousel) {
    if (!carousel.id) return;

    const thumbs = [
      ...document.querySelectorAll(
        `.carousel-thumbnails .carousel-thumb[data-bs-target="#${carousel.id}"]`
      )
    ];

    if (!thumbs.length) return;

    function setActive(index) {
      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
        thumb.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
    }

    carousel.addEventListener('slide.bs.carousel', (e) => {
      setActive(e.to);
    });
  }

  function initStaticLightboxGallery(selector) {
    const triggers = [...document.querySelectorAll(selector)];
    if (!triggers.length) return;

    const gallery = triggers.map(trigger => {
      const img = trigger.querySelector('img');
      return {
        src: trigger.dataset.full || img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        caption: trigger.dataset.caption || img?.getAttribute('alt') || ''
      };
    });

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(gallery, index, trigger, null);
      });

      trigger.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openLightbox(gallery, index, trigger, null);
      });
    });
  }

  function initBootstrapCarouselLightbox(carousel) {
    const images = [...carousel.querySelectorAll('.carousel-item img')];
    if (!images.length) return;

    const gallery = images.map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      caption: img.dataset.caption || img.getAttribute('alt') || ''
    }));

    images.forEach((img, index) => {
      img.style.cursor = 'url("/assets/cursor-zoom-in.svg") 8 8, zoom-in';
      img.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(gallery, index, img, null);
      });
    });
  }


  function initFilmGallery(track) {
    const allFrames = [...track.querySelectorAll('.film-frame')];
    if (!allFrames.length) return;

    const uniqueFrames = allFrames.filter(
      frame => frame.getAttribute('aria-hidden') !== 'true'
    );
    if (!uniqueFrames.length) return;

    const gallery = uniqueFrames.map(frame => ({
      src: frame.dataset.full,
      alt: frame.querySelector('img')?.alt || '',
      caption: frame.dataset.caption || ''
    }));

    const mask = track.closest('.film-strip-mask');
    const shell = track.closest('.film-strip-shell');
    const prevArrow = shell?.querySelector('.film-arrow-prev');
    const nextArrow = shell?.querySelector('.film-arrow-next');

    if (!mask) return;

    let currentTranslateX = 0;
    let ambientTranslateX = 0;
    let ambientLoopMinX = 0;

    let singleSetWidth = 0;
    let isAnimating = false;
    let ambientAnimationId = null;
    let resumeTimer = null;

    let isPointerDown = false;
    let isDragging = false;
    let suppressClick = false;

    let pressedFrame = null;
    let pointerId = null;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTranslateX = 0;
    let dragIntent = null;

    const ambientSpeed = 0.3;
    const stepDuration = 400;
    const dragThreshold = 4;

    mask.style.touchAction = 'pan-y';

    function getGap() {
      return parseFloat(getComputedStyle(track).gap || 0);
    }

    function getTotalWidth() {
      const gap = getGap();
      let total = 0;

      uniqueFrames.forEach(frame => {
        total += frame.offsetWidth + gap;
      });

      return total;
    }

    function measureTrack() {
      singleSetWidth = getTotalWidth();
    }

    function applyTransform(x) {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    }

    function normalizePosition() {
      if (!singleSetWidth) return;

      while (currentTranslateX <= -singleSetWidth * 2) {
        currentTranslateX += singleSetWidth;
      }

      while (currentTranslateX > -singleSetWidth) {
        currentTranslateX -= singleSetWidth;
      }
    }

    function wrapAmbientPosition() {
      if (!singleSetWidth) return;

      const min = -singleSetWidth * 2;
      const max = -singleSetWidth;
      const range = singleSetWidth;

      currentTranslateX = ((currentTranslateX - min) % range + range) % range + min;

      if (currentTranslateX >= max) {
        currentTranslateX -= range;
      }
    }

    // Measure live, rendered geometry (getBoundingClientRect) 
    function getMaskCenterX() {
      const rect = mask.getBoundingClientRect();
      return rect.left + rect.width / 2;
    }

    function getFrameCenterX(frame) {
      const rect = frame.getBoundingClientRect();
      return rect.left + rect.width / 2;
    }

    // Signed distance (px) of a frame's center from the mask's center.
    function getFrameOffsetFromCenter(frame) {
      return getFrameCenterX(frame) - getMaskCenterX();
    }

    // Absolute translateX that lands `frame` exactly in the mask center,
    function getTranslateForCenteredFrame(frame) {
      return currentTranslateX + (getMaskCenterX() - getFrameCenterX(frame));
    }

    function getEquivalentCenteredTargets(frame) {
      const base = getTranslateForCenteredFrame(frame);
      return [base - singleSetWidth, base, base + singleSetWidth];
    }

    function getNearestTargetX(frame, fromX = currentTranslateX) {
      const candidates = getEquivalentCenteredTargets(frame);
      return candidates.reduce((best, x) => {
        return Math.abs(x - fromX) < Math.abs(best - fromX) ? x : best;
      });
    }


    function getNormalizedIndex(frame) {
      const indexedValue = Number(frame.dataset.index);
      if (!Number.isNaN(indexedValue)) {
        return ((indexedValue % gallery.length) + gallery.length) % gallery.length;
      }

      const allIndex = allFrames.indexOf(frame);
      if (allIndex === -1) return 0;
      return allIndex % gallery.length;
    }

    function getClosestFrameToCenter() {
      let closestFrame = null;
      let closestDistance = Infinity;

      allFrames.forEach(frame => {
        const distance = Math.abs(getFrameOffsetFromCenter(frame));
        if (distance < closestDistance) {
          closestDistance = distance;
          closestFrame = frame;
        }
      });

      return closestFrame;
    }

    function getBestDuplicateForIndex(targetIndex, fromX = currentTranslateX) {
      let bestFrame = null;
      let bestDistance = Infinity;

      allFrames.forEach(frame => {
        if (getNormalizedIndex(frame) !== targetIndex) return;

        const candidateTargetX = getNearestTargetX(frame, fromX);
        const distance = Math.abs(candidateTargetX - fromX);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestFrame = frame;
        }
      });

      return bestFrame;
    }

    function settleCenteredIndex(targetIndex) {
      const settledFrame = getBestDuplicateForIndex(targetIndex, currentTranslateX);
      if (!settledFrame) return;

      currentTranslateX = getNearestTargetX(settledFrame, currentTranslateX);
      normalizePosition();
      applyTransform(currentTranslateX);
    }

    function stopAmbientDrift() {
      if (ambientAnimationId) cancelAnimationFrame(ambientAnimationId);
      ambientAnimationId = null;
      clearTimeout(resumeTimer);
    }

    function ambientStep() {
      if (
        document.body.classList.contains('lightbox-open') ||
        isAnimating ||
        isPointerDown
      ) {
        ambientAnimationId = requestAnimationFrame(ambientStep);
        return;
      }

      ambientTranslateX -= ambientSpeed;

      // dumb seamless loop
      if (ambientTranslateX <= ambientLoopMinX) {
        ambientTranslateX += singleSetWidth;
      }

      currentTranslateX = ambientTranslateX;
      applyTransform(currentTranslateX);

      ambientAnimationId = requestAnimationFrame(ambientStep);
    }

    function startAmbientDrift(delay = 0) {
      stopAmbientDrift();

      // sync smart position into dumb slideshow
      ambientTranslateX = currentTranslateX;

      resumeTimer = setTimeout(() => {
        ambientAnimationId = requestAnimationFrame(ambientStep);
      }, delay);
    }

    function animateToFrame(frame, duration = stepDuration, resumeDelay = 1200) {
      if (!frame || isAnimating) return;

      stopAmbientDrift();
      isAnimating = true;

      const targetIndex = getNormalizedIndex(frame);
      const startX = currentTranslateX;
      const targetFrame = getBestDuplicateForIndex(targetIndex, startX) || frame;
      const targetX = getNearestTargetX(targetFrame, startX);
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        currentTranslateX = startX + (targetX - startX) * eased;
        applyTransform(currentTranslateX);

        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }

        currentTranslateX = targetX;
        normalizePosition();
        // Land on a whole pixel so the arrow-centered frame renders crisp and
        // is reliably centered (sub-pixel transforms read as a slight offset).
        currentTranslateX = Math.round(currentTranslateX);
        applyTransform(currentTranslateX);
        isAnimating = false;

        if (!document.body.classList.contains('lightbox-open')) {
          startAmbientDrift(resumeDelay);
        }
      }

      requestAnimationFrame(step);
    }

    function centerFrame(frame, duration = stepDuration, resumeDelay = 1200) {
      animateToFrame(frame, duration, resumeDelay);
    }

    function moveByFrame(direction = 1) {
      if (isAnimating) return;

      const currentFrame = getClosestFrameToCenter();
      const currentIndex = currentFrame ? getNormalizedIndex(currentFrame) : 0;
      const targetIndex =
        (currentIndex + direction + gallery.length) % gallery.length;

      const targetFrame = getBestDuplicateForIndex(targetIndex);
      if (!targetFrame) return;

      centerFrame(targetFrame, stepDuration, 1200);
    }

    function initPosition() {
      measureTrack();

      const firstFrame =
        allFrames.find(frame => getNormalizedIndex(frame) === 0) || uniqueFrames[0];

      currentTranslateX =
        getTranslateForCenteredFrame(firstFrame) - singleSetWidth;

      // save actual seamless boundary
      ambientLoopMinX = currentTranslateX - singleSetWidth;

      normalizePosition();
      settleCenteredIndex(0);
    }

    function resetPointerState() {
      isPointerDown = false;
      isDragging = false;
      pressedFrame = null;
      pointerId = null;
      dragIntent = null;

      requestAnimationFrame(() => {
        suppressClick = false;
      });
    }

    const filmController = {
      pause() {
        stopAmbientDrift();
      },
      resume(delay = 900) {
        if (!isPointerDown && !document.body.classList.contains('lightbox-open')) {
          startAmbientDrift(delay);
        }
      }
    };

    function endDrag(e) {
      if (!isPointerDown) return;

      mask.classList.remove('is-dragging');

      if (mask.releasePointerCapture && e?.pointerId != null) {
        try {
          mask.releasePointerCapture(e.pointerId);
        } catch (_) { }
      }

      normalizePosition();
      applyTransform(currentTranslateX);

      if (dragIntent === 'x' && isDragging) {
        if (!document.body.classList.contains('lightbox-open')) {
          startAmbientDrift(1400);
        }

        resetPointerState();
        return;
      }

      if (
        pressedFrame &&
        dragIntent !== 'y' &&
        !document.body.classList.contains('lightbox-open')
      ) {
        const normalizedIndex = getNormalizedIndex(pressedFrame);
        // The pressed frame may be a duplicate (aria-hidden) clone. Hand the
        // lightbox a real, focusable frame as the trigger so that when the
        // lightbox closes and restores focus, it lands on an element that's
        // visible to assistive tech instead of a hidden clone.
        const focusTrigger = uniqueFrames[normalizedIndex] || pressedFrame;
        openLightbox(gallery, normalizedIndex, focusTrigger, filmController);
        resetPointerState();
        return;
      }

      if (!document.body.classList.contains('lightbox-open')) {
        startAmbientDrift(900);
      }

      resetPointerState();
    }

    prevArrow?.addEventListener('click', () => {
      moveByFrame(-1);
    });

    nextArrow?.addEventListener('click', () => {
      moveByFrame(1);
    });

    shell?.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveByFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveByFrame(1);
      }
    });

    mask.addEventListener('pointerdown', e => {
      if (isAnimating) return;
      if (e.button !== 0 && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;

      isPointerDown = true;
      isDragging = false;
      suppressClick = false;

      pointerId = e.pointerId;
      pressedFrame = e.target.closest('.film-frame');

      // The duplicated frames are correctly hidden from assistive tech with
      // aria-hidden, but they're still <button>s that grab focus on press.
      // A focused element inside an aria-hidden subtree is an accessibility
      // violation that browsers block (the "Blocked aria-hidden ..." warning).
      // Clones never need focus — taps open the lightbox through this delegated
      // handler — so suppress the default focus when pressing a clone.
      if (pressedFrame && pressedFrame.getAttribute('aria-hidden') === 'true') {
        e.preventDefault();
      }

      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartTranslateX = currentTranslateX;
      dragIntent = null;

      stopAmbientDrift();
      mask.classList.add('is-dragging');

      if (mask.setPointerCapture) {
        try {
          mask.setPointerCapture(e.pointerId);
        } catch (_) { }
      }
    });

    mask.addEventListener('pointermove', e => {
      if (!isPointerDown) return;
      if (pointerId != null && e.pointerId !== pointerId) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      if (!dragIntent) {
        if (
          Math.abs(deltaX) < dragThreshold &&
          Math.abs(deltaY) < dragThreshold
        ) {
          return;
        }

        dragIntent = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
      }

      if (dragIntent === 'y') {
        isDragging = false;
        return;
      }

      isDragging = true;
      suppressClick = true;
      currentTranslateX = dragStartTranslateX + deltaX;
      normalizePosition();
      applyTransform(currentTranslateX);

      e.preventDefault();
    });

    mask.addEventListener('pointerup', endDrag);

    mask.addEventListener('pointercancel', () => {
      mask.classList.remove('is-dragging');

      if (!document.body.classList.contains('lightbox-open')) {
        startAmbientDrift(900);
      }

      resetPointerState();
    });

    mask.addEventListener('mouseenter', stopAmbientDrift);
    mask.addEventListener('mouseleave', () => {
      if (!isPointerDown && !document.body.classList.contains('lightbox-open')) {
        startAmbientDrift(500);
      }
    });

    track.addEventListener('dragstart', e => e.preventDefault());

    uniqueFrames.forEach((frame, index) => {
      frame.addEventListener('click', e => {
        if (suppressClick) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        openLightbox(gallery, index, frame, filmController);
      });

      frame.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openLightbox(gallery, index, frame, filmController);
      });
    });

    window.addEventListener('resize', () => {
      measureTrack();
      const centeredFrame = getClosestFrameToCenter();
      const centeredIndex = centeredFrame ? getNormalizedIndex(centeredFrame) : 0;
      settleCenteredIndex(centeredIndex);
    });

    window.addEventListener('load', () => {
      initPosition();
      startAmbientDrift(1200);
    });
  }

  function initSlideGallery(track) {
    const shell = track.closest('.slide-gallery-shell');
    const viewport = shell?.querySelector('.slide-gallery-viewport');
    const indicators = shell?.querySelector('.slide-gallery-indicators');
    const frames = [...track.querySelectorAll('.slide-frame')];
    const dots = indicators ? [...indicators.querySelectorAll('.slide-dot')] : [];

    if (!frames.length) return;

    const gallery = frames.map(frame => {
      const img = frame.querySelector('img');
      return {
        src: frame.dataset.full || img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        caption: frame.dataset.caption || img?.getAttribute('alt') || ''
      };
    });

    let currentSlide = 0;
    let autoplayId = null;
    let shiftTimer = null;
    let isShifting = false;

    let isPointerDown = false;
    let isDragging = false;
    let suppressClick = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragIntent = null;

    const dragThreshold = 8;
    const swipeThreshold = 50;
    const gestureEl = viewport || track;
    if (!gestureEl) return;

    gestureEl.style.touchAction = 'pan-y';

    function armCenterZoom() {
      frames.forEach(frame => frame.classList.remove('can-zoom'));
      const centerFrame = frames[currentSlide];
      if (centerFrame) centerFrame.classList.add('can-zoom');
    }

    function beginShift() {
      isShifting = true;
      track.classList.add('is-shifting');
      frames.forEach(frame => frame.classList.remove('can-zoom'));
      clearTimeout(shiftTimer);
    }

    function endShift() {
      isShifting = false;
      track.classList.remove('is-shifting');
      armCenterZoom();
    }

    function updateSlides() {
      const total = frames.length;

      frames.forEach((frame, i) => {
        frame.classList.remove('is-prev', 'is-center', 'is-next');

        if (i === currentSlide) {
          frame.classList.add('is-center');
        } else if (i === (currentSlide - 1 + total) % total) {
          frame.classList.add('is-prev');
        } else if (i === (currentSlide + 1) % total) {
          frame.classList.add('is-next');
        }
      });

      dots.forEach((dot, i) => {
        const active = i === currentSlide;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    function goToSlide(index) {
      const nextSlide = (index + frames.length) % frames.length;
      if (nextSlide === currentSlide) return;

      beginShift();
      currentSlide = nextSlide;
      updateSlides();

      shiftTimer = setTimeout(() => {
        endShift();
      }, 500);
    }

    function goNext() {
      goToSlide(currentSlide + 1);
    }

    function startAutoplay() {
      stopAutoplay();
      autoplayId = setInterval(() => {
        if (document.body.classList.contains('lightbox-open')) return;
        if (isPointerDown) return;
        if (isShifting) return;
        goNext();
      }, 5000);
    }

    function stopAutoplay() {
      if (autoplayId) clearInterval(autoplayId);
      autoplayId = null;
    }

    gestureEl.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;

      const frame = e.target.closest('.slide-frame');
      if (!frame || !track.contains(frame)) return;

      isPointerDown = true;
      isDragging = false;
      suppressClick = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragIntent = null;

      stopAutoplay();
    });

    gestureEl.addEventListener('pointermove', e => {
      if (!isPointerDown) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (!dragIntent) {
        if (Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return;
        dragIntent = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }

      if (dragIntent === 'y') return;

      if (Math.abs(dx) >= dragThreshold) {
        isDragging = true;
        e.preventDefault();
      }
    });

    function endPointer(e) {
      if (!isPointerDown) return;

      const dx = e.clientX - dragStartX;

      if (dragIntent === 'x' && Math.abs(dx) >= swipeThreshold) {
        suppressClick = true;

        if (dx < 0) {
          goToSlide(currentSlide + 1);
        } else {
          goToSlide(currentSlide - 1);
        }
      }

      isPointerDown = false;
      isDragging = false;
      dragIntent = null;

      setTimeout(() => {
        suppressClick = false;
      }, 0);

      if (!document.body.classList.contains('lightbox-open')) {
        startAutoplay();
      }
    }

    gestureEl.addEventListener('pointerup', endPointer);

    gestureEl.addEventListener('pointercancel', () => {
      isPointerDown = false;
      isDragging = false;
      dragIntent = null;
      suppressClick = false;

      if (!document.body.classList.contains('lightbox-open')) {
        startAutoplay();
      }
    });

    frames.forEach((frame, index) => {
      frame.addEventListener('click', e => {
        if (suppressClick || isShifting) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (frame.classList.contains('is-center')) {
          openLightbox(gallery, index, frame, null);
          return;
        }

        if (frame.classList.contains('is-prev')) {
          goToSlide(currentSlide - 1);
          return;
        }

        if (frame.classList.contains('is-next')) {
          goToSlide(currentSlide + 1);
        }
      });

      frame.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;

        e.preventDefault();

        if (isShifting) return;

        if (frame.classList.contains('is-center')) {
          openLightbox(gallery, index, frame, null);
          return;
        }

        if (frame.classList.contains('is-prev')) {
          goToSlide(currentSlide - 1);
          return;
        }

        if (frame.classList.contains('is-next')) {
          goToSlide(currentSlide + 1);
        }
      });
    });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', e => {
        e.preventDefault();
        if (isShifting) return;
        goToSlide(index);
      });
    });

    track.addEventListener('mouseenter', stopAutoplay);
    track.addEventListener('mouseleave', () => {
      if (!isPointerDown && !document.body.classList.contains('lightbox-open')) {
        startAutoplay();
      }
    });

    updateSlides();
    armCenterZoom();
    startAutoplay();
  }

  prevBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    renderLightbox(activeIndex - 1);
  });

  nextBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    renderLightbox(activeIndex + 1);
  });

  closeBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    closeLightbox();
  });

  lightbox.addEventListener('click', e => {
    // Only the backdrop itself should close the lightbox.
    if (e.target !== lightbox) return;

    // Ignore the synthesized "ghost" click that browsers dispatch shortly
    // after a touch tap. On touch, the film-strip opens on `pointerup`, then
    // the ghost click arrives at the original tap point — which is now the
    // full-screen backdrop — and would close the lightbox before it's seen.
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lightboxOpenedAt < 500) return;

    closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') renderLightbox(activeIndex - 1);
    if (e.key === 'ArrowRight') renderLightbox(activeIndex + 1);
  });

  document.querySelectorAll('.carousel').forEach((carouselEl) => {
    const carouselInstance = bootstrap.Carousel.getOrCreateInstance(carouselEl, {
      interval: Number(carouselEl.dataset.bsInterval) || 5000,
      ride: 'carousel',
      pause: false,
      touch: true,
      wrap: true
    });

    carouselInstance.cycle();
    syncBootstrapThumbs(carouselEl);
    initBootstrapCarouselLightbox(carouselEl);
  });

  initStaticLightboxGallery('.scraps-doc-trigger');
  document.querySelectorAll('.film-strip-track').forEach(initFilmGallery);
  document.querySelectorAll('.slide-gallery-track').forEach(initSlideGallery);

});
