/* High Performance Custom Cursor: Raycasted Point Light Source + Liquid Mercury Magnetic Ring
   Zero-Reflow / Zero Layout-Thrashing Architecture.
   Used site-wide across landing, project deep dives, and 404 pages. */
(function () {
    const cursorRing = document.getElementById('cursorRing');
    if (!cursorRing || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

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
        '.toc-link',
        '.code-copy-action',
        '.pagination-card',
        '.btn-primary',
        '.btn-secondary',
        '.footer-back-link'
    ].join(', ');

    const SNAP_RANGE = 26;

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isVisible = false;
    let snappedEl = null;
    let currentSnappedElement = null;
    let lastTime = performance.now();
    let pointerDirty = true;

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

    let scrollRaf = false;
    window.addEventListener('scroll', () => {
        pointerDirty = true;
        if (!scrollRaf) {
            scrollRaf = true;
            requestAnimationFrame(() => {
                refreshAllCaches();
                scrollRaf = false;
            });
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        pointerDirty = true;
        refreshAllCaches();
    }, { passive: true });

    const observer = new MutationObserver(() => {
        pointerDirty = true;
        refreshAllCaches();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        pointerDirty = true;
        if (!isVisible) {
            isVisible = true;
            ringX = mouseX;
            ringY = mouseY;
            cursorRing.classList.add('visible');
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        isVisible = false;
        snappedEl = null;
        currentSnappedElement = null;
        cursorRing.classList.remove('visible', 'is-snapped');
        document.querySelectorAll('.is-hovered').forEach(el => el.classList.remove('is-hovered'));
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

    window.addEventListener('click', e => {
        if (!currentSnappedElement || !document.body.contains(currentSnappedElement)) return;
        if (currentSnappedElement === e.target || currentSnappedElement.contains(e.target)) return;

        const rect = currentSnappedElement.getBoundingClientRect();
        const nearX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const nearY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
        if (Math.hypot(e.clientX - nearX, e.clientY - nearY) > SNAP_RANGE + 6) return;

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
    });

    let wasSnapped = false;

    function renderCursor(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05) || 0;
        lastTime = now;
        const easeSnap = 1 - Math.exp(-38 * dt);
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

        let magnetic = null;
        if (pointerDirty) {
            pointerDirty = false;
            magnetic = getNearestMagneticElement(mouseX, mouseY);
        } else if (currentSnappedElement && document.body.contains(currentSnappedElement)) {
            magnetic = { el: currentSnappedElement, rect: currentSnappedElement.getBoundingClientRect() };
        }

        let transform;

        if (magnetic) {
            const { el, rect } = magnetic;
            currentSnappedElement = el;

            if (snappedEl !== el) {
                if (snappedEl) snappedEl.classList.remove('is-hovered');
                el.classList.add('is-hovered');
                snappedEl = el;

                const isRound = el.classList.contains('theme-toggle-btn') || el.classList.contains('circle-btn');
                const pad = isRound ? 10 : 12;
                cursorRing.style.setProperty('--ring-w', `${rect.width + pad}px`);
                cursorRing.style.setProperty('--ring-h', `${rect.height + pad}px`);
                cursorRing.style.setProperty('--ring-r', isRound ? '50%' : '50px');

                window.dispatchEvent(new CustomEvent('bento:magnetic-enter', { detail: { el } }));
            }

            if (!wasSnapped) {
                cursorRing.classList.add('is-snapped');
                wasSnapped = true;
            }

            ringX += (rect.left + rect.width / 2 - ringX) * easeSnap;
            ringY += (rect.top + rect.height / 2 - ringY) * easeSnap;

            transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
        } else {
            if (currentSnappedElement !== null) {
                currentSnappedElement = null;
                cursorRing.style.removeProperty('--ring-w');
                cursorRing.style.removeProperty('--ring-h');
                cursorRing.style.removeProperty('--ring-r');
            }

            if (snappedEl) {
                snappedEl.classList.remove('is-hovered');
                window.dispatchEvent(new CustomEvent('bento:magnetic-leave', { detail: { el: snappedEl } }));
                snappedEl = null;
            }

            if (wasSnapped) {
                cursorRing.classList.remove('is-snapped');
                wasSnapped = false;
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
                transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            } else {
                transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            }
        }

        // Remove color inversion only on index card and pagination cards
        const isNoInvertZone = (magnetic && magnetic.el && magnetic.el.closest('.project-toc-sidebar, .project-pagination-section, .pagination-card, .toc-link')) ||
            (document.elementFromPoint(mouseX, mouseY)?.closest('.project-toc-sidebar, .project-pagination-section, .pagination-card, .toc-link'));

        if (isNoInvertZone) {
            cursorRing.classList.add('no-invert');
        } else {
            cursorRing.classList.remove('no-invert');
        }

        cursorRing.style.transform = transform;
        requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
})();
