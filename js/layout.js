if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

/* Reserve scrollbar gutter only when the page actually needs vertical scrolling. */
(function () {
    var root = document.documentElement;

    function updateScrollbarGutter() {
        var needsScroll = root.scrollHeight > root.clientHeight;
        root.classList.toggle('has-vscroll', needsScroll);
    }

    function observeBody() {
        if (window.ResizeObserver && document.body) {
            new ResizeObserver(updateScrollbarGutter).observe(document.body);
        }
    }

    updateScrollbarGutter();

    window.addEventListener('load', updateScrollbarGutter);
    window.addEventListener('resize', updateScrollbarGutter);
    window.addEventListener('pageshow', updateScrollbarGutter);

    if (document.body) {
        observeBody();
    } else {
        document.addEventListener('DOMContentLoaded', observeBody, { once: true });
    }
})();

let carouselsInitialized = false;

function normalizePath(path) {
    let clean = (path || '').split('#')[0].split('?')[0].trim();

    if (!clean) return '/';

    clean = clean.toLowerCase();

    if (clean !== '/' && clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }

    return clean || '/';
}

function getCurrentPageName() {
    return normalizePath(window.location.pathname);
}

function isCurrentPageLink(link) {
    const href = link.getAttribute('href');
    if (!href || href === '#') return false;

    const url = new URL(href, window.location.href);
    return normalizePath(url.pathname) === getCurrentPageName();
}

function setActiveNav() {
  document.querySelectorAll('.navbar-main a[href]').forEach(link => {
    if (!shouldIntercept(link)) {
      link.classList.remove('active');
      return;
    }

    link.classList.toggle('active', isCurrentPageLink(link));
  });

  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const hasActiveChild = dropdown.querySelector('.dropdown-menu a.active');
    const toggle = dropdown.querySelector('.dropdown-toggle');

    if (toggle) {
      toggle.classList.toggle('has-active-child', !!hasActiveChild);
    }
  });

  document.querySelectorAll('.sidebar-dropdown').forEach(dropdown => {
    const hasActiveChild = dropdown.querySelector('.sidebar-dropdown-menu a.active');
    const toggle = dropdown.querySelector('.sidebar-dropdown-toggle');

    if (toggle) {
      toggle.classList.toggle('active', !!hasActiveChild);
    }
  });
}

function initCarousels() {
    if (carouselsInitialized || !window.bootstrap) return;

    document.querySelectorAll('.carousel').forEach(el => {
        if (!bootstrap.Carousel.getInstance(el)) {
            new bootstrap.Carousel(el, {
                interval: false,
                ride: false,
                touch: true
            });
        }
    });

    carouselsInitialized = true;
}

function shouldIntercept(link) {
    const href = link.getAttribute('href');
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (link.target === '_blank') return false;
    if (link.hasAttribute('download')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;

    return true;
}

function updateHeaderOffset() {
    const header = document.querySelector('header');
    if (!header) {
        document.documentElement.style.setProperty('--header-offset', '0px');
        return;
    }

    const rect = header.getBoundingClientRect();
    const offset = Math.max(0, Math.ceil(rect.bottom));
    document.documentElement.style.setProperty('--header-offset', `${offset}px`);
}

window.addEventListener('resize', updateHeaderOffset);
window.addEventListener('load', updateHeaderOffset);

function animateBarTo100(bar, duration = 420) {
    return new Promise(resolve => {
        bar.style.transition = 'none';
        bar.style.width = '0%';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = `width ${duration}ms ease`;
                bar.style.width = '100%';
                setTimeout(resolve, duration);
            });
        });
    });
}

function closeDesktopDropdown() {
    const active = document.activeElement;
    if (active && active.closest('.nav-dropdown')) {
        active.blur();
    }
}

function closeMobileNav() {
  document.getElementById('mobileSidebar')?.classList.remove('active');
  document.getElementById('navOverlay')?.classList.remove('active');

  document.querySelectorAll('.sidebar-dropdown').forEach(dropdown => {
    dropdown.classList.remove('open');

    const toggle = dropdown.querySelector('.sidebar-dropdown-toggle');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.blur();
  });
}


function handleNavigation() {
    document.addEventListener('click', async e => {
        const link = e.target.closest('.navbar-main a[href]');
        if (!link || !shouldIntercept(link)) return;

        if (isCurrentPageLink(link)) {
            e.preventDefault();
            closeMobileNav();
            closeDesktopDropdown();
            return;
        }

        e.preventDefault();
        closeMobileNav();
        closeDesktopDropdown();

        const loader = document.getElementById('page-loader');
        const bar = document.querySelector('.loader-bar');

        document.body.classList.add('is-leaving');
        document.documentElement.classList.add('is-transitioning');

        if (loader && bar) {
            updateHeaderOffset();
            loader.classList.remove('is-hidden');
            await animateBarTo100(bar, 420);
        }

        window.location.href = link.href;
    });
}

window.addEventListener('pageshow', () => {
    updateHeaderOffset();

    const loader = document.getElementById('page-loader');
    const bar = document.querySelector('.loader-bar');

    document.body.classList.add('is-ready');
    document.body.classList.remove('is-leaving');
    document.documentElement.classList.remove('is-transitioning');

    if (loader) loader.classList.add('is-hidden');

    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0%';
    }

    setActiveNav();
});

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderOffset();
    setActiveNav();
    initCarousels();

    document.body.classList.add('is-ready');

    const loader = document.getElementById('page-loader');
    const bar = document.querySelector('.loader-bar');

    if (loader) loader.classList.add('is-hidden');

    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0%';
    }

    handleNavigation();
});

document.addEventListener('click', e => {
  const sidebar = document.getElementById('mobileSidebar');
  const overlay = document.getElementById('navOverlay');

  if (e.target.closest('#navToggle')) {
    sidebar?.classList.add('active');
    overlay?.classList.add('active');
    return;
  }

  if (e.target.closest('#closeSidebar') || e.target.closest('#navOverlay')) {
    closeMobileNav();
    return;
  }

  const dropdownToggle = e.target.closest('.sidebar-dropdown-toggle');

  if (dropdownToggle) {
    e.preventDefault();
    e.stopPropagation();

    const dropdown = dropdownToggle.closest('.sidebar-dropdown');
    const isOpen = dropdown?.classList.contains('open');

    document.querySelectorAll('.sidebar-dropdown').forEach(item => {
      item.classList.remove('open');
      item.querySelector('.sidebar-dropdown-toggle')
        ?.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      dropdown?.classList.add('open');
      dropdownToggle.setAttribute('aria-expanded', 'true');
    }

    return;
  }
});

