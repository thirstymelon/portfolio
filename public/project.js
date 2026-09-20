(function () {
    function initProject() {
        // Copy Code Snippet Action with Animated Checkmark Feedback
        document.querySelectorAll('.code-copy-action').forEach(btn => {
            if (btn.__boundCopy) return;
            btn.__boundCopy = true;

            btn.addEventListener('click', async () => {
                const wrapper = btn.closest('.code-card-wrap');
                const codeBlock = wrapper ? wrapper.querySelector('pre code, code') : null;
                if (codeBlock) {
                    try {
                        await navigator.clipboard.writeText(codeBlock.innerText);
                        const labelSpan = btn.querySelector('span');
                        const iconEl = btn.querySelector('svg');
                        const origText = labelSpan ? labelSpan.textContent : 'Copy';
                        const origSvg = iconEl ? iconEl.innerHTML : '';

                        btn.classList.add('copied');
                        if (labelSpan) labelSpan.textContent = 'Copied! ✓';
                        if (iconEl) {
                            iconEl.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
                            iconEl.setAttribute('stroke', '#4ade80');
                        }

                        setTimeout(() => {
                            btn.classList.remove('copied');
                            if (labelSpan) labelSpan.textContent = origText;
                            if (iconEl) {
                                iconEl.innerHTML = origSvg;
                                iconEl.removeAttribute('stroke');
                            }
                        }, 2200);
                    } catch (err) {
                        console.error('Failed to copy code: ', err);
                    }
                }
            });
        });

        // Reading Progress Bar & TOC Progress Sync
        const pageProgressBar = document.getElementById('pageProgressBar');
        const tocProgressVal = document.getElementById('tocProgressVal');
        const tocProgressFill = document.getElementById('tocProgressFill');

        function updateReadingProgress() {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? Math.min(Math.max((window.scrollY / docHeight) * 100, 0), 100) : 0;
            const progressStr = `${progress.toFixed(0)}%`;
            document.documentElement.style.setProperty('--scroll-progress', `${progress.toFixed(2)}%`);
            if (tocProgressVal) tocProgressVal.textContent = progressStr;
            if (tocProgressFill) tocProgressFill.style.width = `${progress.toFixed(1)}%`;
        }

        // Navbar Hide on Scroll Down & Reveal on Scroll Up
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

        // Navbar / Hero Mouse Illumination
        function attachSpotlight(el) {
            if (!el || el.__spotlightAttached) return;
            el.__spotlightAttached = true;
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
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) return null;
            return document.getElementById(href.substring(1));
        }).filter(Boolean);

        function updateScrollspy() {
            const scrollPos = window.scrollY + 140;
            let activeIndex = -1;

            sections.forEach((sec, idx) => {
                if (sec && sec.offsetTop <= scrollPos) {
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
            if (link.__boundClick) return;
            link.__boundClick = true;
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                if (!href || !href.startsWith('#')) return;
                const targetEl = document.getElementById(href.substring(1));
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

        window.removeEventListener('scroll', window.__projectScrollHandler);
        window.__projectScrollHandler = onPageScroll;
        window.addEventListener('scroll', onPageScroll, { passive: true });

        updateScrollspy();
        updateReadingProgress();
    }

    initProject();
    document.addEventListener('astro:page-load', initProject);
})();

