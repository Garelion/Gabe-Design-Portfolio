if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

let carouselsInitialized = false;

function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function isCurrentPageLink(link) {
    const href = link.getAttribute('href');
    return href === getCurrentPageName();
}

function setActiveNav() {
    const path = getCurrentPageName();

    document.querySelectorAll('.navbar-main a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        link.classList.toggle('active', href === path);
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
    // If header has scrolled out of view, bottom will be <= 0, so clamp to 0
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

    if (
        e.target.closest('#closeSidebar') ||
        e.target.closest('#navOverlay')
    ) {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        return;
    }

    const dropdownToggle = e.target.closest('.sidebar-dropdown-toggle');

    if (dropdownToggle) {
        e.preventDefault();
        dropdownToggle.closest('.sidebar-dropdown')?.classList.toggle('open');
    }
});