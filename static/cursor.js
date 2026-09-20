/* High Performance Custom Cursor: Ambient Card Spotlight + Liquid Mercury Magnetic Ring
   Zero-Reflow / Zero Layout-Thrashing Architecture.
   Used by landing and 404 pages. */
(function () {
    // 1. Optimized Card Spotlight (RAF-batched, cached bounds on enter)
    const spotlightCards = document.querySelectorAll(
        '.hero-box, .poster-box, .card-skills, .card-work, .card-connect, .error-box'
    );
    spotlightCards.forEach(card => {
        let rect = null;
        let px = 0, py = 0, rafQueued = false;

        const updateSpotlight = () => {
            rafQueued = false;
            if (!rect) return;
            card.style.setProperty('--mouse-x', `${px - rect.left}px`);
            card.style.setProperty('--mouse-y', `${py - rect.top}px`);
        };

        card.addEventListener('mouseenter', () => {
            rect = card.getBoundingClientRect();
        }, { passive: true });

        card.addEventListener('mousemove', e => {
            if (!rect) rect = card.getBoundingClientRect();
            px = e.clientX;
            py = e.clientY;
            if (!rafQueued) {
                rafQueued = true;
                requestAnimationFrame(updateSpotlight);
            }
        }, { passive: true });

        card.addEventListener('mouseleave', () => {
            rect = null;
        }, { passive: true });
    });

    const cursorRing = document.getElementById('cursorRing');
    if (!cursorRing || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const SNAP_SELECTOR = '.theme-toggle-btn, .circle-btn, .pill-btn, .skills-btn, .work-btn';
    const SNAP_RANGE = 32;

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isVisible = false;
    let snappedEl = null;
    let currentSnappedElement = null;
    let lastTime = performance.now();
    let pointerDirty = true;

    // ── Cached Rect System (Eliminates getBoundingClientRect inside rAF loop) ──
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

    // Initial cache build & invalidate on scroll / resize / popover changes
    updateCandidateCache();

    let scrollRaf = false;
    window.addEventListener('scroll', () => {
        pointerDirty = true;
        if (!scrollRaf) {
            scrollRaf = true;
            requestAnimationFrame(() => {
                updateCandidateCache();
                scrollRaf = false;
            });
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        pointerDirty = true;
        updateCandidateCache();
    }, { passive: true });

    // Refresh candidate rects when popovers toggle
    const observer = new MutationObserver(() => {
        pointerDirty = true;
        updateCandidateCache();
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
    });

    function getNearestMagneticElement(x, y) {
        // 1. Direct hit-test first (O(1) layout-free check)
        const hit = document.elementFromPoint(x, y);
        if (hit) {
            const directTarget = hit.closest(SNAP_SELECTOR);
            if (directTarget && !directTarget.closest('[data-no-magnetic]')) {
                for (let i = 0; i < cachedCandidates.length; i++) {
                    if (cachedCandidates[i].el === directTarget) {
                        return cachedCandidates[i];
                    }
                }
                return { el: directTarget, rect: directTarget.getBoundingClientRect() };
            }
        }

        // 2. Proximity check from pre-cached rects
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

    // A click that lands inside the magnet's pull activates the snapped element
    window.addEventListener('click', e => {
        if (!currentSnappedElement || !document.body.contains(currentSnappedElement)) return;
        if (currentSnappedElement === e.target || currentSnappedElement.contains(e.target)) return;

        const rect = currentSnappedElement.getBoundingClientRect();
        const nearX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const nearY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
        if (Math.hypot(e.clientX - nearX, e.clientY - nearY) > SNAP_RANGE + 8) return;

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
        const ease = 1 - Math.exp(-33 * dt);

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

            ringX += (rect.left + rect.width / 2 - ringX) * ease;
            ringY += (rect.top + rect.height / 2 - ringY) * ease;

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

            ringX += vx * ease;
            ringY += vy * ease;

            // Compositor-only write: GPU transform, zero layout
            if (speed > 1.5) {
                const angle = Math.atan2(vy, vx);
                const stretch = Math.min(speed * 0.0028, 0.42);
                const scaleX = 1 + stretch;
                const scaleY = 1 - Math.min(speed * 0.0018, 0.22);
                transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            } else {
                transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            }
        }

        cursorRing.style.transform = transform;
        requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
})();
