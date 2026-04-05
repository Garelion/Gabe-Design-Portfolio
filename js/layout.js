// Handle font loading to prevent layout shift
function initFontLoading() {
    let timeout = setTimeout( () => {
        document.documentElement.classList.add('fonts-loaded');
    }, 500);


    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            document.documentElement.classList.add('fonts-loaded');
        });
    } else {
        // Fallback for browsers without Font Loading API
        document.documentElement.classList.add('fonts-loaded');
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initSharedComponents();
    initFontLoading();
});