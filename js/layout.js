if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

let partialsLoaded = false;
let carouselsInitialized = false;

function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-main a').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === path);
    });
}

async function loadPartials() {
    if (partialsLoaded) return;

    const headerTarget = document.querySelector('#sharedHeader');
    const footerTarget = document.querySelector('#sharedFooter');
    const tasks = [];

    if (headerTarget) {
        tasks.push(
            fetch('/partials/_header.html')
                .then(r => r.text())
                .then(html => {
                    headerTarget.innerHTML = html;
                })
        );
    }

    if (footerTarget) {
        tasks.push(
            fetch('/partials/_footer.html')
                .then(r => r.text())
                .then(html => {
                    footerTarget.innerHTML = html;
                })
        );
    }

    await Promise.all(tasks);
    setActiveNav();
    partialsLoaded = true;
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

function animateBarTo100(bar, duration = 420) {
    return new Promise(resolve => {
        bar.style.transition = 'none';
        bar.classList.remove('is-complete');
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

function handleNavigation() {
    document.addEventListener('click', async e => {
        const link = e.target.closest('a[href]');
        if (!link || !shouldIntercept(link)) return;

        e.preventDefault();

        const loader = document.getElementById('page-loader');
        const bar = document.querySelector('.loader-bar');

        document.body.classList.add('is-leaving');
        document.documentElement.classList.add('is-transitioning');

        if (loader && bar) {
            loader.classList.remove('is-hidden');
            await animateBarTo100(bar, 420);
        }

        window.location.href = link.href;
    });
}

window.addEventListener('pageshow', e => {
    const loader = document.getElementById('page-loader');
    const bar = document.querySelector('.loader-bar');

    document.body.classList.add('is-ready');
    document.body.classList.remove('is-leaving');
    document.documentElement.classList.remove('is-transitioning');

    if (loader) loader.classList.add('is-hidden');

    if (bar) {
        bar.style.transition = 'none';
        bar.classList.remove('is-complete');
        bar.style.width = '0%';
    }

    if (e.persisted) {
        setActiveNav();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadPartials();
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

    document.querySelectorAll('video[autoplay]').forEach(video => {
        video.play().catch(() => {});
    });
});


