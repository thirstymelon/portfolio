/* High Performance Custom Cursor: Raycasted Point Light Source + Liquid Mercury Magnetic Ring
   Zero-Reflow / Zero Layout-Thrashing Architecture.
   Used site-wide across landing, project deep dives, and 404 pages. */
(function () {
    if (window.__customCursorInitialized) return;
    window.__customCursorInitialized = true;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    function getCursorRing() {
        return document.getElementById('cursorRing');
    }

    // ── Spotlight Target Surfaces Cache ──
    const SPOTLIGHT_SELECTOR = [
        '.hero-box',
        '.poster-box',
        '.card-skills',
        '.card-work',
        '.card-connect',
        '.error-box',
        '.bento-nav',
        '.project-hero',
        '.feature-card',
        '.spec-card',
        '.diagram-box',
        '.code-card-wrap',
        '.table-card-wrap',
        '.project-toc-sidebar'
    ].join(', ');

    let cachedSpotlightCards = [];

    function updateSpotlightCache() {
        const els = document.querySelectorAll(SPOTLIGHT_SELECTOR);
        cachedSpotlightCards = [];
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el.offsetParent !== null) {
                cachedSpotlightCards.push({ el, rect: el.getBoundingClientRect() });
            }
        }
    }

    // ── Magnetic Target Candidates Cache ──
    const SNAP_SELECTOR = [
        '.theme-toggle-btn',
        '.circle-btn',
        '.pill-btn',
        'a.pill-btn',
        'button.pill-btn',
        '.skills-btn',
        '.work-btn',
        '.nav-back-btn',
        '.nav-tab',
        '.btn-pill-action',
        '.code-copy-action',
        '.btn-primary',
        '.btn-secondary',
        '.footer-back-link',
        '.toc-link'
    ].join(', ');

    const SNAP_RANGE = 22;

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isVisible = false;
    let snappedEl = null;
    let currentSnappedElement = null;
    let lastTime = performance.now();
    let wasSnapped = false;

    let cachedCandidates = [];

    function updateCandidateCache() {
        const els = document.querySelectorAll(SNAP_SELECTOR);
        cachedCandidates = [];
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el.offsetParent !== null && !el.closest('[data-no-magnetic]')) {
                cachedCandidates.push({ el, rect: el.getBoundingClientRect() });
            }
        }
    }

    function refreshAllCaches() {
        updateSpotlightCache();
        updateCandidateCache();
    }

    refreshAllCaches();

    function resetCursorSnap() {
        if (snappedEl) {
            snappedEl.classList.remove('is-hovered');
            window.dispatchEvent(new CustomEvent('bento:magnetic-leave', { detail: { el: snappedEl } }));
            snappedEl = null;
        }
        currentSnappedElement = null;
        wasSnapped = false;
        const ring = getCursorRing();
        if (ring) {
            ring.classList.remove('is-snapped', 'snap-toc');
            ring.style.removeProperty('--ring-w');
            ring.style.removeProperty('--ring-h');
            ring.style.removeProperty('--ring-r');
        }
    }

    let scrollRaf = false;
    window.addEventListener('scroll', () => {
        if (!scrollRaf) {
            scrollRaf = true;
            requestAnimationFrame(() => {
                refreshAllCaches();
                scrollRaf = false;
            });
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        refreshAllCaches();
    }, { passive: true });

    window.addEventListener('blur', () => {
        resetCursorSnap();
        isVisible = false;
        const ring = getCursorRing();
        if (ring) ring.classList.remove('visible');
    });

    window.addEventListener('focus', () => {
        refreshAllCaches();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resetCursorSnap();
            isVisible = false;
            const ring = getCursorRing();
            if (ring) ring.classList.remove('visible');
        } else {
            refreshAllCaches();
        }
    });

    document.addEventListener('astro:page-load', () => {
        resetCursorSnap();
        refreshAllCaches();
        const ring = getCursorRing();
        if (ring && isVisible) {
            ring.classList.add('visible');
        }
    });

    document.addEventListener('astro:after-swap', () => {
        resetCursorSnap();
        refreshAllCaches();
    });

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!isVisible) {
            isVisible = true;
            ringX = mouseX;
            ringY = mouseY;
        }
        const ring = getCursorRing();
        if (ring && !ring.classList.contains('visible')) {
            ring.classList.add('visible');
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        isVisible = false;
        resetCursorSnap();
        const ring = getCursorRing();
        if (ring) ring.classList.remove('visible');
        for (let i = 0; i < cachedSpotlightCards.length; i++) {
            cachedSpotlightCards[i].el.style.setProperty('--mouse-x', '-999px');
            cachedSpotlightCards[i].el.style.setProperty('--mouse-y', '-999px');
        }
    });

    function getNearestMagneticElement(x, y) {
        const isSkillsPopActive = document.body.classList.contains('popover-skills-active');
        const isWorkPopActive = document.body.classList.contains('popover-work-active');

        // 1. Direct hit-test first (single O(1) check)
        const hit = document.elementFromPoint(x, y);
        if (hit) {
            const insideSkillsPop = hit.closest('.skills-popover-wrap, .skill-popover-card');
            const insideWorkPop = hit.closest('.work-popover-wrap, .project-popover-card');

            if (isSkillsPopActive && !insideSkillsPop) return null;
            if (isWorkPopActive && !insideWorkPop) return null;

            const directTarget = hit.closest(SNAP_SELECTOR);
            if (directTarget && !directTarget.closest('[data-no-magnetic]')) {
                if (isSkillsPopActive && !directTarget.closest('.skills-popover-wrap')) return null;
                if (isWorkPopActive && !directTarget.closest('.work-popover-wrap')) return null;

                return { el: directTarget, rect: directTarget.getBoundingClientRect() };
            }

            if (insideSkillsPop || insideWorkPop) {
                return null;
            }
        }

        if (isSkillsPopActive || isWorkPopActive) {
            return null;
        }

        // Hysteresis: If currently snapped, remain attached if mouse is still in range of current element
        if (currentSnappedElement && document.body.contains(currentSnappedElement)) {
            const rect = currentSnappedElement.getBoundingClientRect();
            const nearX = Math.max(rect.left, Math.min(x, rect.right));
            const nearY = Math.max(rect.top, Math.min(y, rect.bottom));
            const dist = Math.hypot(x - nearX, y - nearY);
            if (dist <= SNAP_RANGE + 4) {
                return { el: currentSnappedElement, rect };
            }
        }

        // 2. Proximity check from cached on-screen candidate rects
        let closestEl = null, closestRect = null, closestDist = Infinity;
        for (let i = 0; i < cachedCandidates.length; i++) {
            const { el, rect } = cachedCandidates[i];
            if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;

            const nearX = Math.max(rect.left, Math.min(x, rect.right));
            const nearY = Math.max(rect.top, Math.min(y, rect.bottom));
            const dist = Math.hypot(x - nearX, y - nearY);

            if (dist < closestDist) {
                closestDist = dist;
                closestEl = el;
                closestRect = rect;
            }
        }

        return closestDist <= SNAP_RANGE ? { el: closestEl, rect: closestRect } : null;
    }

    const GMAIL_COMPOSE_URL = 'https://mail.google.com/mail/?view=cm&fs=1&to=lokesh.panditi.29@gmail.com';

    // Global capture listener to defeat Cloudflare Email-Protection edge rewrites on email links
    window.addEventListener('click', function(e) {
        const target = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!target) return;
        const href = target.getAttribute('href') || '';
        if (href.startsWith('mailto:') || href.includes('email-protection') || href.includes('mail.google.com') || target.hasAttribute('data-email')) {
            e.preventDefault();
            e.stopPropagation();
            window.open(GMAIL_COMPOSE_URL, '_blank', 'noopener,noreferrer');
            return;
        }
    }, true);

    window.addEventListener('click', e => {
        // If clicking directly on an interactive element or inside one, let native behavior proceed
        const directInteractive = e.target.closest('a, button, input, textarea, select');
        if (directInteractive) return;

        if (!currentSnappedElement || !document.body.contains(currentSnappedElement)) return;
        if (currentSnappedElement === e.target || currentSnappedElement.contains(e.target)) return;

        const rect = currentSnappedElement.getBoundingClientRect();
        const nearX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const nearY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
        if (Math.hypot(e.clientX - nearX, e.clientY - nearY) > SNAP_RANGE + 6) return;

        // Snapped element is an Anchor (<a>)
        const anchor = currentSnappedElement.closest('a') || (currentSnappedElement.tagName === 'A' ? currentSnappedElement : null);
        if (anchor) {
            const href = anchor.getAttribute('href') || '';

            // 1. Mailto Link / Gmail Link / Cloudflare Protected Link
            if (href.startsWith('mailto:') || href.includes('email-protection') || href.includes('mail.google.com') || anchor.hasAttribute('data-email')) {
                window.open(GMAIL_COMPOSE_URL, '_blank', 'noopener,noreferrer');
                return;
            }

            // 2. External / Target _blank / PDF Link
            const target = anchor.getAttribute('target');
            if (target === '_blank' || href.startsWith('http://') || href.startsWith('https://') || href.endsWith('.pdf')) {
                window.open(href, '_blank', 'noopener,noreferrer');
                return;
            }

            // 4. Internal / Hash / Same-origin Navigation
            window.location.href = href;
            return;
        }

        // Snapped element is a Button (<button>)
        const btn = currentSnappedElement.closest('button') || (currentSnappedElement.tagName === 'BUTTON' ? currentSnappedElement : null);
        if (btn) {
            btn.click();
        }
    });

    function renderCursor(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05) || 0;
        lastTime = now;
        const easeSnap = 1 - Math.exp(-32 * dt);
        const easeFree = 1 - Math.exp(-34 * dt);

        // ── Smooth Point Light Spotlight Restricted to Actively Hovered Surface ──
        if (isVisible) {
            for (let i = 0; i < cachedSpotlightCards.length; i++) {
                const { el, rect } = cachedSpotlightCards[i];
                const relX = mouseX - rect.left;
                const relY = mouseY - rect.top;

                // Only activate coordinates if the cursor is strictly inside the bounds of this card
                if (relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height) {
                    el.style.setProperty('--mouse-x', `${relX.toFixed(1)}px`);
                    el.style.setProperty('--mouse-y', `${relY.toFixed(1)}px`);
                } else if (el.style.getPropertyValue('--mouse-x') !== '-999px') {
                    el.style.setProperty('--mouse-x', '-999px');
                    el.style.setProperty('--mouse-y', '-999px');
                }
            }
        }

        const ring = getCursorRing();
        if (!ring) {
            requestAnimationFrame(renderCursor);
            return;
        }

        const magnetic = isVisible ? getNearestMagneticElement(mouseX, mouseY) : null;
        let transform;

        if (magnetic) {
            const { el, rect } = magnetic;
            currentSnappedElement = el;

            if (snappedEl !== el) {
                if (snappedEl) snappedEl.classList.remove('is-hovered');
                el.classList.add('is-hovered');
                snappedEl = el;

                const isRound = el.classList.contains('theme-toggle-btn') || el.classList.contains('circle-btn');
                const isToc = el.classList.contains('toc-link');
                const pad = isRound ? 10 : (isToc ? 6 : 12);
                const radius = isRound ? '50%' : (isToc ? '8px' : '50px');
                ring.style.setProperty('--ring-w', `${rect.width + pad}px`);
                ring.style.setProperty('--ring-h', `${rect.height + pad}px`);
                ring.style.setProperty('--ring-r', radius);

                if (isToc) {
                    ring.classList.add('snap-toc');
                } else {
                    ring.classList.remove('snap-toc');
                }

                window.dispatchEvent(new CustomEvent('bento:magnetic-enter', { detail: { el } }));
            }

            if (!wasSnapped) {
                ring.classList.add('is-snapped');
                wasSnapped = true;
            }

            ringX += (rect.left + rect.width / 2 - ringX) * easeSnap;
            ringY += (rect.top + rect.height / 2 - ringY) * easeSnap;

            transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%)`;
        } else {
            // UNCONDITIONALLY remove snap custom properties & classes when no magnetic target is active
            if (currentSnappedElement !== null || wasSnapped || ring.classList.contains('is-snapped') || ring.style.getPropertyValue('--ring-w')) {
                currentSnappedElement = null;
                ring.classList.remove('is-snapped', 'snap-toc');
                ring.style.removeProperty('--ring-w');
                ring.style.removeProperty('--ring-h');
                ring.style.removeProperty('--ring-r');
                wasSnapped = false;
            }

            if (snappedEl) {
                snappedEl.classList.remove('is-hovered');
                window.dispatchEvent(new CustomEvent('bento:magnetic-leave', { detail: { el: snappedEl } }));
                snappedEl = null;
            }

            const vx = mouseX - ringX;
            const vy = mouseY - ringY;
            const speed = Math.hypot(vx, vy);

            ringX += vx * easeFree;
            ringY += vy * easeFree;

            if (speed > 1.2) {
                const angle = Math.atan2(vy, vx);
                const stretch = Math.min(speed * 0.0028, 0.42);
                const scaleX = 1 + stretch;
                const scaleY = 1 - Math.min(speed * 0.0018, 0.22);
                transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            } else {
                transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%)`;
            }
        }

        ring.style.transform = transform;
        requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
})();
