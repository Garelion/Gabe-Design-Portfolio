history.scrollRestoration = "manual";

async function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }
}

async function waitForLayoutStability() {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
}

async function loadPartials() {
    const header = fetch('/partials/_header.html')
        .then(r => r.text())
        .then(html => {
            document.querySelector('#sharedHeader').innerHTML = html;
            setActiveNav();
        });

    const footer = fetch('/partials/_footer.html')
        .then(r => r.text())
        .then(html => {
            document.querySelector('#sharedFooter').innerHTML = html;
            setActiveNav();
        });

    await Promise.all([header, footer]);
}

function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-main a').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
}

async function runSmoothLoader() {
    const overlay = document.getElementById("page-loader");
    const bar = document.querySelector(".loader-bar");

    // Show overlay but DO NOT animate bar yet
    overlay.classList.remove("hidden");
    bar.style.transition = "none";
    bar.style.width = "0%";

    await loadPartials();
    await waitForFonts();
    await waitForLayoutStability();

    requestAnimationFrame(() => {
        bar.style.transition = "width 0.35s ease-out";
        bar.style.width = "100%";
    });

    setTimeout(() => {
        overlay.classList.add("hidden");
        document.body.classList.add("page-loaded");
    }, 350);

    setTimeout(() => {
        bar.style.transition = "none";
        bar.style.width = "0%";
    }, 700);
}

window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
        document.getElementById("page-loader").classList.add("hidden");
        document.body.classList.add("page-loaded");
        return;
    }
    runSmoothLoader();
});

document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;

    const url = link.getAttribute("href");

    if (url.startsWith("http") || url.startsWith("#") || link.target === "_blank")
        return;

    e.preventDefault();

    const overlay = document.getElementById("page-loader");
    const bar = document.querySelector(".loader-bar");

    overlay.classList.remove("hidden");
    bar.style.transition = "none";
    bar.style.width = "0%";

    document.body.classList.add("fade-out");
    document.body.classList.remove("page-loaded");

    setTimeout(() => {
        window.location.href = url;
    }, 80);
});
