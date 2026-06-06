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
  let activeTrack = null;

  function renderLightbox(index) {
    if (!activeGallery.length) return;
    activeIndex = (index + activeGallery.length) % activeGallery.length;
    const item = activeGallery[activeIndex];

    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    lightboxCaption.textContent = item.caption || '';
  }

  function openLightbox(gallery, index, triggerEl = null, trackEl = null) {
    if (!gallery.length) return;

    activeGallery = gallery;
    activeTrigger = triggerEl;
    activeTrack = trackEl;

    if (activeTrack) activeTrack.style.animationPlayState = 'paused';

    renderLightbox(index);

    document.documentElement.classList.add('lightbox-open');
    document.body.classList.add('lightbox-open');
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => closeBtn.focus());
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('lightbox-open');
    document.body.classList.remove('lightbox-open');

    if (activeTrack) activeTrack.style.animationPlayState = '';

    lightboxImg.removeAttribute('src');
    lightboxImg.alt = '';
    lightboxCaption.textContent = '';

    if (activeTrigger) activeTrigger.focus();

    activeGallery = [];
    activeIndex = 0;
    activeTrigger = null;
    activeTrack = null;
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

  const ambientSpeed = 0.20;
  const stepDuration = 400;
  const dragThreshold = 4;
  const swipeThreshold = 56;

  mask.style.touchAction = 'pan-y';

  function getGap() {
    return parseFloat(getComputedStyle(track).gap || 0);
  }

  function getTotalWidth() {
    let total = 0;
    const gap = getGap();

    uniqueFrames.forEach((frame, index) => {
      total += frame.offsetWidth;
      if (index < uniqueFrames.length - 1) total += gap;
    });

    return total;
  }

  function applyTransform(x) {
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function normalizePosition() {
    const singleSetWidth = getTotalWidth();

    if (!singleSetWidth) return;

    while (currentTranslateX <= -singleSetWidth * 2) {
      currentTranslateX += singleSetWidth;
    }

    while (currentTranslateX > -singleSetWidth) {
      currentTranslateX -= singleSetWidth;
    }
  }

  function getMaskCenterX() {
    return mask.clientWidth / 2;
  }

  function getFrameCenterX(frame) {
    return frame.offsetLeft + frame.offsetWidth / 2;
  }

  function getFrameCenterInMask(frame, translateX = currentTranslateX) {
    return getFrameCenterX(frame) + translateX;
  }

  function getTranslateForCenteredFrame(frame) {
    return Math.round(getMaskCenterX() - getFrameCenterX(frame));
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
    const maskCenter = getMaskCenterX();
    let closestFrame = null;
    let closestDistance = Infinity;

    allFrames.forEach(frame => {
      const distance = Math.abs(getFrameCenterInMask(frame) - maskCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestFrame = frame;
      }
    });

    return closestFrame;
  }

  function getBestDuplicateForIndex(targetIndex) {
    let bestFrame = null;
    let bestDistance = Infinity;

    allFrames.forEach(frame => {
      if (getNormalizedIndex(frame) !== targetIndex) return;

      const candidateTargetX = getTranslateForCenteredFrame(frame);
      const distance = Math.abs(candidateTargetX - currentTranslateX);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestFrame = frame;
      }
    });

    return bestFrame;
  }

  function settleCenteredIndex(targetIndex) {
    const settledFrame = getBestDuplicateForIndex(targetIndex);
    if (!settledFrame) return;

    currentTranslateX = getTranslateForCenteredFrame(settledFrame);
    normalizePosition();

    const finalFrame = getBestDuplicateForIndex(targetIndex);
    if (finalFrame) {
      currentTranslateX = getTranslateForCenteredFrame(finalFrame);
    }

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

    currentTranslateX -= ambientSpeed;
    normalizePosition();
    applyTransform(currentTranslateX);

    ambientAnimationId = requestAnimationFrame(ambientStep);
  }

  function startAmbientDrift(delay = 0) {
    stopAmbientDrift();
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
    const targetX = getTranslateForCenteredFrame(frame);
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
      settleCenteredIndex(targetIndex);
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
    const firstFrame =
      allFrames.find(frame => getNormalizedIndex(frame) === 0) || uniqueFrames[0];

    currentTranslateX = getTranslateForCenteredFrame(firstFrame) - getTotalWidth();
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

  function endDrag(e) {
    if (!isPointerDown) return;

    const deltaX = e.clientX - dragStartX;
    const absDeltaX = Math.abs(deltaX);

    mask.classList.remove('is-dragging');

    if (mask.releasePointerCapture && e?.pointerId != null) {
      try {
        mask.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    normalizePosition();

    if (dragIntent === 'x' && isDragging) {
      if (absDeltaX >= swipeThreshold) {
        moveByFrame(deltaX < 0 ? 1 : -1);
      } else {
        const centeredFrame = getClosestFrameToCenter();
        if (centeredFrame) {
          centerFrame(centeredFrame, 180, 900);
        } else if (!document.body.classList.contains('lightbox-open')) {
          startAmbientDrift(900);
        }
      }

      resetPointerState();
      return;
    }

    if (
      pressedFrame &&
      dragIntent !== 'y' &&
      !document.body.classList.contains('lightbox-open')
    ) {
      openLightbox(gallery, getNormalizedIndex(pressedFrame), pressedFrame, null);
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

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTranslateX = currentTranslateX;
    dragIntent = null;

    stopAmbientDrift();
    mask.classList.add('is-dragging');

    if (mask.setPointerCapture) {
      try {
        mask.setPointerCapture(e.pointerId);
      } catch (_) {}
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
      openLightbox(gallery, index, frame, null);
    });

    frame.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openLightbox(gallery, index, frame, null);
    });
  });

  window.addEventListener('resize', () => {
    const centeredFrame = getClosestFrameToCenter();
    const centeredIndex = centeredFrame ? getNormalizedIndex(centeredFrame) : 0;
    settleCenteredIndex(centeredIndex);
  });

  requestAnimationFrame(() => {
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
    currentSlide = (index + frames.length) % frames.length;
    updateSlides();
  }

  function goNext() {
    goToSlide(currentSlide + 1);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayId = setInterval(() => {
      if (document.body.classList.contains('lightbox-open')) return;
      if (isPointerDown) return;
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
      if (suppressClick) {
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
    if (e.target === lightbox) closeLightbox();
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
