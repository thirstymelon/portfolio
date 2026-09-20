(function () {
    // Theme switching (applied pre-paint by the head script) lives in theme.js, which every
    // page loads; nothing theme-related belongs here.

    // Copy Code Snippet Button
    document.querySelectorAll('.code-copy-action').forEach(btn => {
        btn.addEventListener('click', async () => {
            const wrapper = btn.closest('.code-card-wrap');
            const codeBlock = wrapper ? wrapper.querySelector('pre code, code') : null;
            if (codeBlock) {
                try {
                    await navigator.clipboard.writeText(codeBlock.innerText);
                    const labelSpan = btn.querySelector('span');
                    const origText = labelSpan ? labelSpan.textContent : 'Copy';
                    btn.classList.add('copied');
                    if (labelSpan) labelSpan.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        if (labelSpan) labelSpan.textContent = origText;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy code: ', err);
                }
            }
        });
    });

    // Reading Progress Bar
    const pageProgressBar = document.getElementById('pageProgressBar');
    function updateReadingProgress() {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(Math.max((window.scrollY / docHeight) * 100, 0), 100) : 0;
        document.documentElement.style.setProperty('--scroll-progress', `${progress.toFixed(2)}%`);
    }

    // Navbar Hide on Scroll Down & Reveal on Scroll Up (keeps top progress bar visible when navbar is hidden)
    const navWrap = document.querySelector('.bento-nav-wrap');
    let lastScrollY = window.scrollY;
    const SCROLL_THRESHOLD = 6;

    function handleNavScroll() {
        const currentScrollY = window.scrollY;
        if (currentScrollY < 60) {
            navWrap?.classList.remove('nav-hidden');
            pageProgressBar?.classList.remove('is-visible');
            lastScrollY = currentScrollY;
            return;
        }
        if (Math.abs(currentScrollY - lastScrollY) < SCROLL_THRESHOLD) return;
        if (currentScrollY > lastScrollY && currentScrollY > 90) {
            navWrap?.classList.add('nav-hidden');
            pageProgressBar?.classList.add('is-visible');
        } else {
            navWrap?.classList.remove('nav-hidden');
            pageProgressBar?.classList.remove('is-visible');
        }
        lastScrollY = currentScrollY;
    }

    // Navbar / Hero Mouse Illumination (spotlight + pattern mask share --mouse-x/--mouse-y).
    // Browsers fire mousemove faster than once per frame; several writes per frame would
    // trigger several masked-layer repaints. Coalesce into ONE CSS-var write per frame.
    function attachSpotlight(el) {
        if (!el) return;
        let rect = null;
        let px = 0, py = 0, queued = false;
        const flush = () => {
            queued = false;
            if (!rect) return;
            el.style.setProperty('--mouse-x', `${px - rect.left}px`);
            el.style.setProperty('--mouse-y', `${py - rect.top}px`);
        };
        el.addEventListener('mouseenter', () => { rect = el.getBoundingClientRect(); });
        el.addEventListener('mousemove', e => {
            if (!rect) rect = el.getBoundingClientRect();
            px = e.clientX;
            py = e.clientY;
            if (!queued) {
                queued = true;
                requestAnimationFrame(flush);
            }
        }, { passive: true });
        el.addEventListener('mouseleave', () => {
            rect = null;
            el.style.setProperty('--mouse-x', '-999px');
            el.style.setProperty('--mouse-y', '-999px');
        });
    }

    attachSpotlight(document.querySelector('.bento-nav'));
    attachSpotlight(document.querySelector('.project-hero'));

    // Table of Contents Active Scrollspy
    const tocLinks = document.querySelectorAll('.project-toc-sidebar .toc-link');
    const sections = Array.from(tocLinks).map(link => {
        const id = link.getAttribute('href').substring(1);
        return document.getElementById(id);
    }).filter(Boolean);

    function updateScrollspy() {
        const scrollPos = window.scrollY + 120;
        let activeIndex = -1;

        sections.forEach((sec, idx) => {
            if (sec.offsetTop <= scrollPos) {
                activeIndex = idx;
            }
        });

        tocLinks.forEach((link, idx) => {
            if (idx === activeIndex) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Smooth Scroll for TOC links
    tocLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const top = targetEl.getBoundingClientRect().top + window.pageYOffset - 90;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });

    function onPageScroll() {
        updateScrollspy();
        updateReadingProgress();
        handleNavScroll();
    }

    window.addEventListener('scroll', onPageScroll, { passive: true });
    updateScrollspy();
    updateReadingProgress();
})();

