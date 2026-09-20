/* Shared light/dark theme switching + browser chrome color.
   The matching pre-paint script lives in templates/partials/theme_init.html.

   Both attributes are always written explicitly, so neither stylesheet depends on the
   *absence* of an attribute to mean something:
       light -> data-theme="light" + class "light-theme"   (project.scss overrides on these)
       dark  -> data-theme="dark"                          (style.scss overrides on this) */
(function () {
    const root = document.documentElement;
    const STORAGE_KEY = 'bento-theme';

    function current() {
        return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    /* Mirror the live --bg-outer token into <meta name="theme-color"> so the browser chrome
       follows the theme. Reading the token (rather than hard-coding a light/dark pair) is
       what keeps this correct on both stylesheets, which use different backgrounds. */
    function syncChromeColor() {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        const bg = getComputedStyle(root).getPropertyValue('--bg-outer').trim();
        if (bg) meta.setAttribute('content', bg);
    }

    function apply(theme) {
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            root.classList.add('light-theme');
        } else {
            root.setAttribute('data-theme', 'dark');
            root.classList.remove('light-theme');
        }
        syncChromeColor();
    }

    // Re-assert what the head script already applied and fix up the chrome color.
    apply(current());

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const next = current() === 'light' ? 'dark' : 'light';
            apply(next);
            localStorage.setItem(STORAGE_KEY, next);
        });
    }
})();
