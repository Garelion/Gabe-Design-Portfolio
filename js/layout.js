/* layout.js */
history.scrollRestoration = "manual";

fetch('/partials/_header.html')
  .then(res => res.text())
  .then(html => {
    document.querySelector('#sharedHeader').innerHTML = html;
    
    setActiveNav();
  });


function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';

    const links = document.querySelectorAll('.navbar-main a');

    links.forEach(link => {
        const href = link.getAttribute('href');

        if (href === path) {
            link.classList.add('active');
        }
    });
}

fetch('/partials/_footer.html')
  .then(res => res.text())
  .then(html => {
    document.querySelector('#sharedFooter').innerHTML = html;
    
    setActiveNav();
  });

// Handle font loading to prevent layout shift
function initFontLoading() {
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            document.documentElement.classList.add('fonts-loaded');
        });
    } else {
        document.documentElement.classList.add('fonts-loaded');
    }
}

// Fade-in on page navigation
window.addEventListener("pageshow", () => {
    // Force correct position FIRST
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Then animate
    document.body.classList.add("page-loaded");

    const loader = document.querySelector(".loader-bar");

    if (loader) {
        loader.classList.add("done");

        setTimeout(() => {
            loader.classList.remove("active", "done");
        }, 300);
    }
});

document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;

    const url = link.getAttribute("href");

    if (
        url.startsWith("http") ||
        url.startsWith("#") ||
        link.target === "_blank"
    ) return;

    e.preventDefault();

    const loader = document.querySelector(".loader-bar");

    // Start loading bar
    loader.classList.add("active");


    loader.style.width = "20%";

    setTimeout(() => loader.style.width = "55%", 120);
    setTimeout(() => loader.style.width = "80%", 240);


    // Slight delay so user sees it start
    setTimeout(() => {
        document.body.classList.remove("page-loaded"); // fade out

        setTimeout(() => {
            window.location.href = url;
        }, 250);
    }, 100);
});



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initFontLoading);
