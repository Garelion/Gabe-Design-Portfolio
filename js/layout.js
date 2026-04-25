/* layout.js */

// Handle font loading to prevent layout shift
function initFontLoading() {
    // Fallback timeout
    setTimeout(() => {
        document.documentElement.classList.add('fonts-loaded');
    }, 500);

    // Modern browsers
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            document.documentElement.classList.add('fonts-loaded');
        });
    } else {
        // Older browsers
        document.documentElement.classList.add('fonts-loaded');
    }
}


// Fade-in on page navigation
window.addEventListener("pageshow", () => {
    document.body.classList.add("page-loaded");
});

document.addEventListener("click", async (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;

    const url = link.getAttribute("href");

    if (
        url.startsWith("http") ||
        url.startsWith("#") ||
        link.target === "_blank"
    ) return;

    e.preventDefault();

    document.body.classList.remove("ready"); // fade out

    setTimeout(() => {
        window.location.href = url;
    }, 300);
});



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initFontLoading);
