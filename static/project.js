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

    // HIGH PERFORMANCE 120FPS LIQUID MERCURY CURSOR (Zero-Reflow)
    const cursorRing = document.getElementById('cursorRing');
    if (cursorRing && window.matchMedia('(pointer: fine)').matches) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;
        let isVisible = false;
        let currentSnappedElement = null;
        let lastSnappedEl = null;
        const MAGNETIC_SELECTOR = '.nav-back-btn, .nav-tab, .circle-btn, .btn-pill-action, .toc-link';

        // ── Rect Caching System ──
        // Instead of calling getBoundingClientRect() 60-120x/sec inside rAF,
        // we cache rects on mouseenter/scroll/resize and read from memory.
        let cachedNavRects = null;   // [{el, rect}, ...]
        let cachedTocRects = null;
        let cachedCtaRects = null;
        let mouseInNav = false;
        let mouseInToc = false;
        let mouseInCta = false;
        // Full-DOM hit-testing (elementFromPoint) is expensive; only run it when the
        // pointer or the layout actually changed, never on idle easing frames.
        let pointerDirty = true;

        function cacheNavRects() {
            const btns = document.querySelectorAll('.bento-nav .nav-back-btn, .bento-nav .nav-tab, .bento-nav .circle-btn');
            cachedNavRects = [];
            for (let i = 0; i < btns.length; i++) {
                cachedNavRects.push({ el: btns[i], rect: btns[i].getBoundingClientRect() });
            }
        }
        function cacheTocRects() {
            const sidebar = document.querySelector('.project-toc-sidebar');
            if (sidebar && sidebar.offsetParent !== null) {
                const links = sidebar.querySelectorAll('.toc-link');
                cachedTocRects = [];
                for (let i = 0; i < links.length; i++) {
                    cachedTocRects.push({ el: links[i], rect: links[i].getBoundingClientRect() });
                }
            } else {
                cachedTocRects = null;
            }
        }
        function cacheCtaRects() {
            const group = document.querySelector('.project-hero .project-cta-group');
            if (group && group.offsetParent !== null) {
                const btns = group.querySelectorAll('.btn-pill-action');
                cachedCtaRects = [];
                for (let i = 0; i < btns.length; i++) {
                    cachedCtaRects.push({ el: btns[i], rect: btns[i].getBoundingClientRect() });
                }
            } else {
                cachedCtaRects = null;
            }
        }

        // Wire up mouseenter/mouseleave to cache rects only when needed
        const navEl = document.querySelector('.bento-nav');
        if (navEl) {
            navEl.addEventListener('mouseenter', () => { mouseInNav = true; cacheNavRects(); });
            navEl.addEventListener('mouseleave', () => { mouseInNav = false; cachedNavRects = null; });
        }
        const tocEl = document.querySelector('.project-toc-sidebar');
        if (tocEl) {
            tocEl.addEventListener('mouseenter', () => { mouseInToc = true; cacheTocRects(); });
            tocEl.addEventListener('mouseleave', () => { mouseInToc = false; cachedTocRects = null; });
        }
        const ctaEl = document.querySelector('.project-hero .project-cta-group');
        if (ctaEl) {
            ctaEl.addEventListener('mouseenter', () => { mouseInCta = true; cacheCtaRects(); });
            ctaEl.addEventListener('mouseleave', () => { mouseInCta = false; cachedCtaRects = null; });
        }

        // Invalidate caches on scroll/resize (only re-cache if mouse is inside the zone)
        let scrollTick = false;
        window.addEventListener('scroll', () => {
            pointerDirty = true;
            if (!scrollTick) {
                scrollTick = true;
                requestAnimationFrame(() => {
                    if (mouseInNav) cacheNavRects();
                    if (mouseInToc) cacheTocRects();
                    if (mouseInCta) cacheCtaRects();
                    scrollTick = false;
                });
            }
        }, { passive: true });
        window.addEventListener('resize', () => {
            pointerDirty = true;
            if (mouseInNav) cacheNavRects();
            if (mouseInToc) cacheTocRects();
            if (mouseInCta) cacheCtaRects();
        }, { passive: true });

        document.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            pointerDirty = true;
            if (!isVisible) {
                isVisible = true;
                cursorRing.classList.add('visible');
                ringX = mouseX;
                ringY = mouseY;
            }
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            isVisible = false;
            currentSnappedElement = null;
            if (lastSnappedEl) {
                lastSnappedEl.classList.remove('is-hovered');
                lastSnappedEl = null;
            }
            cursorRing.classList.remove('visible');
        });

        function getNearestMagneticElement(x, y) {
            // 1. O(1) direct hit test — no layout cost
            const hit = document.elementFromPoint(x, y);
            if (hit) {
                const directTarget = hit.closest(MAGNETIC_SELECTOR);
                if (directTarget && directTarget.offsetParent !== null) {
                    return { el: directTarget, rect: directTarget.getBoundingClientRect() };
                }
            }
            // 2. Proximity from cached rects (ZERO getBoundingClientRect calls)
            if (cachedNavRects) {
                for (let i = 0; i < cachedNavRects.length; i++) {
                    const { el, rect } = cachedNavRects[i];
                    if (x >= rect.left - 16 && x <= rect.right + 16 && y >= rect.top - 16 && y <= rect.bottom + 16) {
                        return { el, rect };
                    }
                }
            }
            if (cachedTocRects) {
                for (let i = 0; i < cachedTocRects.length; i++) {
                    const { el, rect } = cachedTocRects[i];
                    if (x >= rect.left - 14 && x <= rect.right + 14 && y >= rect.top - 6 && y <= rect.bottom + 6) {
                        return { el, rect };
                    }
                }
            }
            if (cachedCtaRects) {
                for (let i = 0; i < cachedCtaRects.length; i++) {
                    const { el, rect } = cachedCtaRects[i];
                    if (x >= rect.left - 16 && x <= rect.right + 16 && y >= rect.top - 10 && y <= rect.bottom + 10) {
                        return { el, rect };
                    }
                }
            }
            return null;
        }

        window.addEventListener('click', e => {
            if (currentSnappedElement && document.body.contains(currentSnappedElement)) {
                if (currentSnappedElement === e.target || currentSnappedElement.contains(e.target)) {
                    return;
                }
                const rect = currentSnappedElement.getBoundingClientRect();
                const nearX = Math.max(rect.left, Math.min(e.clientX, rect.right));
                const nearY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
                const dist = Math.hypot(e.clientX - nearX, e.clientY - nearY);

                if (dist <= 24) {
                    e.preventDefault();
                    if (currentSnappedElement.tagName.toLowerCase() === 'a' && currentSnappedElement.href) {
                        if (currentSnappedElement.target === '_blank') {
                            window.open(currentSnappedElement.href, '_blank', 'noopener,noreferrer');
                        } else {
                            window.location.href = currentSnappedElement.href;
                        }
                    } else {
                        currentSnappedElement.click();
                    }
                }
            }
        });

    let wasSnapped = false;
    let lastDrawTime = performance.now();

    function renderCursor(now) {
        // Frame-rate independent smoothing: the ring used to ease by a fixed factor per
        // frame, so it converged twice as fast at 120Hz as at 60Hz (visible as jitter /
        // inconsistent feel). K = -60*ln(1-factor) reproduces the old 60Hz feel at any rate.
        const dt = Math.min((now - lastDrawTime) / 1000, 0.05) || 0;
        lastDrawTime = now;
        const easeSnap = 1 - Math.exp(-36 * dt);   // was 0.45 per frame @60Hz
        const easeFree = 1 - Math.exp(-33 * dt);   // was 0.42 per frame @60Hz

        let magnetic = null;
        if (pointerDirty) {
            pointerDirty = false;
            magnetic = getNearestMagneticElement(mouseX, mouseY);
        } else if (currentSnappedElement && document.body.contains(currentSnappedElement)) {
            // Pointer is stationary: keep the current snap, skip the full-DOM hit-test.
            magnetic = { el: currentSnappedElement, rect: currentSnappedElement.getBoundingClientRect() };
        }

            if (magnetic) {
                const { el, rect } = magnetic;
                currentSnappedElement = el;

                if (lastSnappedEl !== el) {
                    if (lastSnappedEl) lastSnappedEl.classList.remove('is-hovered');
                    el.classList.add('is-hovered');
                    lastSnappedEl = el;
                }

                // Only touch opacity/class on state transition (not every frame)
                if (!wasSnapped) {
                    cursorRing.style.opacity = '0';
                    cursorRing.classList.add('is-snapped');
                    wasSnapped = true;
                }

                const targetCenterX = rect.left + rect.width / 2;
                const targetCenterY = rect.top + rect.height / 2;

                ringX += (targetCenterX - ringX) * easeSnap;
                ringY += (targetCenterY - ringY) * easeSnap;

                // ONLY write: transform (compositor-only, zero layout cost)
                cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            } else {
                currentSnappedElement = null;

                if (lastSnappedEl) {
                    lastSnappedEl.classList.remove('is-hovered');
                    lastSnappedEl = null;
                }

                // Only touch opacity/class on state transition
                if (wasSnapped) {
                    cursorRing.style.opacity = '1';
                    cursorRing.classList.remove('is-snapped');
                    wasSnapped = false;
                }

                const vx = mouseX - ringX;
                const vy = mouseY - ringY;
                const speed = Math.hypot(vx, vy);

                ringX += vx * easeFree;
                ringY += vy * easeFree;

                // ONLY write: transform (compositor-only, zero layout cost)
                // Width/height/borderRadius NEVER change — set once in CSS, never from JS
                if (speed > 1.2) {
                    const angle = Math.atan2(vy, vx);
                    const stretch = Math.min(speed * 0.003, 0.4);
                    const scaleX = 1 + stretch;
                    const scaleY = 1 - Math.min(speed * 0.002, 0.2);
                    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
                } else {
                    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
                }
            }

            requestAnimationFrame(renderCursor);
        }
        requestAnimationFrame(renderCursor);
    }
})();
