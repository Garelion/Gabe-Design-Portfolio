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
  const slider = shell?.querySelector('.film-strip-slider');
  if (!mask) return;

  let pressedFrame = null;
  let isPointerDown = false;
  let isDragging = false;
  let suppressClick = false;
  let startX = 0;
  let startScrollLeft = 0;
  let autoplayId = null;
  let resumeTimer = null;
  let singleSetWidth = 0;
  const dragThreshold = 6;
  const autoplaySpeed = 0.35;

  function getNormalizedIndex(frame) {
    const indexedValue = Number(frame.dataset.index);
    if (!Number.isNaN(indexedValue)) {
      return ((indexedValue % gallery.length) + gallery.length) % gallery.length;
    }

    const allIndex = allFrames.indexOf(frame);
    if (allIndex === -1) return 0;
    return allIndex % gallery.length;
  }

  function measureSingleSetWidth() {
    singleSetWidth = uniqueFrames.reduce((total, frame) => total + frame.offsetWidth, 0);
    const gap = parseFloat(getComputedStyle(track).gap || 0);
    singleSetWidth += uniqueFrames.length * gap;
  }

  // For infinite loop: we have 2 sets of frames (original + duplicate)
  // Total scrollable = singleSetWidth * 2
  // We keep scroll position in range [0, singleSetWidth) by wrapping
  function normalizeLoopPosition() {
    if (!singleSetWidth) return;
    
    // Wrap around when we've scrolled past one full set
    if (mask.scrollLeft >= singleSetWidth) {
      mask.scrollLeft -= singleSetWidth;
    } else if (mask.scrollLeft < 0) {
      mask.scrollLeft += singleSetWidth;
    }
  }

  function syncSlider() {
    if (!slider || !singleSetWidth) return;

    // Current position within one set (0 to singleSetWidth)
    const progress = mask.scrollLeft / singleSetWidth;
    slider.value = Math.round(progress * 1000);
  }

  function setScrollFromSlider() {
    if (!slider || !singleSetWidth) return;

    const ratio = Number(slider.value) / 1000;
    mask.scrollLeft = ratio * singleSetWidth;
  }

  function pauseAutoplay() {
    if (autoplayId) cancelAnimationFrame(autoplayId);
    autoplayId = null;
    clearTimeout(resumeTimer);
  }

  function autoplayStep() {
    if (document.body.classList.contains('lightbox-open') || isPointerDown) {
      autoplayId = requestAnimationFrame(autoplayStep);
      return;
    }

    mask.scrollLeft += autoplaySpeed;
    normalizeLoopPosition();
    syncSlider();

    autoplayId = requestAnimationFrame(autoplayStep);
  }

  function startAutoplay(delay = 0) {
    pauseAutoplay();
    resumeTimer = setTimeout(() => {
      autoplayId = requestAnimationFrame(autoplayStep);
    }, delay);
  }

  function initPosition() {
    measureSingleSetWidth();
    mask.scrollLeft = 0;
    syncSlider();
  }

  mask.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;

    const frame = e.target.closest('.film-frame');
    if (!frame || !track.contains(frame)) return;

    isPointerDown = true;
    isDragging = false;
    suppressClick = false;
    pressedFrame = frame;
    startX = e.clientX;
    startScrollLeft = mask.scrollLeft;

    pauseAutoplay();
    mask.classList.add('is-dragging');
    mask.setPointerCapture?.(e.pointerId);
  });

  mask.addEventListener('pointermove', e => {
    if (!isPointerDown) return;

    const deltaX = e.clientX - startX;

    if (Math.abs(deltaX) > dragThreshold) {
      isDragging = true;
      suppressClick = true;
      mask.scrollLeft = startScrollLeft - deltaX;
      normalizeLoopPosition();
      syncSlider();
      e.preventDefault();
    }
  });

  mask.addEventListener('pointerup', e => {
    if (!isPointerDown) return;

    const frame = e.target.closest('.film-frame') || pressedFrame;

    mask.classList.remove('is-dragging');

    if (frame && !isDragging && track.contains(frame)) {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(gallery, getNormalizedIndex(frame), frame, null);
    }

    isPointerDown = false;
    isDragging = false;
    pressedFrame = null;

    setTimeout(() => {
      suppressClick = false;
    }, 0);

    if (!document.body.classList.contains('lightbox-open')) {
      startAutoplay(900);
    }
  });

  mask.addEventListener('pointercancel', () => {
    isPointerDown = false;
    isDragging = false;
    pressedFrame = null;
    mask.classList.remove('is-dragging');
    if (!document.body.classList.contains('lightbox-open')) {
      startAutoplay(900);
    }
  });

  mask.addEventListener('scroll', () => {
    normalizeLoopPosition();
    syncSlider();
  });

  mask.addEventListener('mouseenter', pauseAutoplay);
  mask.addEventListener('mouseleave', () => {
    if (!isPointerDown && !document.body.classList.contains('lightbox-open')) {
      startAutoplay(500);
    }
  });

  track.addEventListener('dragstart', e => e.preventDefault());

  uniqueFrames.forEach((frame, index) => {
    frame.addEventListener('click', e => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    frame.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openLightbox(gallery, index, frame, null);
    });
  });

  slider?.addEventListener('input', () => {
    pauseAutoplay();
    setScrollFromSlider();
  });

  slider?.addEventListener('change', () => {
    if (!document.body.classList.contains('lightbox-open')) {
      startAutoplay(700);
    }
  });

  window.addEventListener('resize', () => {
    const oldProgress = singleSetWidth ? (mask.scrollLeft / singleSetWidth) : 0;

    measureSingleSetWidth();
    mask.scrollLeft = oldProgress * singleSetWidth;
    normalizeLoopPosition();
    syncSlider();
  });

  requestAnimationFrame(() => {
    initPosition();
    startAutoplay(1200);
  });
}

  function initSlideGallery(track) {
    const shell = track.closest('.slide-gallery-shell');
    const indicators = shell?.querySelector('.slide-gallery-indicators');
    const frames = [...track.querySelectorAll('.slide-frame')];
    const dots = indicators ? [...indicators.querySelectorAll('.slide-dot')] : [];

    if (!frames.length) return;

    const gallery = frames.map(frame => ({
      src: frame.dataset.full,
      alt: frame.querySelector('img')?.alt || '',
      caption: frame.dataset.caption || ''
    }));

    let currentSlide = 0;
    let autoplayId = null;

    function updateSlides() {
      const total = frames.length;

      frames.forEach((frame, i) => {
        frame.classList.remove('is-prev', 'is-center', 'is-next');
        if (i === currentSlide) frame.classList.add('is-center');
        else if (i === (currentSlide - 1 + total) % total) frame.classList.add('is-prev');
        else if (i === (currentSlide + 1) % total) frame.classList.add('is-next');
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

    function startAutoplay() {
      stopAutoplay();
      autoplayId = setInterval(() => {
        if (document.body.classList.contains('lightbox-open')) return;
        goToSlide(currentSlide + 1);
      }, 5000);
    }

    function stopAutoplay() {
      if (autoplayId) clearInterval(autoplayId);
    }

    frames.forEach((frame, index) => {
      frame.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        if (frame.classList.contains('is-center')) {
          openLightbox(gallery, index, frame, null);
        } else {
          goToSlide(index);
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
    track.addEventListener('mouseleave', startAutoplay);

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

/*   document.querySelectorAll('.carousel').forEach(carousel => {
    syncBootstrapThumbs(carousel);
    initBootstrapCarouselLightbox(carousel);
    initStaticLightboxGallery('.scraps-doc-trigger');
  });

  document.querySelectorAll('.film-strip-track').forEach(initFilmGallery);
  document.querySelectorAll('.slide-gallery-track').forEach(initSlideGallery);
  initStaticLightboxGallery('.scraps-doc-trigger'); */
});
